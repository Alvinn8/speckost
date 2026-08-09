import { ApiError, messageForStatus } from './errors'
import type {
  FoodItem,
  FoodItemRelation,
  FoodItemRelationType,
  FoodItemType,
  FoodItemVerdict,
  FoodItemWithChildren,
  Person,
  PersonWithRestrictions,
  Restriction,
  RestrictionWithFoodItems,
} from './types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch (error) {
    throw new ApiError('Kunde inte nå servern. Kontrollera din anslutning.', null, { cause: error })
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ApiError(body.error ?? messageForStatus(res.status), res.status)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const foodItemsApi = {
  all: () => request<FoodItem[]>('/api/food-items'),
  categories: () => request<FoodItem[]>('/api/food-items/categories'),
  normal: () => request<FoodItem[]>('/api/food-items/normal'),
  create: (name: string, type: FoodItemType) =>
    request<FoodItem>('/api/food-items/new', {
      method: 'POST',
      body: JSON.stringify({ name, type }),
    }),
  get: (id: number) => request<FoodItemWithChildren>(`/api/food-items/${id}`),
  addChild: (id: number, childId: number, relationType: FoodItemRelationType, optional: boolean) =>
    request<FoodItemRelation>(`/api/food-items/${id}/children`, {
      method: 'POST',
      body: JSON.stringify({ childId, relationType, optional }),
    }),
  removeChild: (id: number, relationId: number) =>
    request<void>(`/api/food-items/${id}/children/${relationId}`, {
      method: 'DELETE',
    }),
}

export const peopleApi = {
  all: () => request<Person[]>('/api/people'),
  create: (name: string) =>
    request<Person>('/api/people/new', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  get: (id: number) => request<PersonWithRestrictions>(`/api/people/${id}`),
  addRestriction: (id: number, restrictionId: number) =>
    request<Restriction>(`/api/people/${id}/restrictions`, {
      method: 'POST',
      body: JSON.stringify({ restrictionId }),
    }),
  removeRestriction: (id: number, restrictionId: number) =>
    request<void>(`/api/people/${id}/restrictions/${restrictionId}`, {
      method: 'DELETE',
    }),
  foodItems: (id: number) => request<FoodItemVerdict[]>(`/api/people/${id}/food-items`),
}

export const restrictionsApi = {
  all: () => request<Restriction[]>('/api/restrictions'),
  create: (name: string) =>
    request<Restriction>('/api/restrictions/new', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  get: (id: number) => request<RestrictionWithFoodItems>(`/api/restrictions/${id}`),
  addFoodItem: (id: number, foodItemId: number) =>
    request<FoodItem>(`/api/restrictions/${id}/food-items`, {
      method: 'POST',
      body: JSON.stringify({ foodItemId }),
    }),
  removeFoodItem: (id: number, foodItemId: number) =>
    request<void>(`/api/restrictions/${id}/food-items/${foodItemId}`, {
      method: 'DELETE',
    }),
}
