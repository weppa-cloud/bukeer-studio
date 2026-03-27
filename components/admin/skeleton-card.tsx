export function SkeletonCard() {
  return (
    <div className="studio-card overflow-hidden animate-pulse">
      <div className="aspect-video bg-[var(--studio-panel)]" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-[var(--studio-panel)] rounded w-3/4" />
        <div className="h-3 bg-[var(--studio-panel)] rounded w-1/2" />
        <div className="h-3 bg-[var(--studio-panel)] rounded w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
