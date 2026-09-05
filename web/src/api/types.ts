export enum FoodItemType {
  NORMAL = 'NORMAL',
  CATEGORY = 'CATEGORY',
  DISH = 'DISH',
}

export interface FoodItemCategory {
  id: number
  svName: string
  enName: string | null
  optional: boolean
}

export interface FoodItem {
  id: number
  svName: string
  enName?: string
  svDescription?: string
  enDescription?: string
  type: FoodItemType
  categories: FoodItemCategory[]
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
  alternatives: FoodItemRelationAlternative[]
}

export interface FoodItemRelationAlternative {
  id: number
  relationId: number
  replacementFoodItemId: number
  replacementFoodItem: FoodItem
}

export interface FoodItemWithChildren extends FoodItem {
  children: FoodItemRelation[]
}

export interface Restriction {
  id: number
  svName: string
  enName: string | null
  svDescription: string | null
  enDescription: string | null
}

export interface RestrictionWithFoodItems extends Restriction {
  /** The food items that cannot be eaten. */
  foodItems: FoodItem[]
}

export interface PersonRestrictionWithRestriction {
  id: number
  personId: number
  restrictionId: number
  restriction: Restriction
}

export interface PersonWithData {
  id: number
  name: string
  restrictions: PersonRestrictionWithRestriction[]
  groups: PersonGroup[]
}

export type Verdict =
  'COMPATIBLE' | 'INCOMPATIBLE' | 'OPTIONAL_COMPATIBLE' | 'ALTERNATIVE_COMPATIBLE'

export interface ViaAlternative {
  relationId: number
  replacedFoodItemId: number
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

export interface AlternativeResolution {
  relationId: number
  path: number[]
  originalFoodItemId: number
  originalHits: CompatibilityHit[]
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

export interface PersonGroup {
  id: number
  svName: string
  enName?: string
}

export interface PersonGroupWithMembers extends PersonGroup {
  subGroups: PersonGroup[]
  people: PersonWithData[]
}
