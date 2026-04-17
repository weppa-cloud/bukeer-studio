import type { ActivityOption, ActivityPrice } from '@bukeer/website-contract';
import { formatPriceOrConsult } from '@/lib/products/format-price';

export interface OptionsTableProps {
  options?: Array<ActivityOption | null | undefined> | null;
  title?: string | null;
  subtitle?: string | null;
  className?: string;
}

/** Hide placeholder/sentinel date ranges that represent "always valid" in admin data. */
const PLACEHOLDER_DATES = new Set(['2000-01-01', '2099-12-31', '1970-01-01', '9999-12-31']);

function formatValidityRange(from?: string | null, until?: string | null): string | null {
  const fromValid = from && !PLACEHOLDER_DATES.has(from) ? from : null;
  const untilValid = until && !PLACEHOLDER_DATES.has(until) ? until : null;
  if (!fromValid && !untilValid) return null;
  if (fromValid && untilValid) return `${fromValid} → ${untilValid}`;
  return fromValid ? `Desde ${fromValid}` : `Hasta ${untilValid}`;
}

function formatSeason(season?: string | null): string | null {
  if (!season) return null;
  const normalized = season.trim().toLowerCase();
  if (!normalized || normalized === 'default' || normalized === 'standard' || normalized === 'all') return null;
  return season;
}

function formatUnitType(code?: string | null): string | null {
  if (!code) return null;
  const normalized = code.trim().toUpperCase();
  const map: Record<string, string> = {
    ADULT: 'Adulto',
    CHILD: 'Niño',
    INFANT: 'Infante',
    SENIOR: 'Adulto mayor',
    STUDENT: 'Estudiante',
    PAX: 'Por persona',
  };
  return map[normalized] || code;
}

function formatPricingPer(code?: string | null): string {
  if (code === 'UNIT') return 'Por persona';
  if (code === 'BOOKING') return 'Por reserva';
  return code || '—';
}

function normalizeOption(option: ActivityOption | null | undefined): ActivityOption | null {
  if (!option || typeof option !== 'object') {
    return null;
  }

  const name = typeof option.name === 'string' ? option.name.trim() : '';
  const id = typeof option.id === 'string' ? option.id.trim() : '';
  const pricingPer = option.pricing_per === 'UNIT' || option.pricing_per === 'BOOKING' ? option.pricing_per : null;
  const prices = Array.isArray(option.prices)
    ? option.prices.filter((price): price is ActivityPrice => Boolean(price && typeof price === 'object' && typeof price.currency === 'string'))
    : [];

  if (!id || !name || !pricingPer || prices.length === 0) {
    return null;
  }

  return {
    ...option,
    id,
    name,
    pricing_per: pricingPer,
    prices,
  };
}

function formatOptionPrice(price: ActivityPrice): string {
  return formatPriceOrConsult(price.price, price.currency);
}

export function OptionsTable({
  options,
  title,
  subtitle,
  className = '',
}: OptionsTableProps) {
  const items = (options ?? [])
    .map(normalizeOption)
    .filter((item): item is ActivityOption => Boolean(item));

  if (items.length === 0) {
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

      <div className="overflow-hidden rounded-2xl border" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 6%, var(--bg-card))' }}>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>
                  Opción
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>
                  Modalidad
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>
                  Detalles
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>
                  Reembolso
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>
                  Precio
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((option, index) => (
                <tr
                  key={option.id}
                  className={index > 0 ? 'border-t' : ''}
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <td className="px-4 py-4 align-top">
                    <div className="font-medium leading-6" style={{ color: 'var(--text-heading)' }}>
                      {option.name}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span
                      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: 'color-mix(in srgb, var(--accent) 10%, var(--bg))',
                        color: 'var(--accent)',
                      }}
                    >
                      {formatPricingPer(option.pricing_per)}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {typeof option.min_units === 'number' && (
                        <span className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)' }}>
                          Mín. {option.min_units}
                        </span>
                      )}
                      {typeof option.max_units === 'number' && (
                        <span className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)' }}>
                          Máx. {option.max_units}
                        </span>
                      )}
                      {option.start_times && option.start_times.length > 0 && (
                        <span className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)' }}>
                          {option.start_times.length} horarios
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <span
                      className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                      style={{
                        backgroundColor: option.is_refundable
                          ? 'color-mix(in srgb, var(--accent) 12%, var(--bg))'
                          : 'color-mix(in srgb, var(--text-secondary) 12%, var(--bg))',
                        color: option.is_refundable ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >
                      {option.is_refundable ? 'Sí' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="space-y-2">
                      {option.prices.map((price, priceIndex) => {
                        const validity = formatValidityRange(price.valid_from, price.valid_until);
                        const seasonLabel = formatSeason(price.season);
                        const unitLabel = formatUnitType(price.unit_type_code);
                        return (
                          <div
                            key={`${option.id}-${price.unit_type_code}-${price.season}-${priceIndex}`}
                            className="rounded-xl border px-3 py-2"
                            style={{
                              backgroundColor: 'color-mix(in srgb, var(--accent) 4%, var(--bg-card))',
                              borderColor: 'var(--border-subtle)',
                            }}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
                                {formatOptionPrice(price)}
                              </span>
                              {unitLabel && (
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                  {unitLabel}
                                </span>
                              )}
                              {seasonLabel && (
                                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                  {seasonLabel}
                                </span>
                              )}
                            </div>
                            {validity && (
                              <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                                {validity}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
