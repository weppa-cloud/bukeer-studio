/**
 * Loading skeleton for dashboard pages.
 * Matches the typical layout: sidebar + main content area.
 *
 * @see ADR-002 — Three-Tier Error Handling (loading states)
 */
export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen animate-pulse">
      {/* Sidebar skeleton */}
      <div className="hidden md:block w-64 border-r border-border bg-muted/30 p-4 space-y-4">
        <div className="h-8 bg-muted rounded-md w-3/4" />
        <div className="space-y-2 mt-6">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-muted rounded-md" />
          ))}
        </div>
      </div>

      {/* Main content skeleton */}
      <div className="flex-1 p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="h-8 bg-muted rounded-md w-48" />
          <div className="h-9 bg-muted rounded-md w-24" />
        </div>

        {/* Content cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-40 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
