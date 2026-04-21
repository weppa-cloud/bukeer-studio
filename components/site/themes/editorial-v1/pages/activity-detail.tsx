/**
 * editorial-v1 — Activity detail page.
 *
 * Mounted by the `TemplateSlot` dispatcher when the website opts into
 * `editorial-v1`. Composes the existing `ProductLandingPage` body
 * (hero, gallery, pricing, meeting-point/circuit map, FAQ, WhatsApp
 * flow, SEO schemas) and layers editorial chrome on top — breadcrumbs,
 * an editorial "act-timeline-block" header, and highlights grid.
 *
 * Reused primitives:
 *   - p1/hero-split (inherited)
 *   - p1/gallery-strip (inherited)
 *   - p3/pricing-tiers (inherited)
 *   - p3/related-carousel (inherited)
 *   - p3/whatsapp-flow (inherited)
 *   - site/activity-circuit-map (inherited)
 *   - site/meeting-point-map (inherited fallback)
 *   - site/activity-schedule-inline (inherited inside the timeline)
 *   - editorial-v1 `Breadcrumbs`, `Eyebrow` primitives
 *
 * SEO: `ProductSchema` + `OrganizationSchema` + FAQ JSON-LD continue to
 * emit from the generic body. We do NOT re-emit them here.
 */

import type { ReactNode } from 'react';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { ProductData } from '@bukeer/website-contract';
import { Breadcrumbs } from '../primitives/breadcrumbs';
import { Eyebrow } from '../primitives/eyebrow';
import { sanitizeProductCopy } from '@/lib/products/normalize-product';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

export interface EditorialActivityDetailPayload {
  product: ProductData;
  basePath: string;
  displayName: string;
  displayLocation: string | null;
}

interface EditorialActivityDetailProps {
  website: WebsiteData;
  payload?: unknown;
  children?: ReactNode;
}

function normalizeHighlights(product: ProductData): string[] {
  const source = Array.isArray(product.highlights) ? product.highlights : [];
  return source
    .map((entry): string => {
      if (typeof entry === 'string') return sanitizeProductCopy(entry);
      if (entry && typeof entry === 'object') {
        const record = entry as Record<string, unknown>;
        const label = record.label;
        if (typeof label === 'string') return sanitizeProductCopy(label);
      }
      return '';
    })
    .filter((entry) => entry.length > 0)
    .slice(0, 8);
}

export function EditorialActivityDetail({
  website,
  payload,
  children,
}: EditorialActivityDetailProps) {
  const resolvedLocale =
    (website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale ??
    website.content?.locale ??
    website.default_locale ??
    'es-CO';
  const editorialText = getPublicUiExtraTextGetter(resolvedLocale);
  const resolvedPayload = payload as EditorialActivityDetailPayload | undefined;

  if (!resolvedPayload || !resolvedPayload.product) {
    return <>{children}</>;
  }

  const { product, basePath, displayName, displayLocation } = resolvedPayload;
  const highlights = normalizeHighlights(product);
  const durationLabel = product.duration
    ? sanitizeProductCopy(product.duration)
    : typeof product.duration_minutes === 'number'
      ? `${Math.round(product.duration_minutes / 60)}h`
      : null;

  const breadcrumbItems = [
    { label: editorialText('editorialBreadcrumbHome'), href: `${basePath}/` },
    { label: editorialText('editorialBreadcrumbActivities'), href: `${basePath}/actividades` },
    { label: displayName },
  ];

  return (
    <div
      data-template-set="editorial-v1"
      data-editorial-variant="activity-detail"
      className="editorial-activity-detail"
    >
      {/* Generic body: hero, gallery, pricing, meeting-point / circuit map,
          FAQ, reviews, WhatsApp flow, SEO schemas. */}
      {children}

      {/* Editorial overlay sections. */}
      <div className="mx-auto max-w-7xl px-6 pb-16 space-y-16">
        <section data-testid="editorial-activity-breadcrumbs" className="pt-4">
          <Breadcrumbs items={breadcrumbItems} />
          <div
            className="mt-3 flex flex-wrap items-center gap-3 text-sm"
            style={{ color: 'var(--c-ink-2)' }}
          >
            {durationLabel ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                style={{
                  background: 'var(--c-surface-2)',
                  color: 'var(--c-ink)',
                }}
              >
                ⏱ {durationLabel}
              </span>
            ) : null}
            {displayLocation ? (
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                style={{
                  background: 'var(--c-surface-2)',
                  color: 'var(--c-ink)',
                }}
              >
                {displayLocation}
              </span>
            ) : null}
          </div>
        </section>

        {highlights.length > 0 ? (
          <section
            data-testid="editorial-activity-highlights"
            className="act-timeline-block"
          >
            <div className="mb-4">
              <Eyebrow>{editorialText('editorialActivityHighlightsEyebrow')}</Eyebrow>
              <h2 className="mt-2 text-2xl font-bold">{editorialText('editorialActivityHighlightsTitle')}</h2>
            </div>
            <ul
              className="grid gap-3"
              style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}
            >
              {highlights.map((highlight, idx) => (
                <li
                  key={`highlight-${idx}-${highlight}`}
                  className="rounded-xl border p-4 text-sm"
                  style={{
                    background: 'var(--c-surface)',
                    borderColor: 'var(--c-line)',
                    color: 'var(--c-ink-2)',
                  }}
                >
                  {highlight}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}
