import { db } from '../prisma/db.ts'

export type Verdict =
  | 'COMPATIBLE'
  | 'INCOMPATIBLE'
  | 'OPTIONAL_COMPATIBLE'
  /** Only compatible when one or more relations are swapped to an alternative. */
  | 'ALTERNATIVE_COMPATIBLE'

/** Describes the alternative swap a hit was reached through. */
export interface ViaAlternative {
  /** The relation whose original child was replaced by an alternative. */
  relationId: number
  /** The relation's original child food item that was replaced. */
  replacedFoodItemId: number
  /** The alternative food item that was substituted in (and still did not work). */
  alternativeFoodItemId: number
}

export interface CompatibilityHit {
  verdict: 'INCOMPATIBLE' | 'OPTIONAL_COMPATIBLE'
  restrictionId: number
  path: number[]
  /** Whether the food item is only reached when optional relations are included. */
  optional: boolean
  /**
   * Set when this hit is only reached after swapping in an alternative food item
   * that then turned out to be incompatible as well. Absent for main-path hits.
   */
  viaAlternative?: ViaAlternative
}

/**
 * A relation whose main food item is incompatible, but where swapping in an
 * alternative food item resolves it. Reported alongside (and independently of)
 * `hits` so the user can be told e.g. "cheese does not work, but vegan cheese does".
 */
export interface AlternativeResolution {
  /** The relation whose original child is incompatible but has a working alternative. */
  relationId: number
  /** Path from the root food item down to and including the incompatible original child. */
  path: number[]
  /** The relation's original child food item, which is incompatible. */
  originalFoodItemId: number
  /** The reason(s) the original child is incompatible. */
  originalHits: CompatibilityHit[]
  /** The alternative food item that is compatible and should be used instead. */
  alternativeFoodItemId: number
}

export interface CompatibilityResult {
  verdict: Verdict
  hits: CompatibilityHit[]
  alternativeResolutions: AlternativeResolution[]
}

export type GroupCompatibilityResult = {
  personId: number
  result: CompatibilityResult
}[]

interface Edge {
  toId: number
  relationId: number
  optional: boolean
  /** Replacement food item ids that may be substituted for `toId` on this relation. */
  alternativeFoodItemIds: number[]
}

interface SubtreeResult {
  /** Hits that nothing (neither the main path nor any alternative) could resolve. */
  hits: CompatibilityHit[]
  /** Decision points below this node that an alternative swap resolves. */
  resolutions: AlternativeResolution[]
}

function emptySubtreeResult(): SubtreeResult {
  return { hits: [], resolutions: [] }
}

/**
 * Walks the CONTAINS/IS_A graph from a root food item for a single person,
 * collecting forbidden nodes it reaches.
 *
 * The main path is always checked first. Whenever a relation that has
 * alternatives has a hit somewhere below it, every alternative is tried in turn:
 * if some alternative is compatible it is reported as an `AlternativeResolution`
 * and the main hits are considered resolved; if none work, the main hits and
 * every alternative's hits are all surfaced.
 *
 * This has to run per person (unlike a plain reachability walk) because whether
 * alternatives are explored depends on that person's restrictions.
 */
