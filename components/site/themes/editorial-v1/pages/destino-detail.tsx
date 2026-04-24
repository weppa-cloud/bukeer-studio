/**
 * editorial-v1 — <EditorialDestinoDetailPage />
 *
 * Replaces the generic `/destinos/[slug]` body when the website opts into
 * `editorial-v1` (wired via `TemplateSlot name="destino-detail"`).
 *
 * Visual spec ported from designer `DestinationPageF1` in
 *   themes/references/claude design 1/project/pages.jsx
 * + copy catalog page-hero conventions.
 *
 * Rendered sections (conditional on data presence):
 *   1. Ink hero with destination image + breadcrumbs + h1 + intro.
 *   2. Quick-facts band (region / hotels / experiencias / altitude / airport).
 *   3. Long description (destination_seo_overrides or derived fallback).
 *   4. "Qué hacer" grid of activities associated with the destination.
 *   5. "Dónde dormir" grid of hotels.
 *   6. "Paquetes que visitan X" grid of packages.
 *   7. Colombia silhouette zoomed with a single pin.
 *   8. Related destinations (same region, exclude current).
 *   9. CTA band — "Cotiza un viaje a {destino}".
 *   10. JSON-LD (TouristDestination + BreadcrumbList).
 *
 * Data: consumes payload assembled by `[...slug]/page.tsx` — no new RPCs.
 */

import type { ReactElement } from 'react';
import Image from 'next/image';
import Link from 'next/link';

import type { WebsiteData } from '@/lib/supabase/get-website';
import type { DestinationData } from '@/lib/supabase/get-pages';
import type { ProductData } from '@bukeer/website-contract';
import { getBasePath } from '@/lib/utils/base-path';
import {
  resolveColombiaRegion,
  type ColombiaRegion,
} from '@/lib/maps/colombia-cities';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

import { Breadcrumbs } from '../primitives/breadcrumbs';
import { Eyebrow } from '../primitives/eyebrow';
import { Icons } from '../primitives/icons';
import { ColombiaMapStandalone } from '../maps/colombia-map-standalone.client';
import { WaflowCTAButton } from '../waflow/cta-button';
import { editorialHtml } from '../primitives/rich-heading';

// ----- payload -----
export interface EditorialDestinoDetailPayload {
  destination: DestinationData;
  products: ProductData[];
  relatedDestinations?: DestinationData[];
  /** SEO/editorial overlay: `destination_seo_overrides` row when present. */
  seoOverride?: {
    custom_description?: string | null;
    custom_seo_title?: string | null;
    custom_seo_description?: string | null;
  } | null;
  /** Optional WhatsApp number (derived from `website.social.whatsapp`). */
  whatsapp?: string | null;
}

interface EditorialDestinoDetailProps {
  website: WebsiteData;
  payload?: unknown;
}

// ----- helpers -----
function resolveRegion(dest: DestinationData): ColombiaRegion | undefined {
  return resolveColombiaRegion({
    state: dest.state,
    name: dest.name,
    lat: Number.isFinite(dest.lat) ? dest.lat : null,
    lng: Number.isFinite(dest.lng) ? dest.lng : null,
  });
}

function interpolate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_m, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : `{${key}}`,
  );
}

// ----- card (inline, no new primitive) -----
function RelatedCard({
  href,
  image,
  subtitle,
  title,
}: {
  href: string;
  image: string | null | undefined;
  subtitle: string | null;
  title: string;
}) {
  return (
    <Link href={href} className="ev-related-card">
      <div className="media">
        {image ? (
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 720px) 88vw, (max-width: 1100px) 45vw, 320px"
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'linear-gradient(135deg, var(--c-ink), var(--c-primary) 60%, var(--c-ink-2))',
            }}
          />
        )}
      </div>
      <div className="body">
        {subtitle ? <small>{subtitle}</small> : null}
        <h3>{title}</h3>
      </div>
    </Link>
  );
}

