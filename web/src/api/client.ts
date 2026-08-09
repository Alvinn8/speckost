import type {
  FoodItem,
  FoodItemRelation,
  FoodItemRelationType,
  FoodItemType,
  FoodItemWithChildren,
} from './types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `Request failed: ${res.status}`)
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
  patch: (id: number, data: Partial<FoodItem>) =>
    request<FoodItem>(`/api/food-items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
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
