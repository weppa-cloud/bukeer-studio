'use client'

import { useEffect } from 'react'

export default function EditorError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[editor.error]', error)

    // Notify parent Flutter iframe if embedded
    try {
      if (window.parent !== window) {
        window.parent.postMessage(
          { type: 'editor-error', message: error.message },
          '*'
        )
      }
    } catch {
      // Cross-origin restriction — ignore
    }
  }, [error])

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <svg
            className="h-6 w-6 text-destructive"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold mb-2">Editor Error</h2>
        <p className="text-muted-foreground mb-6">
          An unexpected error occurred in the editor. Your unsaved changes may
          have been preserved in local backup.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Reload editor
        </button>
      </div>
    </div>
  )
}
