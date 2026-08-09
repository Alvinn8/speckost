import { useToast } from 'primevue'
import { ApiError } from '@/api/errors'

const LIFE = 4000

/**
 * Toasts with consistent wording and lifetime.
 *
 * Prefer {@link AppToast.fromError} over `error` when showing a failed request:
 * it logs the underlying error and shows the message the API gave us, which is
 * more helpful than a generic one.
 */
export interface AppToast {
  success(detail: string): void
  warn(detail: string): void
  error(detail: string): void
  fromError(error: unknown, fallback: string): void
}

export function useAppToast(): AppToast {
  const toast = useToast()

  const success = (detail: string) =>
    toast.add({ severity: 'success', summary: 'Klart', detail, life: LIFE })

  const warn = (detail: string) =>
    toast.add({ severity: 'warn', summary: 'Obs', detail, life: LIFE })

  const error = (detail: string) =>
    toast.add({ severity: 'error', summary: 'Fel', detail, life: LIFE })

  function fromError(cause: unknown, fallback: string) {
    console.error(fallback, cause)
    error(cause instanceof ApiError ? cause.message : fallback)
  }

  return { success, warn, error, fromError }
}
