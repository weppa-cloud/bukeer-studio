/**
 * Loading skeleton for public site pages.
 * Matches the typical layout: header → hero → content sections → footer.
 *
 * @see ADR-002 — Three-Tier Error Handling (loading states)
 */
export default function SiteLoading() {
  return (
    <div className="animate-pulse">
      {/* Hero skeleton */}
      <div className="w-full h-[60vh] bg-muted" />

      {/* Content sections skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-16 space-y-16">
        {/* Section 1 */}
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded-md w-1/3 mx-auto" />
          <div className="h-4 bg-muted rounded-md w-2/3 mx-auto" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-64 bg-muted rounded-xl" />
            ))}
          </div>
        </div>

        {/* Section 2 */}
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded-md w-1/4 mx-auto" />
          <div className="h-4 bg-muted rounded-md w-1/2 mx-auto" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
            {[0, 1].map((i) => (
              <div key={i} className="h-48 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
