/**
 * Works out what a set of restrictions means for a food item.
 *
 * A restriction points at the food items that may not be eaten. A food item is
 * off limits when it is restricted itself, or when any of its children, or
 * their children, is. Someone allergic to legumes cannot eat a falafel wrap
 * because the wrap contains falafel, which contains chickpeas, which are a
 * legume.
 *
 * Relations that are marked optional break that chain: a wrap that *may* be
 * served with a yoghurt sauce is not certainly off limits for someone avoiding
 * dairy, so it is reported as `MAYBE` rather than `UNSAFE`.
 */

export interface Relation {
  fromId: number
  toId: number
  optional: boolean
}

export type Verdict =
  /** Nothing restricted was found. */
  | 'SAFE'
  /** Something restricted is always part of this food item. */
  | 'UNSAFE'
  /** Something restricted is only reached through an optional relation. */
  | 'MAYBE'

export interface RestrictionHit {
  /** The restricted food item that was reached. */
  foodItemId: number
  /** The food items walked through to reach it, starting at the food item asked about. */
  path: number[]
  /** Whether the food item is only reached when optional relations are included. */
  optional: boolean
}

export interface FoodItemVerdict {
  foodItemId: number
  verdict: Verdict
  hits: RestrictionHit[]
}

type Adjacency = Map<number, Relation[]>

function toAdjacency(relations: Relation[]): Adjacency {
  const adjacency: Adjacency = new Map()
  for (const relation of relations) {
    const existing = adjacency.get(relation.fromId)
    if (existing) {
      existing.push(relation)
    } else {
      adjacency.set(relation.fromId, [relation])
    }
  }
  return adjacency
}

/**
 * Breadth first walk from `startId` over the children of each food item,
 * returning the path taken to every food item that can be reached.
 *
 * Food items are visited once, so a cycle in the relations stops the walk
 * instead of looping forever.
 */
function walk(startId: number, adjacency: Adjacency, includeOptional: boolean): Map<number, number[]> {
  const paths = new Map<number, number[]>([[startId, [startId]]])
  const queue = [startId]

  for (let i = 0; i < queue.length; i++) {
    const current = queue[i]!
    const path = paths.get(current)!
    for (const relation of adjacency.get(current) ?? []) {
      if (relation.optional && !includeOptional) continue
      if (paths.has(relation.toId)) continue
      paths.set(relation.toId, [...path, relation.toId])
      queue.push(relation.toId)
    }
  }

  return paths
}

function evaluate(
  foodItemId: number,
  adjacency: Adjacency,
  restricted: ReadonlySet<number>,
): FoodItemVerdict {
  // Walking the required relations on their own first tells us which food items
  // are always part of this one. Anything the second walk adds is only reached
  // by going through an optional relation.
  const required = walk(foodItemId, adjacency, false)
  const withOptional = walk(foodItemId, adjacency, true)

  const hits: RestrictionHit[] = []
  for (const [reachedId, path] of required) {
    if (restricted.has(reachedId)) {
      hits.push({ foodItemId: reachedId, path, optional: false })
    }
  }
  for (const [reachedId, path] of withOptional) {
    if (restricted.has(reachedId) && !required.has(reachedId)) {
      hits.push({ foodItemId: reachedId, path, optional: true })
    }
  }

  const verdict: Verdict = hits.some((hit) => !hit.optional)
    ? 'UNSAFE'
    : hits.length > 0
      ? 'MAYBE'
      : 'SAFE'

  return { foodItemId, verdict, hits }
}

/**
 * Checks a single food item against the food items that may not be eaten.
 */
export function evaluateFoodItem(
  foodItemId: number,
  relations: Relation[],
  restrictedFoodItemIds: Iterable<number>,
): FoodItemVerdict {
  return evaluate(foodItemId, toAdjacency(relations), new Set(restrictedFoodItemIds))
}

/**
 * Checks several food items, reusing the same view of the relations.
 */
export function evaluateFoodItems(
  foodItemIds: number[],
  relations: Relation[],
  restrictedFoodItemIds: Iterable<number>,
): FoodItemVerdict[] {
  const adjacency = toAdjacency(relations)
  const restricted = new Set(restrictedFoodItemIds)
  return foodItemIds.map((foodItemId) => evaluate(foodItemId, adjacency, restricted))
}
