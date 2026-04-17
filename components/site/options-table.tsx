import type { ActivityOption, ActivityPrice } from '@bukeer/website-contract';

export interface OptionsTableProps {
  options?: Array<ActivityOption | null | undefined> | null;
  title?: string | null;
  subtitle?: string | null;
  className?: string;
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

function formatPrice(price: ActivityPrice): string {
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: price.currency,
      maximumFractionDigits: 0,
    }).format(price.price);
  } catch {
    return `${price.price} ${price.currency}`;
  }
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
                  Option
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>
                  Pricing
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>
                  Units
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>
                  Refundable
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: 'var(--text-secondary)' }}>
                  Prices
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
                    <div className="space-y-1">
                      <div className="font-medium leading-6" style={{ color: 'var(--text-heading)' }}>
                        {option.name}
                      </div>
                      <div className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
                        {option.id}
                      </div>
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
                      {option.pricing_per}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="flex flex-wrap gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      {typeof option.min_units === 'number' && (
                        <span className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)' }}>
                          Min {option.min_units}
                        </span>
                      )}
                      {typeof option.max_units === 'number' && (
                        <span className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)' }}>
                          Max {option.max_units}
                        </span>
                      )}
                      {option.start_times && option.start_times.length > 0 && (
                        <span className="rounded-full px-2.5 py-0.5" style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)' }}>
                          {option.start_times.length} start times
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
                      {option.is_refundable ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-4 align-top">
                    <div className="space-y-2">
                      {option.prices.map((price, priceIndex) => (
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
                              {formatPrice(price)}
                            </span>
                            <span className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
                              {price.unit_type_code}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {price.season}
                            </span>
                          </div>
                          {(price.valid_from || price.valid_until) && (
                            <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                              {[price.valid_from, price.valid_until].filter(Boolean).join(' to ')}
                            </div>
                          )}
                        </div>
                      ))}
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
