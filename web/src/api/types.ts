export enum FoodItemType {
  NORMAL = 'NORMAL',
  CATEGORY = 'CATEGORY',
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
