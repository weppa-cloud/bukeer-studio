/**
 * Breadcrumbs — matches designer `Crumbs` primitive.
 *
 * Renders nav crumbs with accent-2 italic serif separator. Server component;
 * accepts href + label array.
 */

import Link from 'next/link';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (!items.length) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className={`editorial-breadcrumbs${className ? ` ${className}` : ''}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        color: 'var(--c-ink-2)',
        fontSize: 13,
        lineHeight: 1.4,
      }}
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1;
        return (
          <span
            key={`${item.label}-${idx}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            {item.href && !isLast ? (
              <Link
                href={item.href}
                style={{
                  color: 'inherit',
                  textDecoration: 'none',
                }}
              >
                {item.label}
              </Link>
            ) : (
              <span
                style={{
                  color: isLast ? 'var(--c-ink)' : 'inherit',
                  fontWeight: isLast ? 600 : 400,
                }}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
            {!isLast ? (
              <span
                aria-hidden="true"
                style={{
                  fontFamily: 'var(--font-serif)',
                  fontStyle: 'italic',
                  color: 'var(--c-accent)',
                  opacity: 0.6,
                }}
              >
                /
              </span>
            ) : null}
          </span>
        );
      })}
    </nav>
  );
}
