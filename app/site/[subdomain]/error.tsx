'use client'

import { useEffect } from 'react'

export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[site.error]', error)
  }, [error])

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="text-center max-w-lg">
        <p className="text-6xl font-bold text-primary/20 mb-4">Oops</p>
        <h1 className="text-2xl md:text-3xl font-bold mb-3">
          Algo salió mal
        </h1>
        <p className="text-muted-foreground mb-8 leading-relaxed">
          Lo sentimos, ocurrió un error inesperado. Intenta recargar la página.
        </p>
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  )
}
