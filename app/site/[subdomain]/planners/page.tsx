/**
 * `/planners` list route.
 *
 * When the site opts into editorial-v1 this delegates to
 * `EditorialPlannersListPage` via `<TemplateSlot name="planners-list">`.
 * The generic fallback is a simple grid (same card shape as the home
 * `planners` section) — we keep this minimal since the editorial set is
 * the intended experience for this route.
 */

import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';
import { getPlanners } from '@/lib/supabase/get-planners';
import { getBrandClaims } from '@/lib/supabase/get-brand-claims';
import { TemplateSlot } from '@/components/site/themes/editorial-v1/template-slot';
import {
  buildLocaleAwareAlternateLanguages,
  resolvePublicMetadataLocale,
} from '@/lib/seo/public-metadata';
import { localeToOgLocale } from '@/lib/seo/locale-routing';
import { resolveOgImage } from '@/lib/seo/og-helpers';

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

interface PlannersListPageProps {
  params: Promise<{ subdomain: string }>;
}

export async function generateMetadata({
  params,
}: PlannersListPageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);
  if (!website) return { title: 'Planners no encontrados' };

  const siteName =
    website.content?.account?.name || website.content?.siteName || subdomain;
  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const localeContext = await resolvePublicMetadataLocale(website, '/planners');
  const canonical = `${baseUrl}${localeContext.localizedPathname}`;
  const ogImage = resolveOgImage(website);

  return {
    title: `Nuestros travel planners — ${siteName}`,
    description:
      'Conoce al equipo de travel planners. Emparejamos tu viaje con la persona que más sabe de la región o experiencia que buscas.',
    alternates: {
      canonical,
      languages: buildLocaleAwareAlternateLanguages(baseUrl, '/planners', localeContext),
    },
    openGraph: {
      title: `Nuestros travel planners — ${siteName}`,
      description: 'Conoce al equipo de travel planners. Emparejamos tu viaje con la persona que más sabe de la región o experiencia que buscas.',
      type: 'website',
      locale: localeToOgLocale(localeContext.resolvedLocale),
      ...(ogImage && { images: [{ url: ogImage }] }),
    },
  };
}

export default async function PlannersListRoute({ params }: PlannersListPageProps) {
  const { subdomain } = await params;
  const website = await getWebsiteBySubdomain(subdomain);
  if (!website || website.status !== 'published') notFound();

  const dbPlanners = website.account_id
    ? await getPlanners(website.account_id)
    : [];
  const brandClaims = website.account_id
    ? await getBrandClaims(website.account_id)
    : null;

  const payload = { dbPlanners, brandClaims };

  const genericBody = (
    <div className="section-padding">
      <div className="container">
        <h1
          className="text-3xl md:text-4xl font-bold mb-8 text-center"
          style={{ color: 'var(--text-heading)' }}
        >
          Nuestros travel planners
        </h1>
        {dbPlanners.length === 0 ? (
          <p className="text-center text-gray-500">
            Aún no hay travel planners publicados.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {dbPlanners.map((p) => (
              <Link
                key={p.id}
                href={`/site/${subdomain}/planners/${p.slug}`}
                className="block rounded-2xl p-6 text-center hover:shadow-lg transition-shadow"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div className="relative w-20 h-20 mx-auto mb-4">
                  {p.photo ? (
                    <Image
                      src={p.photo}
                      alt={p.fullName}
                      fill
                      className="object-cover rounded-full"
                    />
                  ) : (
                    <div
                      className="w-full h-full rounded-full flex items-center justify-center text-xl font-bold"
                      style={{
                        backgroundColor: 'var(--spotlight-color)',
                        color: 'var(--accent)',
                      }}
                    >
                      {p.fullName
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </div>
                  )}
                </div>
                <h3
                  className="font-semibold text-lg"
                  style={{ color: 'var(--text-heading)' }}
                >
                  {p.fullName}
                </h3>
                <p
                  className="text-sm mt-1"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {p.position || 'Travel Planner'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <TemplateSlot name="planners-list" website={website} payload={payload}>
      {genericBody}
    </TemplateSlot>
  );
}
