/**
 * Loading skeleton for the website admin layout.
 * Matches WebsiteAdminLayout structure: top bar + tab nav + content area.
 * Shown by Next.js during route transitions before the layout renders.
 */
export default function WebsiteLayoutLoading() {
  return (
    <div className="flex flex-col h-full animate-pulse">
      {/* Top bar skeleton */}
      <div className="bg-[var(--studio-bg-elevated,#1a1a1a)] border-b border-[var(--studio-border,#2a2a2a)]">
        <div className="flex items-center justify-between px-3 md:px-6 py-2 md:py-3">
          <div className="flex items-center gap-3">
            {/* Back arrow */}
            <div className="w-5 h-5 bg-[var(--studio-border,#2a2a2a)] rounded" />
            {/* Website name */}
            <div className="h-5 w-36 bg-[var(--studio-border,#2a2a2a)] rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block h-8 w-16 bg-[var(--studio-border,#2a2a2a)] rounded" />
            <div className="h-8 w-20 bg-[var(--studio-primary,#6366f1)] opacity-40 rounded" />
          </div>
        </div>

        {/* Tab nav skeleton — 5 tabs */}
        <div className="flex items-center px-3 md:px-6 gap-1 py-2 border-t border-[var(--studio-border,#2a2a2a)]">
          {[80, 96, 72, 88, 80].map((w, i) => (
            <div
              key={i}
              className="h-9 bg-[var(--studio-border,#2a2a2a)] rounded"
              style={{ width: w }}
            />
          ))}
        </div>
      </div>

      {/* Content area skeleton */}
      <div className="flex-1 p-4 md:p-6 space-y-4">
        <div className="h-6 w-48 bg-[var(--studio-border,#2a2a2a)] rounded" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-32 bg-[var(--studio-border,#2a2a2a)] rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
