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
