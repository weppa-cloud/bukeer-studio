'use client';

import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { StudioComponentSize } from '@/lib/studio/theme';

interface StudioPageProps {
  children: ReactNode;
  className?: string;
}

interface StudioSectionHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
}

interface StudioCardProps {
  children: ReactNode;
  className?: string;
}

interface StudioShellProps {
  children: ReactNode;
  className?: string;
}

interface StudioButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: StudioComponentSize;
}

type StudioInputProps = React.InputHTMLAttributes<HTMLInputElement>;

type StudioTextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

interface StudioPanelProps {
  children: ReactNode;
  className?: string;
}

interface StudioTabsOption<T extends string = string> {
  id: T;
  label: string;
}

interface StudioTabsProps<T extends string = string> {
  value: T;
  options: ReadonlyArray<StudioTabsOption<T>>;
  onChange: (value: T) => void;
  className?: string;
  testIdPrefix?: string;
  'aria-label'?: string;
}

interface StudioBadgeProps {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

interface StudioTopbarProps {
  left: ReactNode;
  right?: ReactNode;
  center?: ReactNode;
  className?: string;
  'data-testid'?: string;
}

interface StudioSelectOption {
  value: string;
  label: string;
}

interface StudioSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: StudioSelectOption[];
}

type StudioListRowProps = React.HTMLAttributes<HTMLDivElement>;

interface StudioEmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function StudioPage({ children, className }: StudioPageProps) {
  return <div className={cn('studio-page', className)}>{children}</div>;
}

export function StudioShell({ children, className }: StudioShellProps) {
  return <div className={cn('studio-shell', className)}>{children}</div>;
}

export function StudioSectionHeader({
  title,
  subtitle,
  actions,
  className,
}: StudioSectionHeaderProps) {
  return (
    <div className={cn('studio-section-header', className)}>
      <div className="min-w-0">
        <h2 className="studio-section-title">{title}</h2>
        {subtitle ? <p className="studio-section-subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="studio-header-actions">{actions}</div> : null}
    </div>
  );
}

export function StudioCard({ children, className }: StudioCardProps) {
  return <div className={cn('studio-card', className)}>{children}</div>;
}

export function StudioPanel({ children, className }: StudioPanelProps) {
  return <div className={cn('studio-panel', className)}>{children}</div>;
}

export function StudioTabs<T extends string>({
  value,
  options,
  onChange,
  className,
  testIdPrefix,
  'aria-label': ariaLabel,
}: StudioTabsProps<T>) {
  return (
    <div
      className={cn('studio-tabs', className)}
      role="tablist"
      aria-label={ariaLabel}
      data-testid={testIdPrefix ? `${testIdPrefix}-tablist` : undefined}
    >
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          data-testid={testIdPrefix ? `${testIdPrefix}-${option.id}` : undefined}
          onClick={() => onChange(option.id)}
          className={cn('studio-tab', value === option.id && 'studio-tab-active')}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function StudioButton({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: StudioButtonProps) {
  return (
    <button
      className={cn('studio-btn', `studio-btn-${variant}`, `studio-btn-${size}`, className)}
      {...props}
    />
  );
}

export function StudioInput({ className, ...props }: StudioInputProps) {
  return <input className={cn('studio-input', className)} {...props} />;
}

export function StudioSearch({ className, ...props }: StudioInputProps) {
  return (
    <div className={cn('studio-search', className)}>
      <svg className="studio-search-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="m21 21-4.35-4.35m1.35-4.65a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" />
      </svg>
      <input className="studio-input studio-search-input" {...props} />
    </div>
  );
}

export function StudioTextarea({ className, ...props }: StudioTextareaProps) {
  return <textarea className={cn('studio-input studio-textarea', className)} {...props} />;
}

export function StudioSelect({ options, className, ...props }: StudioSelectProps) {
  return (
    <select className={cn('studio-input studio-select', className)} {...props}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function StudioBadge({ children, tone = 'neutral', className }: StudioBadgeProps) {
  return (
    <span className={cn('studio-badge', `studio-badge-${tone}`, className)}>
      {children}
    </span>
  );
}

export function StudioBadgeStatus({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const normalized = status.toLowerCase();
  let tone: StudioBadgeProps['tone'] = 'neutral';
  if (['published', 'active', 'completed', 'success', 'converted', 'saved'].includes(normalized)) {
    tone = 'success';
  } else if (['draft', 'scheduled', 'pending', 'contacted'].includes(normalized)) {
    tone = 'warning';
  } else if (['archived', 'deleted', 'error', 'failed'].includes(normalized)) {
    tone = 'danger';
  } else if (['new', 'info'].includes(normalized)) {
    tone = 'info';
  }

  return (
    <StudioBadge tone={tone} className={className}>
      {status}
    </StudioBadge>
  );
}

export const StudioListRow = forwardRef<HTMLDivElement, StudioListRowProps>(function StudioListRow(
  { children, className, ...props },
  ref
) {
  return (
    <div ref={ref} className={cn('studio-list-row', className)} {...props}>
      {children}
    </div>
  );
});

export function StudioTopbar({
  left,
  center,
  right,
  className,
  'data-testid': dataTestid,
}: StudioTopbarProps) {
  return (
    <div className={cn('studio-topbar', className)} data-testid={dataTestid}>
      <div className="studio-topbar-left">{left}</div>
      {center ? <div className="studio-topbar-center">{center}</div> : null}
      {right ? <div className="studio-topbar-right">{right}</div> : null}
    </div>
  );
}

export function StudioEmptyState({ title, description, action, className }: StudioEmptyStateProps) {
  return (
    <div className={cn('studio-empty-state', className)}>
      <h3 className="studio-empty-title">{title}</h3>
      {description ? <p className="studio-empty-description">{description}</p> : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}
