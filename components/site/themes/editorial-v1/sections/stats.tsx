/**
 * editorial-v1 Stats band (standalone).
 *
 * Port of designer `Stats` in
 *   themes/references/claude design 1/project/sections.jsx
 *
 * Horizontal row of 4 metric cells separated by vertical rules, top + bottom
 * hairlines. Each cell = big number (with optional suffix rendered in serif
 * italic) + short caption label.
 *
 * Dynamic data flow:
 *   - If `content.metrics` is present we use those values verbatim.
 *   - Else, if `content.brandClaims` is present (injected by Wave 2.7 hydration
 *     for `stats` section type), we derive metrics from it.
 *   - Else, we fall back to conservative editorial defaults so the section
 *     never renders empty.
 *
 * Number animation: we use the shared `NumberTicker` client leaf to animate
 * whole-number cells on viewport-enter. Decimal cells (e.g. 4.9 rating) also
 * use NumberTicker with `decimalPlaces=1`. Suffix characters (+, %, /5) are
 * appended inside the `<em>` so they pick up the accent-serif color.
 *
 * Server component — the only client boundary is `NumberTicker`.
 */

import type { ReactElement } from 'react';
import type { BrandClaims } from '@bukeer/website-contract';

import type { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { NumberTicker } from '@/components/ui/number-ticker';

import { Eyebrow } from '../primitives/eyebrow';

export interface EditorialStatsSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface StatsMetric {
  value?: number | string;
  prefix?: string;
  suffix?: string;
  label?: string;
  decimals?: number;
}

interface StatsContent {
  eyebrow?: string;
  title?: string;
  metrics?: StatsMetric[];
  brandClaims?: BrandClaims | null;
}

const DEFAULT_METRICS: StatsMetric[] = [
  { value: 500, suffix: '+', label: 'Viajeros felices' },
  { value: 50, suffix: '+', label: 'Destinos' },
  { value: 10, label: 'Años de experiencia' },
  { value: 98, suffix: '%', label: 'Satisfacción' },
];

function deriveFromBrandClaims(claims: BrandClaims): StatsMetric[] {
  const metrics: StatsMetric[] = [];

  if (typeof claims.yearsInOperation === 'number' && claims.yearsInOperation > 0) {
    metrics.push({ value: claims.yearsInOperation, label: 'años' });
  }
  if (typeof claims.totalPackages === 'number' && claims.totalPackages > 0) {
    metrics.push({ value: claims.totalPackages, label: 'paquetes' });
  }
  if (typeof claims.totalDestinations === 'number' && claims.totalDestinations > 0) {
    metrics.push({ value: claims.totalDestinations, label: 'destinos' });
  }
  if (typeof claims.totalBookings === 'number' && claims.totalBookings > 0) {
    metrics.push({ value: claims.totalBookings, suffix: '+', label: 'viajeros' });
  }
  if (typeof claims.avgRating === 'number' && claims.avgRating > 0) {
    metrics.push({
      value: claims.avgRating,
      suffix: '/5',
      label: 'rating',
      decimals: 1,
    });
  }

  return metrics.slice(0, 4);
}

function parseNumericValue(raw: number | string | undefined): {
  value: number;
  trailingSuffix: string;
} {
  if (typeof raw === 'number') return { value: raw, trailingSuffix: '' };
  if (typeof raw !== 'string') return { value: 0, trailingSuffix: '' };
  const match = raw.match(/^([0-9]+(?:[.,][0-9]+)?)\s*(.*)$/);
  if (!match) return { value: 0, trailingSuffix: raw };
  const numeric = parseFloat(match[1].replace(/,/g, ''));
  return {
    value: Number.isFinite(numeric) ? numeric : 0,
    trailingSuffix: match[2] ?? '',
  };
}

export function StatsSection({
  section,
}: EditorialStatsSectionProps): ReactElement {
  const content = (section.content || {}) as StatsContent;

  let metrics: StatsMetric[] = Array.isArray(content.metrics)
    ? content.metrics.filter((m): m is StatsMetric => !!m && m.value !== undefined && m.value !== null)
    : [];

  if (metrics.length === 0 && content.brandClaims) {
    metrics = deriveFromBrandClaims(content.brandClaims);
  }

  if (metrics.length === 0) {
    metrics = DEFAULT_METRICS;
  }

  const eyebrow = content.eyebrow?.trim() || '';
  const title = content.title?.trim() || '';
  const hasHead = eyebrow.length > 0 || title.length > 0;

  return (
    <section
      className="ev-section ev-stats"
      data-screen-label="Stats"
      style={{ paddingTop: 40, paddingBottom: 40 }}
    >
      <div className="ev-container">
        {hasHead ? (
          <header className="ev-stats-head">
            {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
            {title ? (
              <h2
                className="display-md"
                style={{ margin: '12px auto 0', maxWidth: '20ch' }}
              >
                {title}
              </h2>
            ) : null}
          </header>
        ) : null}

        <div className="stats-row" role="list">
          {metrics.map((metric, i) => {
            const { value: numericValue, trailingSuffix } = parseNumericValue(metric.value);
            const decimals =
              typeof metric.decimals === 'number'
                ? metric.decimals
                : numericValue % 1 !== 0
                ? 1
                : 0;
            const suffix = metric.suffix ?? trailingSuffix ?? '';

            return (
              <div className="stat" role="listitem" key={`${metric.label}-${i}`}>
                <div className="stat-num">
                  {metric.prefix ? <span>{metric.prefix}</span> : null}
                  <NumberTicker
                    value={numericValue}
                    decimalPlaces={decimals}
                    delay={0.15 + i * 0.1}
                    className=""
                  />
                  {suffix ? <em>{suffix}</em> : null}
                </div>
                <div className="stat-label">{metric.label ?? ''}</div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default StatsSection;
