import type { TrustCertification, TrustContent, WebsiteData } from '@bukeer/website-contract';

type TrustSignalIcon = 'shield' | 'clock' | 'star' | 'support' | 'check' | 'award' | 'users' | 'badge';

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
      trust?: TrustContent;
    };
  };
  className?: string;
  title?: string | null;
  subtitle?: string | null;
}

const DEFAULT_TRUST_SIGNALS: TrustSignal[] = [
  {
    label: 'RNT vigente',
    description: 'Operador turístico con registro activo.',
    icon: 'check',
  },
  {
    label: 'Afiliados al sector',
    description: 'Alianzas con operadores y proveedores confiables.',
    icon: 'award',
  },
  {
    label: 'Años de experiencia',
    description: 'Equipo local con trayectoria diseñando viajes en Colombia.',
    icon: 'clock',
  },
];

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

function formatTravelers(count: number, locale: string): string {
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(count);
  } catch {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(count);
  }
}

function trustContentToSignals(trust: TrustContent | undefined, locale: string): TrustSignal[] {
  if (!trust) return [];

  const signals: TrustSignal[] = [];

  if (trust.rnt_number && trust.rnt_number.trim().length > 0) {
    signals.push({
      label: `RNT ${trust.rnt_number.trim()}`,
      description: 'Registro Nacional de Turismo activo.',
      icon: 'check',
    });
  }

  if (typeof trust.years_active === 'number' && trust.years_active > 0 && trust.years_active <= 100) {
    signals.push({
      label: `${trust.years_active} años activos`,
      description: 'Equipo local con trayectoria diseñando viajes.',
      icon: 'clock',
    });
  }

  if (typeof trust.travelers_count === 'number' && trust.travelers_count > 0) {
    const formatted = formatTravelers(trust.travelers_count, locale);
    signals.push({
      label: `${formatted}+ viajeros`,
      description: 'Clientes que ya viajaron con nosotros.',
      icon: 'users',
    });
  }

  if (trust.insurance_provider && trust.insurance_provider.trim().length > 0) {
    signals.push({
      label: `Asistencia ${trust.insurance_provider.trim()}`,
      description: 'Cobertura de asistencia al viajero incluida.',
      icon: 'shield',
    });
  }

  const certifications = Array.isArray(trust.certifications) ? trust.certifications.filter(isValidCertification) : [];
  if (certifications.length > 0) {
    signals.push({
      label: certifications.map((c) => c.label).join(' · '),
      description: 'Certificaciones y afiliaciones sectoriales.',
      icon: 'badge',
    });
  }

  return signals;
}

function isValidCertification(cert: TrustCertification | null | undefined): cert is TrustCertification {
  if (!cert || typeof cert !== 'object') return false;
  const code = typeof cert.code === 'string' ? cert.code.trim() : '';
  const label = typeof cert.label === 'string' ? cert.label.trim() : '';
  return code.length > 0 && label.length > 0;
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
    case 'users':
      return (
        <svg {...shared} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M7 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm6 0a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM2 16.25C2 13.35 4.24 11 7 11s5 2.35 5 5.25V17H2v-.75ZM13.5 17v-.75c0-1.65-.53-3.18-1.44-4.41.62-.22 1.27-.34 1.94-.34 2.21 0 4 1.79 4 4V17h-4.5Z" />
        </svg>
      );
    case 'badge':
      return (
        <svg {...shared} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10 1.5 2.5 5v5.5c0 4.2 3.2 7.5 7.5 8 4.3-.5 7.5-3.8 7.5-8V5L10 1.5Zm-1.1 10.8L5.6 9l1.1-1.1 2.2 2.2 4.3-4.3 1.1 1.1-5.4 5.4Z" />
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
  const locale = website.content.locale || website.default_locale || 'es-CO';

  const dataSignals = trustContentToSignals(website.content.trust, locale);

  const legacySignals = (website.content.trust_signals ?? [])
    .map(normalizeSignal)
    .filter((signal): signal is TrustSignal => Boolean(signal));

  const resolvedBadges = dataSignals.length > 0
    ? dataSignals
    : legacySignals.length > 0
      ? legacySignals
      : DEFAULT_TRUST_SIGNALS;

  return (
    <section data-testid="section-trust-badges" className={className}>
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
        {resolvedBadges.map((badge, index) => {
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
