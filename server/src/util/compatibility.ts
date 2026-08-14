import { db } from '../prisma/db.ts'

export type Verdict = 'COMPATIBLE' | 'INCOMPATIBLE' | 'OPTIONAL_COMPATIBLE'

export interface CompatibilityHit {
  verdict: Verdict
  restrictionId: number
  path: number[]
  /** Whether the food item is only reached when optional relations are included. */
  optional: boolean
}

export interface CompatibilityResult {
  verdict: Verdict
  hits: CompatibilityHit[]
}

export type GroupCompatibilityResult = {
  personId: number
  result: CompatibilityResult
}[]

interface Edge {
  toId: number
  optional: boolean
}

/** One path from a root food item down to some node it (transitively) contains/is-a. */
interface ReachedPath {
  nodeId: number
  path: number[]
  /** Whether this path crosses at least one optional relation, e.g. gräddfil on tacos. */
  hasOptionalEdge: boolean
}

/**
 * Recursively walks the CONTAINS/IS_A graph from a root food item, collecting
 * every path to every node it reaches (not just forbidden ones), so the
 * traversal can be cached and reused across every person being checked.
 */
function findReachablePaths(rootId: number, adjacency: Map<number, Edge[]>): ReachedPath[] {
  const reached: ReachedPath[] = []
  const path: number[] = []
  const ancestors = new Set<number>()

  function visit(nodeId: number, hasOptionalEdge: boolean) {
    if (ancestors.has(nodeId)) return // guard against cycles
    path.push(nodeId)
    ancestors.add(nodeId)

    reached.push({ nodeId, path: [...path], hasOptionalEdge })

    for (const edge of adjacency.get(nodeId) ?? []) {
      visit(edge.toId, hasOptionalEdge || edge.optional)
    }

    path.pop()
    ancestors.delete(nodeId)
  }

  visit(rootId, false)
  return reached
}

function combineVerdicts(hits: CompatibilityHit[]): Verdict {
  if (hits.some((hit) => hit.verdict === 'INCOMPATIBLE')) return 'INCOMPATIBLE'
  if (hits.some((hit) => hit.verdict === 'OPTIONAL_COMPATIBLE')) return 'OPTIONAL_COMPATIBLE'
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
    db.foodItemRelation.findMany(),
  ])

  const adjacency = new Map<number, Edge[]>()
  for (const relation of relations) {
    const edges = adjacency.get(relation.fromId) ?? []
    edges.push({ toId: relation.toId, optional: relation.optional })
    adjacency.set(relation.fromId, edges)
  }

  // Reachable paths only depend on the food graph, so compute them once per
  // root food item and reuse across every person being checked.
  const reachablePathsByFoodItemId = new Map<number, ReachedPath[]>()
  for (const foodItemId of foodItemIds) {
    if (!reachablePathsByFoodItemId.has(foodItemId)) {
      reachablePathsByFoodItemId.set(foodItemId, findReachablePaths(foodItemId, adjacency))
    }
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

    const hits: CompatibilityHit[] = foodItemIds.flatMap((foodItemId) =>
      (reachablePathsByFoodItemId.get(foodItemId) ?? []).flatMap((reached) =>
        (restrictionIdsByFoodItemId.get(reached.nodeId) ?? []).map((restrictionId) => ({
          verdict: reached.hasOptionalEdge ? 'OPTIONAL_COMPATIBLE' : 'INCOMPATIBLE',
          restrictionId,
          path: reached.path,
          optional: reached.hasOptionalEdge,
        })),
      ),
    )

    return {
      personId: person.id,
      result: {
        verdict: combineVerdicts(hits),
        hits,
      },
    }
  })
}
