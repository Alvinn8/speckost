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

export interface PersonWithRestrictions {
  id: number
  name: string
  restrictions: PersonRestrictionWithRestriction[]
}
