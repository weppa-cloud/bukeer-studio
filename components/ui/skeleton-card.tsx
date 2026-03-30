'use client';

/**
 * Premium skeleton loaders that replicate exact card anatomy.
 * Branded shimmer effect using CSS Variable Bridge colors.
 */

interface SkeletonCardProps {
  type?: 'hotel' | 'activity' | 'package' | 'default';
  className?: string;
}

function ShimmerBar({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`rounded shimmer-bar ${className}`}
      style={{
        backgroundColor: 'var(--border-subtle)',
        ...style,
      }}
    />
  );
}

export function SkeletonCard({ type = 'default', className = '' }: SkeletonCardProps) {
  if (type === 'hotel') return <HotelSkeleton className={className} />;
  if (type === 'activity') return <ActivitySkeleton className={className} />;
  if (type === 'package') return <PackageSkeleton className={className} />;
  return <DefaultSkeleton className={className} />;
}

// Hotel card skeleton — matches Airbnb card anatomy
function HotelSkeleton({ className }: { className: string }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Image area with badge placeholders */}
      <div className="relative" style={{ aspectRatio: '16/10' }}>
        <div className="absolute inset-0 shimmer-bg" style={{ backgroundColor: 'var(--border-subtle)' }} />
        {/* Star badge skeleton */}
        <div className="absolute top-3 right-3">
          <ShimmerBar className="h-5 w-16 rounded-full" />
        </div>
      </div>
      {/* Content */}
      <div className="p-4 space-y-3">
        <ShimmerBar className="h-5 w-3/4" />
        <div className="flex items-center gap-1">
          <ShimmerBar className="h-3 w-3 rounded-full" />
          <ShimmerBar className="h-3 w-24" />
        </div>
        <div className="flex items-center gap-1">
          <ShimmerBar className="h-3 w-3 rounded-full" />
          <ShimmerBar className="h-3 w-16" />
          <ShimmerBar className="h-3 w-10" />
        </div>
        <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <ShimmerBar className="h-6 w-20" />
          <ShimmerBar className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

// Activity card skeleton — matches overlay card anatomy
function ActivitySkeleton({ className }: { className: string }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden relative ${className}`}
      style={{ aspectRatio: '3/4' }}
    >
      <div className="absolute inset-0 shimmer-bg" style={{ backgroundColor: 'var(--border-subtle)' }} />
      {/* Top badges */}
      <div className="absolute top-3 left-3 right-3 flex justify-between">
        <ShimmerBar className="h-5 w-20 rounded-full" />
        <ShimmerBar className="h-5 w-14 rounded-full" />
      </div>
      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        <ShimmerBar className="h-5 w-3/4" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <ShimmerBar className="h-3 w-1/2" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <ShimmerBar className="h-5 w-16" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <ShimmerBar className="h-3 w-20" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />
        </div>
      </div>
    </div>
  );
}

// Package card skeleton — matches Intrepid card anatomy
function PackageSkeleton({ className }: { className: string }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden flex flex-col ${className}`}
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="relative h-48">
        <div className="absolute inset-0 shimmer-bg" style={{ backgroundColor: 'var(--border-subtle)' }} />
        <div className="absolute top-3 left-3">
          <ShimmerBar className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <div className="p-5 space-y-3 flex-1">
        <ShimmerBar className="h-5 w-4/5" />
        <div className="flex gap-3">
          <ShimmerBar className="h-3 w-24" />
          <ShimmerBar className="h-3 w-16" />
        </div>
        {/* Highlights */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center gap-2">
            <ShimmerBar className="h-3 w-3 rounded-full" />
            <ShimmerBar className="h-3 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <ShimmerBar className="h-3 w-3 rounded-full" />
            <ShimmerBar className="h-3 w-28" />
          </div>
          <div className="flex items-center gap-2">
            <ShimmerBar className="h-3 w-3 rounded-full" />
            <ShimmerBar className="h-3 w-24" />
          </div>
        </div>
        <div className="flex-1" />
        <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <ShimmerBar className="h-6 w-24" />
          <ShimmerBar className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

// Default skeleton
function DefaultSkeleton({ className }: { className: string }) {
  return (
    <div
      className={`rounded-2xl overflow-hidden ${className}`}
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="shimmer-bg" style={{ aspectRatio: '16/10', backgroundColor: 'var(--border-subtle)' }} />
      <div className="p-4 space-y-3">
        <ShimmerBar className="h-4 w-3/4" />
        <ShimmerBar className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/**
 * Skeleton grid for listing pages.
 */
export function SkeletonGrid({ count = 6, type = 'default' }: { count?: number; type?: 'hotel' | 'activity' | 'package' | 'default' }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} type={type} />
      ))}
    </div>
  );
}