// ----- main -----
export function EditorialDestinoDetailPage({
  website,
  payload,
}: EditorialDestinoDetailProps): ReactElement | null {
  const resolvedLocale =
    (website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale ??
    website.content?.locale ??
    website.default_locale ??
    'es-CO';
  const editorialText = getPublicUiExtraTextGetter(resolvedLocale);
  const resolved = payload as EditorialDestinoDetailPayload | undefined;
  if (!resolved || !resolved.destination) return null;

  const { destination, products, relatedDestinations, seoOverride, whatsapp } =
    resolved;

  const basePath = getBasePath(website.subdomain, Boolean(website.custom_domain));
  const siteName =
    website.content?.account?.name ||
    website.content?.siteName ||
    website.subdomain;

  const region = resolveRegion(destination);
  const packages = (products ?? []).filter((p) => p.type === 'package');
  const activities = (products ?? []).filter((p) => p.type === 'activity');
  const hotels = (products ?? []).filter((p) => p.type === 'hotel');

  const heroImage = destination.image || null;

  const longDescription =
    (typeof seoOverride?.custom_description === 'string' &&
      seoOverride.custom_description.trim()) ||
    (typeof seoOverride?.custom_seo_description === 'string' &&
      seoOverride.custom_seo_description.trim()) ||
    `Descubre ${destination.name}${
      destination.state ? `, ${destination.state}` : ''
    }. Un destino con ${destination.hotel_count} hoteles y ${destination.activity_count} actividades seleccionadas por nuestros planners locales.`;

  const intro = `${destination.state ? `${destination.state} · ` : ''}${
    destination.hotel_count
  } hoteles · ${destination.activity_count} experiencias`;

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${website.subdomain}.bukeer.com`;

  const jsonLdTouristDestination = {
    '@context': 'https://schema.org',
    '@type': 'TouristDestination',
    name: destination.name,
    url: `${baseUrl}/destinos/${destination.slug}`,
    description: longDescription,
    ...(heroImage ? { image: heroImage } : {}),
    ...(Number.isFinite(destination.lat) && Number.isFinite(destination.lng)
      ? {
          geo: {
            '@type': 'GeoCoordinates',
            latitude: destination.lat,
            longitude: destination.lng,
          },
        }
      : {}),
  };
  const jsonLdBreadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: editorialText('editorialBreadcrumbHome'),
        item: baseUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: editorialText('editorialDestinoBreadcrumbDestinos'),
        item: `${baseUrl}/destinos`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: destination.name,
      },
    ],
  };

  // Pin for Colombia silhouette when lat/lng available.
  const pin =
    Number.isFinite(destination.lat) && Number.isFinite(destination.lng)
      ? [
          {
            id: `dest-${destination.slug || destination.id}`,
            lat: Number(destination.lat),
            lng: Number(destination.lng),
            label: destination.name,
            region,
          },
        ]
      : [];

  // Dedupe related destinations (same region, exclude current, max 4).
  const related = (relatedDestinations ?? [])
    .filter((d) => d.slug !== destination.slug)
    .filter((d) => {
      const r = resolveRegion(d);
      return r && region && r === region;
    })
    .slice(0, 4);

  const whatsappHref = whatsapp
    ? `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
        `Hola! Quiero cotizar un viaje a ${destination.name}.`,
      )}`
    : null;
  const waflowDestination = {
    slug: destination.slug || destination.id,
    name: destination.name,
    region: destination.state || undefined,
    heroImageUrl: heroImage,
  };

  return (
    <div
      data-screen-label="DestinoDetail"
      data-testid="editorial-destino-detail"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdTouristDestination),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLdBreadcrumbs),
        }}
      />

      {/* Hero */}
      <section className="page-hero" data-testid="destino-hero">
        <div className="ev-dest-hero-media" aria-hidden="true">
          {heroImage ? (
            <Image
              src={heroImage}
              alt={`Vista de ${destination.name}`}
              fill
              priority
              sizes="100vw"
            />
          ) : null}
        </div>
        <div className="ev-dest-hero-wash" />
        <div className="ev-container ev-dest-hero-meta">
          <Breadcrumbs
            tone="inverse"
            className="pkg-hero-breadcrumb"
            items={[
              {
                label: editorialText('editorialBreadcrumbHome'),
                href: basePath || '/',
              },
              {
                label: editorialText('editorialDestinoBreadcrumbDestinos'),
                href: `${basePath}/destinos`,
              },
              { label: destination.name },
            ]}
          />
          <h1 className="display-lg">
            <span dangerouslySetInnerHTML={editorialHtml(destination.name) || { __html: destination.name }} />
            {destination.state ? (
              <>
                {' '}
                <em>— {destination.state}</em>
              </>
            ) : null}
          </h1>
          <p className="ev-dest-hero-intro">{intro}</p>
        </div>
      </section>

      {/* Content */}
      <section className="section" style={{ paddingTop: 48 }}>
        <div className="ev-container">
          {/* Quick facts */}
          <div className="ev-quick-facts" data-testid="destino-quick-facts">
            {region ? (
              <div>
                <small>{editorialText('editorialDestinoQuickFactRegion')}</small>
                <strong style={{ textTransform: 'capitalize' }}>{region}</strong>
              </div>
            ) : null}
            {destination.hotel_count > 0 ? (
              <div>
                <small>{editorialText('editorialDestinoQuickFactHotels')}</small>
                <strong>{destination.hotel_count}</strong>
              </div>
            ) : null}
            {destination.activity_count > 0 ? (
              <div>
                <small>
                  {editorialText('editorialDestinoQuickFactActivities')}
                </small>
                <strong>{destination.activity_count}</strong>
              </div>
            ) : null}
            {destination.state ? (
              <div>
                <small>{editorialText('editorialDestinoQuickFactAirport')}</small>
                <strong>{destination.state}</strong>
              </div>
            ) : null}
          </div>

          {/* About */}
          <section className="ev-dest-section" data-testid="destino-about">
            <h2>
              {editorialText('editorialDestinoAboutTitle')}{' '}
              <em>{destination.name}.</em>
            </h2>
            <p className="body-lg" style={{ maxWidth: '62ch' }}>
              {longDescription}
            </p>
          </section>

          {/* Activities */}
          {activities.length > 0 ? (
            <section
              className="ev-dest-section"
              data-testid="destino-activities"
            >
              <Eyebrow>
                {editorialText('editorialDestinoActivitiesTitle')}
              </Eyebrow>
              <h2>
                {editorialText('editorialDestinoActivitiesTitle')}{' '}
                <em>
                  {interpolate(
                    editorialText('editorialDestinoActivitiesEmphasis'),
                    { name: destination.name },
                  )}
                </em>
              </h2>
              <div className="ev-related-grid">
                {activities.slice(0, 6).map((a) => (
                  <RelatedCard
                    key={a.id}
                    href={`${basePath}/actividades/${encodeURIComponent(
                      a.slug || a.id,
                    )}`}
                    image={a.image ?? null}
                    subtitle={a.location ?? destination.name}
                    title={a.name}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* Hotels */}
          {hotels.length > 0 ? (
            <section className="ev-dest-section" data-testid="destino-hotels">
              <Eyebrow>
                {editorialText('editorialDestinoHotelsTitle')}
              </Eyebrow>
              <h2>
                {editorialText('editorialDestinoHotelsTitle')}{' '}
                <em>
                  {interpolate(
                    editorialText('editorialDestinoHotelsEmphasis'),
                    { name: destination.name },
                  )}
                </em>
              </h2>
              <div className="ev-related-grid">
                {hotels.slice(0, 6).map((h) => (
                  <RelatedCard
                    key={h.id}
                    href={`${basePath}/hoteles/${encodeURIComponent(
                      h.slug || h.id,
                    )}`}
                    image={h.image ?? null}
                    subtitle={h.location ?? destination.name}
                    title={h.name}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* Packages */}
          {packages.length > 0 ? (
            <section
              className="ev-dest-section"
              data-testid="destino-packages"
            >
              <Eyebrow>
                {editorialText('editorialDestinoPackagesTitle')}
              </Eyebrow>
              <h2>
                {editorialText('editorialDestinoPackagesTitle')}{' '}
                <em>
                  {interpolate(
                    editorialText('editorialDestinoPackagesEmphasis'),
                    { name: destination.name },
                  )}
                </em>
              </h2>
              <div className="ev-related-grid">
                {packages.slice(0, 6).map((p) => (
                  <RelatedCard
                    key={p.id}
                    href={`${basePath}/paquetes/${encodeURIComponent(
                      p.slug || p.id,
                    )}`}
                    image={p.image ?? null}
                    subtitle={p.location ?? destination.name}
                    title={p.name}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* Colombia map */}
          {pin.length > 0 ? (
            <section className="ev-dest-section" data-testid="destino-map">
              <h2>
                {editorialText('editorialDestinoMapTitle')}{' '}
                <em>{destination.name}.</em>
              </h2>
              <ColombiaMapStandalone
                pins={pin}
                activePinId={pin[0].id}
                highlightedRegions={region ? [region] : []}
                height={420}
                ariaLabel={`Mapa de Colombia mostrando ${destination.name}`}
              />
            </section>
          ) : null}

          {/* Related destinations */}
          {related.length > 0 ? (
            <section
              className="ev-dest-section"
              data-testid="destino-related"
            >
              <h2>
                {editorialText('editorialDestinoRelatedTitle')}{' '}
                <em>{editorialText('editorialDestinoRelatedEmphasis')}</em>
              </h2>
              <div className="ev-related-grid">
                {related.map((d) => (
                  <RelatedCard
                    key={d.id}
                    href={`${basePath}/destinos/${encodeURIComponent(
                      d.slug || d.id,
                    )}`}
                    image={d.image ?? null}
                    subtitle={d.state ?? null}
                    title={d.name}
                  />
                ))}
              </div>
            </section>
          ) : null}

          {/* CTA */}
          <div className="ev-dest-cta" data-testid="destino-cta">
            <h2>
              {editorialText('editorialDestinoCtaTitle')}{' '}
              <em>{destination.name}.</em>
            </h2>
            <p>
              {interpolate(editorialText('editorialDestinoCtaBody'), {
                name: destination.name,
              })}
            </p>
            <div className="ev-dest-cta-actions">
              <Link
                href={`${basePath}/contacto`}
                className="btn btn-primary"
              >
                {editorialText('editorialDestinoCtaPrimary')}{' '}
                <Icons.arrow size={14} />
              </Link>
              {whatsappHref ? (
                <WaflowCTAButton
                  variant="B"
                  destination={waflowDestination}
                  fallbackHref={whatsappHref}
                  className="btn btn-outline"
                >
                  <Icons.whatsapp size={14} />{' '}
                  {editorialText('editorialDestinoCtaSecondary')}
                </WaflowCTAButton>
              ) : null}
            </div>
            <p style={{ marginTop: 18, fontSize: 12, color: 'var(--c-muted)' }}>
              {siteName}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default EditorialDestinoDetailPage;
