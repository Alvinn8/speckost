import { afterEach, describe, expect, it, vi } from 'vitest'

import { foodItemsApi } from '../client'
import { ApiError } from '../errors'
import { FoodItemRelationType } from '../types'

function mockFetch(response: Response | Error) {
  const fetchMock = vi.fn(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('request', () => {
  it('returns the parsed body of a successful response', async () => {
    mockFetch(jsonResponse([{ id: 1, svName: 'Bröd', type: 'NORMAL' }]))

    await expect(foodItemsApi.all()).resolves.toEqual([{ id: 1, svName: 'Bröd', type: 'NORMAL' }])
  })

  it('resolves without a body for 204 responses', async () => {
    mockFetch(new Response(null, { status: 204 }))

    await expect(foodItemsApi.removeChild(1, 2)).resolves.toBeUndefined()
  })

  it('reports the error message the server sent', async () => {
    mockFetch(jsonResponse({ error: 'Relationen finns redan.' }, 409))

    const error = await foodItemsApi
      .addChild(1, 2, FoodItemRelationType.CONTAINS, false)
      .catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(409)
    expect(error.message).toBe('Relationen finns redan.')
  })

  it('falls back to a message for the status when the server sends none', async () => {
    mockFetch(new Response('<html>gateway</html>', { status: 502 }))

    const error = await foodItemsApi.all().catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.message).toBe('Något gick fel på servern.')
  })

  it('turns a network failure into an ApiError without a status', async () => {
    mockFetch(new TypeError('Failed to fetch'))

    const error = await foodItemsApi.all().catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBeNull()
    expect(error.message).toBe('Kunde inte nå servern. Kontrollera din anslutning.')
  })
})
