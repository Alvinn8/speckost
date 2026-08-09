/**
 * An error from the API, with a message that is safe to show to the user.
 *
 * `status` is the HTTP status code, or null when the request never reached the
 * server.
 */
export class ApiError extends Error {
  readonly status: number | null

  constructor(message: string, status: number | null, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ApiError'
    this.status = status
  }
}

export function messageForStatus(status: number): string {
  switch (status) {
    case 400:
      return 'Servern kunde inte hantera förfrågan.'
    case 404:
      return 'Det gick inte att hitta det du letade efter.'
    case 409:
      return 'Ändringen krockade med något som redan finns.'
    default:
      return status >= 500 ? 'Något gick fel på servern.' : 'Något gick fel.'
  }
}
