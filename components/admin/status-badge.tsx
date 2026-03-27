interface StatusBadgeProps {
  status: 'draft' | 'published' | 'scheduled' | 'new' | 'contacted' | 'converted' | 'archived';
  size?: 'sm' | 'md';
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'studio-badge-warning',
  published: 'studio-badge-success',
  scheduled: 'studio-badge-info',
  new: 'studio-badge-info',
  contacted: 'studio-badge-neutral',
  converted: 'studio-badge-success',
  archived: 'studio-badge-neutral',
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-[11px] px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`studio-badge ${sizeClasses} ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}
    >
      {status}
    </span>
  );
}
