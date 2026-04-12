'use client'

import { useEffect } from 'react'

/**
 * Global error boundary — catches root layout errors.
 * Must include own <html> and <body> tags because the root layout may have failed.
 * Uses inline styles only — external CSS may not have loaded.
 *
 * @see ADR-002 — Three-Tier Error Handling (Tier 3)
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[global-error]', error)
  }, [error])

  return (
    <html lang="es">
      <body
        style={{
          margin: 0,
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#fafafa',
          color: '#1a1a1a',
        }}
      >
        <div style={{ textAlign: 'center', padding: '2rem', maxWidth: '28rem' }}>
          <p
            style={{
              fontSize: '3rem',
              fontWeight: 700,
              color: '#d4d4d8',
              marginBottom: '0.5rem',
            }}
          >
            Error
          </p>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#71717a', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            An unexpected error occurred. Please try reloading the page.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '0.625rem 1.5rem',
              backgroundColor: '#18181b',
              color: '#fff',
              border: 'none',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
