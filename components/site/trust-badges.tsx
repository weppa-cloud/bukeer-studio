import type { WebsiteData } from '@bukeer/website-contract';

type TrustSignalIcon = 'shield' | 'clock' | 'star' | 'support' | 'check' | 'award';

export interface TrustSignal {
  label?: string | null;
  description?: string | null;
  icon?: TrustSignalIcon | string | null;
  href?: string | null;
}

export interface TrustBadgesProps {
  website: WebsiteData & {
    content: WebsiteData['content'] & {
      trust_signals?: Array<TrustSignal | string | null | undefined> | null;
    };
  };
  className?: string;
  title?: string | null;
  subtitle?: string | null;
}

function normalizeSignal(signal: TrustSignal | string | null | undefined): TrustSignal | null {
  if (typeof signal === 'string') {
    const label = signal.trim();
    return label ? { label } : null;
  }

  if (!signal || typeof signal !== 'object') {
    return null;
  }

  const label = typeof signal.label === 'string' ? signal.label.trim() : '';
  const description = typeof signal.description === 'string' ? signal.description.trim() : '';
  const href = typeof signal.href === 'string' ? signal.href.trim() : '';
  const icon = typeof signal.icon === 'string' ? signal.icon.trim() : '';

  if (!label) {
    return null;
  }

  return {
    label,
    description: description || null,
    href: href || null,
    icon: icon || null,
  };
}

function Icon({ kind }: { kind: TrustSignalIcon | string | null | undefined }) {
  const shared = { className: 'h-4 w-4 shrink-0' };

  switch (kind) {
    case 'clock':
      return (
        <svg {...shared} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 1.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 1.5a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm.75 2.5h-1.5v4.3l3.4 2.04.78-1.3-2.68-1.6V5.5Z" />
        </svg>
      );
    case 'star':
      return (
        <svg {...shared} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="m10 1.75 2.67 5.41 5.97.87-4.32 4.2 1.02 5.96L10 15.4 4.66 18.2l1.02-5.96-4.32-4.2 5.97-.87L10 1.75Z" />
        </svg>
      );
    case 'support':
      return (
        <svg {...shared} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 1.5A8.5 8.5 0 0 0 1.5 10v3.5a2 2 0 0 0 2 2H5V9.5H3a7 7 0 1 1 14 0h-2V15h1.5a2 2 0 0 0 2-2V10A8.5 8.5 0 0 0 10 1.5Zm-1 11.5a1 1 0 0 0-1 1v1.5a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1V14a1 1 0 0 0-1-1H9Z" />
        </svg>
      );
    case 'award':
      return (
        <svg {...shared} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 1.5a6.5 6.5 0 0 0-2.9 12.3l-.7 4.2 3.6-1.9 3.6 1.9-.7-4.2A6.5 6.5 0 0 0 10 1.5Zm0 11a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z" />
        </svg>
      );
    case 'check':
      return (
        <svg {...shared} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 1.5A8.5 8.5 0 1 0 18.5 10 8.51 8.51 0 0 0 10 1.5Zm-1.1 11.1-2.8-2.8 1.1-1.1 1.7 1.7 4-4 1.1 1.1-5.1 5.1Z" />
        </svg>
      );
    case 'shield':
    default:
      return (
        <svg {...shared} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 1.5 3 4.5v5.1c0 3.8 2.6 7.2 7 8.9 4.4-1.7 7-5.1 7-8.9V4.5l-7-3Z" />
        </svg>
      );
  }
}

export function TrustBadges({ website, className = '', title, subtitle }: TrustBadgesProps) {
  const badges = (website.content.trust_signals ?? [])
    .map(normalizeSignal)
    .filter((signal): signal is TrustSignal => Boolean(signal));

  if (badges.length === 0) {
    return null;
  }

  return (
    <section className={className}>
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {badges.map((badge, index) => {
          const content = (
            <div
              className="flex items-start gap-3 rounded-2xl border p-4 transition-colors"
              style={{
                backgroundColor: 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <span
                className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent) 14%, var(--bg))',
                  color: 'var(--accent)',
                }}
              >
                <Icon kind={badge.icon} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium leading-5" style={{ color: 'var(--text-heading)' }}>
                  {badge.label}
                </span>
                {badge.description && (
                  <span className="mt-1 block text-sm leading-5" style={{ color: 'var(--text-secondary)' }}>
                    {badge.description}
                  </span>
                )}
              </span>
            </div>
          );

          if (badge.href) {
            return (
              <a key={`${badge.label}-${index}`} href={badge.href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent">
                {content}
              </a>
            );
          }

          return <div key={`${badge.label}-${index}`}>{content}</div>;
        })}
      </div>
    </section>
  );
}
