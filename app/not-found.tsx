import Link from 'next/link'
import { headers } from 'next/headers'
import { getPublicUiMessages, resolvePublicUiLocale } from '@/lib/site/public-ui-messages'

/**
 * Global 404 page for routes that don't match any known segment.
 */
export default async function NotFound() {
  const headerList = await headers()
  const acceptLanguage = headerList.get('accept-language')
  const localeCandidate = acceptLanguage?.split(',')[0]?.trim() ?? 'es-CO'
  const locale = resolvePublicUiLocale(localeCandidate)
  const messages = getPublicUiMessages(locale)

  return (
    <html lang={locale}>
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
              fontSize: '5rem',
              fontWeight: 700,
              color: '#d4d4d8',
              marginBottom: '0.5rem',
            }}
          >
            404
          </p>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            {messages.global404.title}
          </h1>
          <p style={{ color: '#71717a', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            {messages.global404.body}
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '0.625rem 1.5rem',
              backgroundColor: '#18181b',
              color: '#fff',
              borderRadius: '0.375rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            {messages.global404.goHome}
          </Link>
        </div>
      </body>
    </html>
  )
}
