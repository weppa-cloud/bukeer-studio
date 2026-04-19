'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getPublicUiMessages, resolvePublicUiLocale } from '@/lib/site/public-ui-messages'

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const pathname = usePathname()
  const pathParts = (pathname ?? '').split('/').filter(Boolean)
  const localeToken = pathParts[2] ?? 'es-CO'
  const locale = resolvePublicUiLocale(localeToken)
  const messages = getPublicUiMessages(locale)

  useEffect(() => {
    console.error('[site.error]', error)
  }, [error])

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <p className="text-6xl font-bold text-primary/20 mb-4">{messages.siteError.title}</p>
        <h1 className="text-2xl md:text-3xl font-bold mb-3">
          {messages.siteError.title}
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          {messages.siteError.body}
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
        >
          {messages.siteError.tryAgain}
        </button>
      </div>
    </div>
  )
}
