export type SeoApiErrorCode =
  | 'AUTH_EXPIRED'
  | 'FORBIDDEN'
  | 'RATE_LIMIT'
  | 'UPSTREAM_UNAVAILABLE'
  | 'VALIDATION_ERROR'
  | 'INTEGRATION_NOT_CONNECTED'
  | 'INTERNAL_ERROR';

export class SeoApiError extends Error {
  readonly code: SeoApiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: SeoApiErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function toErrorResponse(err: unknown) {
  if (err instanceof SeoApiError) {
    return {
      status: err.status,
      body: {
        error: err.message,
        code: err.code,
        details: err.details,
      },
    };
  }

  return {
    status: 500,
    body: {
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    },
  };
}
