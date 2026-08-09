import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mount } from '@vue/test-utils'
import ToastService from 'primevue/toastservice'
import { defineComponent } from 'vue'
import { ApiError } from '@/api/errors'
import { useAppToast, type AppToast } from '../useAppToast'

const add = vi.fn()

vi.mock('primevue', () => ({ useToast: () => ({ add }) }))

/** Runs `useAppToast` inside a component, where composables are allowed. */
function mountToast(): AppToast {
  let toast!: AppToast
  mount(
    defineComponent({
      setup() {
        toast = useAppToast()
        return () => null
      },
    }),
    { global: { plugins: [ToastService] } },
  )
  return toast
}

beforeEach(() => {
  add.mockClear()
})

describe('useAppToast', () => {
  it('adds a toast with a Swedish summary per severity', () => {
    const toast = mountToast()

    toast.success('Det gick bra.')
    toast.warn('Tänk på det här.')
    toast.error('Det gick fel.')

    expect(add.mock.calls.map(([message]) => [message.severity, message.summary])).toEqual([
      ['success', 'Klart'],
      ['warn', 'Obs'],
      ['error', 'Fel'],
    ])
    expect(add.mock.calls.every(([message]) => message.life > 0)).toBe(true)
  })

  it('shows the message of an ApiError', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const toast = mountToast()

    toast.fromError(new ApiError('Relationen finns redan.', 409), 'Kunde inte spara.')

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', detail: 'Relationen finns redan.' }),
    )
  })

  it('falls back to the given message for other errors', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const toast = mountToast()

    toast.fromError(new Error('Cannot read properties of undefined'), 'Kunde inte spara.')

    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'error', detail: 'Kunde inte spara.' }),
    )
  })
})