function checkFoodItem(
  rootId: number,
  adjacency: Map<number, Edge[]>,
  restrictionIdsByFoodItemId: Map<number, number[]>,
): SubtreeResult {
  const ancestors = new Set<number>()

  function visit(nodeId: number, path: number[], hasOptionalEdge: boolean): SubtreeResult {
    if (ancestors.has(nodeId)) return emptySubtreeResult() // guard against cycles
    ancestors.add(nodeId)

    const nodePath = [...path, nodeId]
    const result = emptySubtreeResult()

    for (const restrictionId of restrictionIdsByFoodItemId.get(nodeId) ?? []) {
      result.hits.push({
        verdict: hasOptionalEdge ? 'OPTIONAL_COMPATIBLE' : 'INCOMPATIBLE',
        restrictionId,
        path: nodePath,
        optional: hasOptionalEdge,
      })
    }

    for (const edge of adjacency.get(nodeId) ?? []) {
      const childOptional = hasOptionalEdge || edge.optional
      const mainResult = visit(edge.toId, nodePath, childOptional)

      if (edge.alternativeFoodItemIds.length === 0 || mainResult.hits.length === 0) {
        // No alternatives to consider, or the main path is already fine.
        result.hits.push(...mainResult.hits)
        result.resolutions.push(...mainResult.resolutions)
        continue
      }

      // The main child is incompatible and the relation has alternatives: try them.
      const altResults = edge.alternativeFoodItemIds.map((alternativeFoodItemId) => ({
        alternativeFoodItemId,
        subtree: visit(alternativeFoodItemId, nodePath, childOptional),
      }))
      const working = altResults.find(({ subtree }) => subtree.hits.length === 0)

      if (working) {
        result.resolutions.push({
          relationId: edge.relationId,
          path: [...nodePath, edge.toId],
          originalFoodItemId: edge.toId,
          originalHits: mainResult.hits,
          alternativeFoodItemId: working.alternativeFoodItemId,
        })
        // The chosen alternative may itself rely on nested alternative swaps.
        result.resolutions.push(...working.subtree.resolutions)
        continue
      }

      // Neither the main child nor any alternative works: surface them all.
      result.hits.push(...mainResult.hits)
      for (const { alternativeFoodItemId, subtree } of altResults) {
        for (const hit of subtree.hits) {
          result.hits.push({
            ...hit,
            viaAlternative: hit.viaAlternative ?? {
              relationId: edge.relationId,
              replacedFoodItemId: edge.toId,
              alternativeFoodItemId,
            },
          })
        }
        result.resolutions.push(...subtree.resolutions)
      }
    }

    ancestors.delete(nodeId)
    return result
  }

  return visit(rootId, [], false)
}

function combineVerdict(result: SubtreeResult): Verdict {
  if (result.hits.some((hit) => hit.verdict === 'INCOMPATIBLE')) return 'INCOMPATIBLE'
  if (result.hits.some((hit) => hit.verdict === 'OPTIONAL_COMPATIBLE')) return 'OPTIONAL_COMPATIBLE'
  if (result.resolutions.length > 0) return 'ALTERNATIVE_COMPATIBLE'
  return 'COMPATIBLE'
}

export async function checkCompatibility(
  personIds: number[],
  foodItemIds: number[],
): Promise<GroupCompatibilityResult> {
  const [people, relations] = await Promise.all([
    db.person.findMany({
      where: { id: { in: personIds } },
      include: { restrictions: { include: { restriction: { include: { foodItems: true } } } } },
    }),
    db.foodItemRelation.findMany({ include: { alternatives: true } }),
  ])

  // The food graph is person-independent, so build the adjacency once.
  const adjacency = new Map<number, Edge[]>()
  for (const relation of relations) {
    const edges = adjacency.get(relation.fromId) ?? []
    edges.push({
      toId: relation.toId,
      relationId: relation.id,
      optional: relation.optional,
      alternativeFoodItemIds: relation.alternatives.map((alt) => alt.replacementFoodItemId),
    })
    adjacency.set(relation.fromId, edges)
  }

  return people.map((person) => {
    // Which restriction(s) forbid a given food item, for this person.
    const restrictionIdsByFoodItemId = new Map<number, number[]>()
    for (const personRestriction of person.restrictions) {
      for (const foodItem of personRestriction.restriction.foodItems) {
        const restrictionIds = restrictionIdsByFoodItemId.get(foodItem.id) ?? []
        restrictionIds.push(personRestriction.restriction.id)
        restrictionIdsByFoodItemId.set(foodItem.id, restrictionIds)
      }
    }

    const hits: CompatibilityHit[] = []
    const alternativeResolutions: AlternativeResolution[] = []
    for (const foodItemId of foodItemIds) {
      const subtree = checkFoodItem(foodItemId, adjacency, restrictionIdsByFoodItemId)
      hits.push(...subtree.hits)
      alternativeResolutions.push(...subtree.resolutions)
    }

    return {
      personId: person.id,
      result: {
        verdict: combineVerdict({ hits, resolutions: alternativeResolutions }),
        hits,
        alternativeResolutions,
      },
    }
  })
}
