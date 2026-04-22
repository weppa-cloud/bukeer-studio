/**
 * /site/[subdomain]/experiencias — editorial experiences page.
 *
 * The page pulls activities via `getCategoryProducts` (same SSR RPC used by
 * the home grid + `/actividades` listing), so it always reflects the full
 * `website_product_pages` catalog instead of whatever was baked into the
 * authored `activities` section payload. Authored overrides on
 * `section.content.activities` still win when present (editorial seed).
 *
 * When the tenant opts into `editorial-v1`, `TemplateSlot` renders the
 * editorial variant from `components/site/themes/editorial-v1/pages/experiences.tsx`.
 * Otherwise the fallback renders a minimal listing so non-editorial sites
 * still return a usable page.
 */

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';
import { getCategoryProducts } from '@/lib/supabase/get-pages';
import { toActivityItems } from '@/lib/products/to-items';
import {
  buildLocaleAwareAlternateLanguages,
  resolvePublicMetadataLocale,
} from '@/lib/seo/public-metadata';
import { localeToOgLocale } from '@/lib/seo/locale-routing';
import { resolveOgImage } from '@/lib/seo/og-helpers';
import { TemplateSlot } from '@/components/site/themes/editorial-v1/template-slot';
import type { ExperienceItem } from '@/components/site/themes/editorial-v1/pages/experiences-grid.client';
import { ExperiencesFallbackClient } from './experiences-fallback.client';

interface ExperiencesPageProps {
  params: Promise<{ subdomain: string }>;
  searchParams: Promise<{
    level?: string;
    region?: string;
    location?: string;
    category?: string;
    duration?: string;
    sort?: string;
    q?: string;
  }>;
}

const PAGE_TITLE = 'Experiencias';
const PAGE_DESCRIPTION =
  'Actividades para sumar a tu viaje. Oficios, caminatas, cocina, mar, selva.';

export async function generateMetadata({
  params,
}: ExperiencesPageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);
  if (!website) {
    return { title: PAGE_TITLE };
  }
  const siteName = website.content?.account?.name || website.content?.siteName || subdomain;
  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const localeContext = await resolvePublicMetadataLocale(website, '/experiencias');
  const canonical = `${baseUrl}${localeContext.localizedPathname}`;
  const languages = buildLocaleAwareAlternateLanguages(
    baseUrl,
    '/experiencias',
    localeContext,
  );
  const ogImage = resolveOgImage(website);

  return {
    title: `${PAGE_TITLE} — ${siteName}`,
    description: PAGE_DESCRIPTION,
    alternates: { canonical, languages },
    openGraph: {
      title: `${PAGE_TITLE} — ${siteName}`,
      description: PAGE_DESCRIPTION,
      url: canonical,
      siteName,
      locale: localeToOgLocale(localeContext.resolvedLocale),
      type: 'website',
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
  };
}

function toArrayParam(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function normaliseActivities(raw: unknown[]): ExperienceItem[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r): ExperienceItem | null => {
      if (!r || typeof r !== 'object') return null;
      const obj = r as Record<string, unknown>;
      const id = typeof obj.id === 'string' ? obj.id : null;
      const name =
        (typeof obj.name === 'string' && obj.name) ||
        (typeof obj.title === 'string' && (obj.title as string)) ||
        null;
      if (!id || !name) return null;
      return {
        id,
        slug: (obj.slug as string | undefined) ?? null,
        name,
        title: (obj.title as string | undefined) ?? null,
        description: (obj.description as string | undefined) ?? null,
        image:
          (obj.image as string | undefined) ??
          (Array.isArray(obj.images) && typeof obj.images[0] === 'string'
            ? (obj.images[0] as string)
            : null),
        location: (obj.location as string | undefined) ?? null,
        region:
          (obj.region as string | undefined) ??
          (obj.destination as string | undefined) ??
          null,
        category: (obj.category as string | undefined) ?? null,
        categoryKey: (obj.categoryKey as string | undefined) ?? null,
        level:
          (obj.level as string | undefined) ??
          (obj.difficulty as string | undefined) ??
          null,
        durationLabel: (obj.duration as string | undefined) ?? null,
        durationBucket: (obj.durationBucket as string | undefined) ?? null,
        price: (obj.price as string | undefined) ?? null,
        rating: (obj.rating as number | undefined) ?? null,
        reviewCount: (obj.reviewCount as number | undefined) ?? null,
        lat: (obj.lat as number | undefined) ?? null,
        lng: (obj.lng as number | undefined) ?? null,
      };
    })
    .filter((item): item is ExperienceItem => item !== null);
}

export default async function ExperiencesPageRoute({
  params,
  searchParams,
}: ExperiencesPageProps) {
  const { subdomain } = await params;
  const sp = await searchParams;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website || website.status !== 'published') {
    notFound();
  }

  const localeContext = await resolvePublicMetadataLocale(website, '/experiencias');

  // Prefer an authored override on the `activities` section (editorial seed
  // with curated ordering/copy). Fall back to the full catalog via the same
  // RPC used by the home grid + `/actividades` listing. This keeps the
  // "Experiencias" route in parity with the DB even when the tenant never
  // authored a section payload — previously we only read from the section
  // which resulted in "0 de 0" for sites like ColombiaTours.
  const activitiesSection = (website.sections || []).find(
    (s) => s.section_type === 'activities' && s.is_enabled !== false,
  );
  const authoredActivities = Array.isArray(
    (activitiesSection?.content as Record<string, unknown> | undefined)?.activities,
  )
    ? ((activitiesSection!.content as Record<string, unknown>).activities as unknown[])
    : [];

  let activities: ExperienceItem[];
  if (authoredActivities.length > 0) {
    activities = normaliseActivities(authoredActivities);
  } else {
    const catalog = await getCategoryProducts(subdomain, 'activities', {
      limit: 100,
      offset: 0,
      locale: localeContext.resolvedLocale,
      defaultLocale: localeContext.defaultLocale ?? 'es-CO',
      websiteId: String(website.id),
    });
    // toActivityItems returns the canonical editorial shape (name, image,
    // duration, price, location, rating...), which normaliseActivities then
    // narrows into `ExperienceItem` defensively.
    activities = normaliseActivities(toActivityItems(catalog.items, 0));
  }

  return (
    <TemplateSlot
      name="experiences-page"
      website={website}
      payload={{
        subdomain,
        locale: localeContext.resolvedLocale,
        activities,
        initialFilters: {
          level: toArrayParam(sp.level),
          region: toArrayParam(sp.region),
          location: toArrayParam(sp.location),
          category: sp.category || 'all',
          duration: sp.duration || 'all',
          sort: sp.sort || 'popular',
          q: sp.q || '',
        },
      }}
    >
      {/* Generic fallback for non-editorial sites — minimal listing so the
          route always returns something sensible. */}
      <section className="section-padding">
        <div className="container">
          <h1 className="text-3xl font-bold mb-4">{PAGE_TITLE}</h1>
          <p className="text-muted-foreground mb-8">{PAGE_DESCRIPTION}</p>
          <ExperiencesFallbackClient activities={activities} />
        </div>
      </section>
    </TemplateSlot>
  );
}

export const revalidate = 300;
