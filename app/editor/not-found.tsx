'use client'

export default function EditorNotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="text-center max-w-md">
        <p className="text-6xl font-bold text-muted-foreground/30 mb-4">404</p>
        <h2 className="text-xl font-semibold mb-2">Editor not found</h2>
        <p className="text-muted-foreground mb-6">
          The website or section you are trying to edit was not found.
        </p>
      </div>
    </div>
  )
}
