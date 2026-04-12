/**
 * Loading skeleton for editor pages.
 * Matches the typical layout: toolbar + canvas area.
 *
 * @see ADR-002 — Three-Tier Error Handling (loading states)
 */
export default function EditorLoading() {
  return (
    <div className="flex flex-col h-screen animate-pulse">
      {/* Toolbar skeleton */}
      <div className="h-14 border-b border-border bg-muted/30 flex items-center px-4 gap-3">
        <div className="h-8 w-8 bg-muted rounded" />
        <div className="h-6 bg-muted rounded-md w-32" />
        <div className="flex-1" />
        <div className="h-8 bg-muted rounded-md w-20" />
        <div className="h-8 bg-muted rounded-md w-20" />
      </div>

      {/* Editor canvas skeleton */}
      <div className="flex-1 flex">
        {/* Section list */}
        <div className="w-64 border-r border-border p-4 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>

        {/* Preview area */}
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="h-64 bg-muted rounded-xl" />
            <div className="h-48 bg-muted rounded-xl" />
            <div className="h-32 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  )
}
