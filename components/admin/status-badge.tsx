interface StatusBadgeProps {
  status: 'draft' | 'published' | 'scheduled' | 'new' | 'contacted' | 'converted' | 'archived';
  size?: 'sm' | 'md';
}

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  new: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  contacted: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  converted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  archived: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400',
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium capitalize ${sizeClasses} ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}
    >
      {status}
    </span>
  );
}
