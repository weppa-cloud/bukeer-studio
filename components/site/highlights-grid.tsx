import type { ReactNode } from 'react';
import { SpotlightCard } from '@/components/ui/spotlight-card';

export interface HighlightItem {
  label?: string | null;
  description?: string | null;
  icon?: string | null;
  href?: string | null;
}

export interface HighlightsGridProps {
  highlights?: Array<HighlightItem | string | null | undefined> | null;
  title?: string | null;
  subtitle?: string | null;
  className?: string;
}

function normalizeHighlight(item: HighlightItem | string | null | undefined): HighlightItem | null {
  if (typeof item === 'string') {
    const label = item.trim();
    return label ? { label } : null;
  }

  if (!item || typeof item !== 'object') {
    return null;
  }

  const label = typeof item.label === 'string' ? item.label.trim() : '';
  const description = typeof item.description === 'string' ? item.description.trim() : '';
  const href = typeof item.href === 'string' ? item.href.trim() : '';

  if (!label) {
    return null;
  }

  return {
    label,
    description: description || null,
    href: href || null,
    icon: typeof item.icon === 'string' ? item.icon.trim() || null : null,
  };
}

function renderCardBody(item: HighlightItem): ReactNode {
  return (
    <div
      className="h-full rounded-2xl border p-5 transition-transform duration-300"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div className="flex h-full flex-col gap-3">
        <div
          className="inline-flex h-10 w-10 items-center justify-center rounded-full"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent) 12%, var(--bg))',
            color: 'var(--accent)',
          }}
        >
          <span className="text-sm font-semibold leading-none">
            {item.icon ? item.icon.slice(0, 2).toUpperCase() : '•'}
          </span>
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-semibold leading-6" style={{ color: 'var(--text-heading)' }}>
            {item.label}
          </h3>
          {item.description && (
            <p className="text-sm leading-6" style={{ color: 'var(--text-secondary)' }}>
              {item.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function HighlightsGrid({
  highlights,
  title,
  subtitle,
  className = '',
}: HighlightsGridProps) {
  const items = (highlights ?? [])
    .map(normalizeHighlight)
    .filter((item): item is HighlightItem => Boolean(item));

  if (items.length === 0) {
    return null;
  }

  return (
    <section data-testid="section-highlights-grid" className={className}>
      {(title || subtitle) && (
        <div className="mb-6">
          {title && (
            <h2 className="text-lg font-semibold tracking-tight" style={{ color: 'var(--text-heading)' }}>
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item, index) => {
          const card = renderCardBody(item);

          if (item.href) {
            return (
              <SpotlightCard
                key={`${item.label}-${index}`}
                className="h-full rounded-2xl"
                spotlightColor="var(--accent)"
                spotlightSize={180}
              >
                <a
                  href={item.href}
                  className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                >
                  {card}
                </a>
              </SpotlightCard>
            );
          }

          return (
            <SpotlightCard
              key={`${item.label}-${index}`}
              className="h-full rounded-2xl"
              spotlightColor="var(--accent)"
              spotlightSize={180}
            >
              {card}
            </SpotlightCard>
          );
        })}
      </div>
    </section>
  );
}
