import type {
  FoodItem,
  FoodItemRelation,
  FoodItemRelationType,
  FoodItemType,
  FoodItemWithChildren,
  PersonRestrictionWithRestriction,
  PersonWithRestrictions,
  Restriction,
  RestrictionWithFoodItems,
} from './types'

const BASE_URL =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:3000' : import.meta.env.BASE_URL.replace(/\/$/, ''))

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
  list: (type?: FoodItemType) => {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    return request<FoodItem[]>(`/api/food-items?${params}`)
  },
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

export const restrictionsApi = {
  list: () => request<Restriction[]>('/api/restrictions'),
  get: (id: number) => request<RestrictionWithFoodItems>(`/api/restrictions/${id}`),
  create: (name: string) =>
    request<Restriction>('/api/restrictions/new', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  patch: (id: number, name: string) =>
    request<Restriction>(`/api/restrictions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }),
  addFoodItem: (restrictionId: number, foodItemId: number) =>
    request<void>(`/api/restrictions/${restrictionId}/food-items`, {
      method: 'POST',
      body: JSON.stringify({ foodItemId }),
    }),
  removeFoodItem: (restrictionId: number, foodItemId: number) =>
    request<void>(`/api/restrictions/${restrictionId}/food-items/${foodItemId}`, {
      method: 'DELETE',
    }),
}

export const peopleApi = {
  list: () => request<PersonWithRestrictions[]>('/api/people'),
  create: (name: string) =>
    request<PersonWithRestrictions>('/api/people/new', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
  bulkCreate: (people: { name: string }[]) =>
    request<PersonWithRestrictions[]>('/api/people/bulk', {
      method: 'POST',
      body: JSON.stringify({ people }),
    }),
  addRestriction: (personId: number, restrictionId: number) =>
    request<PersonRestrictionWithRestriction>(`/api/people/${personId}/restrictions`, {
      method: 'POST',
      body: JSON.stringify({ restrictionId }),
    }),
  removeRestriction: (personId: number, personRestrictionId: number) =>
    request<void>(`/api/people/${personId}/restrictions/${personRestrictionId}`, {
      method: 'DELETE',
    }),
}
