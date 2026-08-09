import type { FoodItem, FoodItemType } from './types'

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
  categories: () => request<FoodItem[]>('/api/food-items/categories'),
  normal: () => request<FoodItem[]>('/api/food-items/normal'),
  create: (name: string, type: FoodItemType) =>
    request<FoodItem>('/api/food-items/new', {
      method: 'POST',
      body: JSON.stringify({ name, type }),
    }),
  get: (id: number) => request<FoodItem>(`/api/food-items/${id}`),
}
