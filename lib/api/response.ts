/**
 * Standard API response envelope for bukeer-studio.
 *
 * All API routes should use these helpers for consistent responses.
 *
 * @see ADR-012 — API Response Envelope Standard
 *
 * @example
 * ```ts
 * import { apiSuccess, apiError } from '@/lib/api/response'
 *
 * // Success
 * return apiSuccess({ items: [...] })
 *
 * // Error
 * return apiError('VALIDATION_ERROR', 'Invalid subdomain', 400)
 *
 * // Success with custom status
 * return apiSuccess({ id: '123' }, 201)
 * ```
 */

import { ZodError } from 'zod'

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return a success JSON response with standard envelope.
 */
export function apiSuccess<T>(data: T, status = 200): Response {
  return Response.json({ success: true, data } satisfies ApiSuccessResponse<T>, { status })
}

/**
 * Return an error JSON response with standard envelope.
 */
export function apiError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
): Response {
  return Response.json(
    {
      success: false,
      error: { code, message, ...(details !== undefined && { details }) },
    } satisfies ApiErrorResponse,
    { status },
  )
}

/**
 * Return a Zod validation error response.
 */
export function apiValidationError(error: ZodError): Response {
  return apiError(
    'VALIDATION_ERROR',
    'Request validation failed',
    400,
    error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
  )
}

/**
 * Return a 401 Unauthorized response.
 */
export function apiUnauthorized(message = 'Authentication required'): Response {
  return apiError('UNAUTHORIZED', message, 401)
}

/**
 * Return a 403 Forbidden response.
 */
export function apiForbidden(message = 'Insufficient permissions'): Response {
  return apiError('FORBIDDEN', message, 403)
}

/**
 * Return a 404 Not Found response.
 */
export function apiNotFound(message = 'Resource not found'): Response {
  return apiError('NOT_FOUND', message, 404)
}

/**
 * Return a 429 Too Many Requests response.
 */
export function apiRateLimited(retryAfter?: number): Response {
  const response = apiError('RATE_LIMITED', 'Too many requests', 429)
  if (retryAfter) {
    // Clone to add header
    const headers = new Headers(response.headers)
    headers.set('Retry-After', String(retryAfter))
    return new Response(response.body, { status: 429, headers })
  }
  return response
}

/**
 * Return a 500 Internal Server Error response.
 */
export function apiInternalError(message = 'Internal server error'): Response {
  return apiError('INTERNAL_ERROR', message, 500)
}
