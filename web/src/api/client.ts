import type {
  FoodItem,
  FoodItemRelation,
  FoodItemRelationType,
  FoodItemType,
  FoodItemWithChildren,
  GroupCompatibilityResult,
  PersonGroup,
  PersonGroupWithMembers,
  PersonRestrictionWithRestriction,
  PersonWithData,
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

async function postRequest<T>(path: string, body: object): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

async function patchRequest<T>(path: string, body: object): Promise<T> {
  return request<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

async function deleteRequest<T>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' })
}

export const foodItemsApi = {
  list: (type?: FoodItemType) => {
    const params = new URLSearchParams()
    if (type) params.set('type', type)
    return request<FoodItem[]>(`/api/food-items?${params}`)
  },
  create: (name: string, type: FoodItemType) =>
    postRequest<FoodItem>('/api/food-items/new', { name, type }),
  patch: (id: number, data: Partial<FoodItem>) =>
    patchRequest<FoodItem>(`/api/food-items/${id}`, data),
  get: (id: number) => request<FoodItemWithChildren>(`/api/food-items/${id}`),
  addChild: (id: number, childId: number, relationType: FoodItemRelationType, optional: boolean) =>
    postRequest<FoodItemRelation>(`/api/food-items/${id}/children`, {
      childId,
      relationType,
      optional,
    }),
  removeChild: (id: number, relationId: number) =>
    deleteRequest<void>(`/api/food-items/${id}/children/${relationId}`),
}

export const restrictionsApi = {
  list: () => request<Restriction[]>('/api/restrictions'),
  get: (id: number) => request<RestrictionWithFoodItems>(`/api/restrictions/${id}`),
  create: (name: string) => postRequest<Restriction>('/api/restrictions/new', { name }),
  patch: (id: number, name: string) =>
    patchRequest<Restriction>(`/api/restrictions/${id}`, { name }),
  addFoodItem: (restrictionId: number, foodItemId: number) =>
    postRequest<void>(`/api/restrictions/${restrictionId}/food-items`, { foodItemId }),
  removeFoodItem: (restrictionId: number, foodItemId: number) =>
    deleteRequest<void>(`/api/restrictions/${restrictionId}/food-items/${foodItemId}`),
}

export const peopleApi = {
  list: () => request<PersonWithData[]>('/api/people'),
  create: (name: string) => postRequest<PersonWithData>('/api/people/new', { name }),
  bulkCreate: (people: { name: string }[]) =>
    postRequest<PersonWithData[]>('/api/people/bulk', { people }),
  bulkDelete: (personIds: number[]) =>
    request<void>('/api/people/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ personIds }),
    }),
  addRestriction: (personId: number, restrictionId: number) =>
    postRequest<PersonRestrictionWithRestriction>(`/api/people/${personId}/restrictions`, {
      restrictionId,
    }),
  removeRestriction: (personId: number, personRestrictionId: number) =>
    deleteRequest<void>(`/api/people/${personId}/restrictions/${personRestrictionId}`),
}

export const personGroupsApi = {
  list: () => request<PersonGroup[]>('/api/groups'),
  get: (id: number) => request<PersonGroupWithMembers>(`/api/groups/${id}`),
  create: (name: string) => postRequest<PersonGroup>('/api/groups/new', { name }),
  allPeople: (groupId: number) => request<PersonWithData[]>(`/api/groups/${groupId}/all-people`),
  addPerson: (groupId: number, personId: number) =>
    postRequest<void>(`/api/groups/${groupId}/person`, { personId }),
  addPersonBulk: (groupId: number, personIds: number[]) =>
    postRequest<void>(`/api/groups/${groupId}/person/bulk`, { personIds }),
  removePerson: (groupId: number, personId: number) =>
    deleteRequest<void>(`/api/groups/${groupId}/person/${personId}`),
  addSubGroup: (groupId: number, subGroupId: number) =>
    postRequest<void>(`/api/groups/${groupId}/sub-group`, { subGroupId }),
  removeSubGroup: (groupId: number, subGroupId: number) =>
    deleteRequest<void>(`/api/groups/${groupId}/sub-group/${subGroupId}`),
}

export const compatibilityApi = {
  check: (personIds: number[], foodItemIds: number[]) =>
    postRequest<GroupCompatibilityResult>('/api/compatibility', { personIds, foodItemIds }),
}
