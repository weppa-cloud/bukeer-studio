interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="studio-card flex flex-col items-center justify-center py-14 px-5 text-center">
      {icon && (
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4 text-[var(--studio-text-muted)] border border-[var(--studio-border)] bg-[var(--studio-panel)]">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-[var(--studio-text)]">
        {title}
      </h3>
      {description && (
        <p className="text-[var(--studio-text-muted)] mt-2 max-w-sm text-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
