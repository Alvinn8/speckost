export enum FoodItemType {
  NORMAL = 'NORMAL',
  CATEGORY = 'CATEGORY',
}

export interface FoodItem {
  id: number
  svName?: string
  enName?: string
  svDescription?: string
  enDescription?: string
  type: FoodItemType
}

export enum FoodItemRelationType {
  CONTAINS = 'CONTAINS',
  IS_A = 'IS_A',
}

export interface FoodItemRelation {
  id: number
  fromId: number
  toId: number
  relationType: FoodItemRelationType
  optional: boolean
  child: FoodItem
}

export interface FoodItemWithChildren extends FoodItem {
  children: FoodItemRelation[]
}

export interface Person {
  id: number
  name: string
}

export interface Restriction {
  id: number
  svName: string
  enName?: string
  svDescription?: string
  enDescription?: string
}

export interface PersonWithRestrictions extends Person {
  restrictions: Restriction[]
}

export interface RestrictionWithFoodItems extends Restriction {
  foodItems: FoodItem[]
}

export enum Verdict {
  /** Nothing restricted was found. */
  SAFE = 'SAFE',
  /** Something restricted is always part of this food item. */
  UNSAFE = 'UNSAFE',
  /** Something restricted is only reached through an optional relation. */
  MAYBE = 'MAYBE',
}

/** Why a food item is off limits: what was found, and the way to it. */
export interface RestrictionReason {
  foodItem: FoodItem
  restrictions: Restriction[]
  optional: boolean
  path: FoodItem[]
}

export interface FoodItemVerdict {
  foodItem: FoodItem
  verdict: Verdict
  reasons: RestrictionReason[]
}
