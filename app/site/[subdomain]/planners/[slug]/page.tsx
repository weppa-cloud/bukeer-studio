import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';
import { getPlanners, slugify } from '@/lib/supabase/get-planners';
import {
  getPlannerPackages,
  getPackageKitById,
  type PlannerPackageSummary,
} from '@/lib/supabase/get-planner-packages';
import { getReviewsForContext } from '@/lib/supabase/get-reviews';
import { ReviewsBlock } from '@/components/site/reviews-block';
import {
  buildLocaleAwareAlternateLanguages,
  resolvePublicMetadataLocale,
} from '@/lib/seo/public-metadata';
import { buildPublicLocalizedPath, localeToOgLocale } from '@/lib/seo/locale-routing';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';
import { TemplateSlot } from '@/components/site/themes/editorial-v1/template-slot';
import type {
  PlannerPayload,
  RelatedPackage,
} from '@/components/site/themes/editorial-v1/pages/planner-detail';

// ISR: Revalidate every 5 minutes
export const revalidate = 300;

interface PlannerPageProps {
  params: Promise<{ subdomain: string; slug: string }>;
}

export async function generateMetadata({ params }: PlannerPageProps): Promise<Metadata> {
  const { subdomain, slug } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website) {
    return { title: 'Planner no encontrado' };
  }

  const path = `/planners/${slug}`;
  const localeContext = await resolvePublicMetadataLocale(website, path);
  const planners = website.account_id
    ? await getPlanners(website.account_id, { locale: localeContext.resolvedLocale })
    : [];
  const planner = planners.find((p) => p.slug === slug);

  if (!planner) {
    return { title: 'Planner no encontrado' };
  }

  const siteName = website.content?.account?.name || website.content?.siteName || subdomain;
  const title = `${planner.fullName} — ${siteName}`;
  const description = `${planner.position || 'Agente de Viajes'} en ${siteName}. Planifica tu viaje ideal con ${planner.name}.`;

  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${subdomain}.bukeer.com`;
  const canonical = `${baseUrl}${buildPublicLocalizedPath(path, localeContext.resolvedLocale, localeContext.defaultLocale)}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      locale: localeToOgLocale(localeContext.resolvedLocale),
      siteName,
      url: canonical,
      ...(planner.photo && { images: [{ url: planner.photo }] }),
    },
    twitter: {
      card: 'summary',
      title,
      description,
      ...(planner.photo && { images: [planner.photo] }),
    },
    alternates: {
      canonical,
      languages: buildLocaleAwareAlternateLanguages(baseUrl, path, localeContext),
    },
  };
}

/**
 * Map `PlannerPackageSummary` → editorial-v1 `RelatedPackage` shape used by
 * the "Hallmarks" / "Otros paquetes que arma" grid. Price/currency omitted
 * for now — `package_kits.pricing_tiers` is sparsely populated on the pilot
 * dataset; the UI falls back cleanly when `price` is undefined.
 */
function toRelatedPackage(pkg: PlannerPackageSummary): RelatedPackage {
  return {
    id: pkg.id,
    slug: pkg.slug,
    title: pkg.title,
    location: pkg.destination ?? undefined,
    image: pkg.coverImageUrl,
    badges: pkg.isFeatured ? ['Destacado'] : undefined,
  };
}

/** Map user_rol to human-readable Spanish label */
function mapRole(role: string | null): string {
  const roleMap: Record<string, string> = {
    agent: 'Agente de Viajes',
    admin: 'Administrador',
    operations: 'Operaciones',
    manager: 'Gerente',
    sales: 'Ventas',
  };
  return role ? roleMap[role] || role : 'Agente de Viajes';
}

export default async function PlannerProfilePage({ params }: PlannerPageProps) {
  const { subdomain, slug } = await params;
  const website = await getWebsiteBySubdomain(subdomain);

  if (!website || website.status !== 'published') {
    notFound();
  }

  // Try to find matching planner data from the planners section for quote/rating
  const plannersSection = website.sections?.find(
    (s) => s.section_type === 'planners' || s.section_type === 'team' || s.section_type === 'travel_planners'
  );
  type SectionPlanner = { name: string; quote?: string; rating?: number; reviewCount?: number; specialty?: string };
  const sectionPlanners = (plannersSection?.content as { planners?: SectionPlanner[] })?.planners;

  const localeContext = await resolvePublicMetadataLocale(website, `/planners/${slug}`);
  const dbPlanners = website.account_id
    ? await getPlanners(website.account_id, { locale: localeContext.resolvedLocale })
    : [];
  let planner = dbPlanners.find((p) => p.slug === slug);

  // Fallback: resolve from section content planners when DB has no contacts
  let sectionMatch: SectionPlanner | undefined;
  if (!planner && sectionPlanners) {
    sectionMatch = sectionPlanners.find((sp) => slugify(sp.name) === slug);
    if (sectionMatch) {
      // Build a synthetic PlannerData from section content
      const parts = sectionMatch.name.split(' ');
      planner = {
        id: slug,
        name: parts[0] || sectionMatch.name,
        lastName: parts.slice(1).join(' '),
        fullName: sectionMatch.name,
        photo: null,
        role: null,
        position: sectionMatch.specialty || null,
        phone: null,
        slug,
        quote: sectionMatch.quote ?? null,
        bio: null,
        specialty: sectionMatch.specialty ?? null,
        language: null,
        tagline: null,
        tripsCount: null,
        ratingAvg: null,
        yearsExperience: null,
        specialties: null,
        regions: null,
        locationName: null,
        languages: null,
        signaturePackageId: null,
        personalDetails: null,
      };
    }
  }

  if (!planner) {
    notFound();
  }

  // Match section content for enrichment when coming from DB
  if (!sectionMatch && sectionPlanners) {
    sectionMatch = sectionPlanners.find(
      (sp) =>
        sp.name.toLowerCase().includes(planner!.name.toLowerCase()) ||
        planner!.fullName.toLowerCase().includes(sp.name.toLowerCase())
    );
  }

  const plannerReviews = website.account_id
    ? await getReviewsForContext(website.account_id, { type: 'planner', name: planner.fullName }, 50)
    : [];

  const whatsappBase = website.content.social?.whatsapp || '';
  const whatsappNumber = (planner.phone || whatsappBase).replace(/[^0-9]/g, '');
  const specialty = planner.specialty || planner.position || mapRole(planner.role);
  const siteName = website.content?.account?.name || website.content?.siteName || subdomain;
  const text = getPublicUiExtraTextGetter(
    localeContext.resolvedLocale || website.default_locale || website.content?.locale || 'es-CO'
  );

  const quote = sectionMatch?.quote;
  const rating = sectionMatch?.rating;
  const reviewCount = sectionMatch?.reviewCount;

  // Editorial-v1 payload — merges section content overrides + DB planner
  // profile columns (trips_count/rating_avg/years_experience/specialties/
  // regions/location_name/languages/personal_details; migration
  // planner_profile_columns_on_contacts 2026-04-21). Section content wins
  // when both present so author edits keep priority over catalog sync.
  const dbSpecialties = planner.specialties ?? undefined;
  const dbRegions = planner.regions ?? undefined;
  const dbLanguages = planner.languages ?? undefined;
  const personalDetails = planner.personalDetails as
    | {
        heroImageUrl?: string | null;
        bannerImageUrl?: string | null;
        heroImagePosition?: string | null;
      }
    | null;

  // Signature trip — resolve `contacts.signature_package_id` → package_kits
  // row. Only populate `payload.signature` when the FK resolves to a live
  // package; ghost-pattern UI hides the card otherwise.
  const isSynthetic = planner.id === slug;
  const signaturePackage =
    website.account_id && planner.signaturePackageId && !isSynthetic
      ? await getPackageKitById(website.account_id, planner.signaturePackageId)
      : null;

  // Hallmarks grid — fetch package_kits authored by this planner via the
  // `package_kits.planner_id` FK (migration 20260504110000). Limit 3 for the
  // editorial card layout; exclude the signature package to avoid
  // duplication. Skip when we synthesized the planner from section content
  // (id === slug; not a valid contacts uuid).
  const plannerPackages =
    website.account_id && planner.id && !isSynthetic
      ? await getPlannerPackages(website.account_id, planner.id, 6)
      : [];
  const filteredPlannerPackages = signaturePackage
    ? plannerPackages.filter((p) => p.id !== signaturePackage.id)
    : plannerPackages;
  const relatedPackages: RelatedPackage[] = filteredPlannerPackages
    .slice(0, 3)
    .map(toRelatedPackage);

  const plannerPayload: PlannerPayload = {
    bio: planner.bio ?? undefined,
    heroImageUrl: personalDetails?.heroImageUrl ?? personalDetails?.bannerImageUrl ?? undefined,
    heroImagePosition: personalDetails?.heroImagePosition ?? undefined,
    rating: sectionMatch?.rating ?? planner.ratingAvg ?? undefined,
    reviews: sectionMatch?.reviewCount ?? undefined,
    trips: planner.tripsCount ?? undefined,
    years: planner.yearsExperience ?? undefined,
    specialties: sectionMatch?.specialty
      ? [sectionMatch.specialty, ...(dbSpecialties ?? [])]
      : dbSpecialties,
    regions: dbRegions,
    languages: dbLanguages && dbLanguages.length > 0
      ? dbLanguages.map((l) => l.toUpperCase())
      : undefined,
    base: planner.locationName ?? undefined,
    signature: signaturePackage
      ? {
          title: signaturePackage.title,
          note: signaturePackage.destination
            ? `${signaturePackage.destination} — itinerario firma curado por ${planner.name}.`
            : `Itinerario firma curado por ${planner.name}.`,
          imageUrl: signaturePackage.coverImageUrl,
        }
      : undefined,
  };

  // Fetch the full planners list (for Otros planners strip).
  const allPlanners = website.account_id
    ? await getPlanners(website.account_id, { locale: localeContext.resolvedLocale })
    : [];

  const editorialPayload = {
    planner,
    payload: plannerPayload,
    reviews: plannerReviews,
    relatedPackages,
    otherPlanners: allPlanners,
  };

  const genericBody = (
    <div className="section-padding">
      <div className="container max-w-4xl">
        {/* Generic body — rendered when the website doesn't opt into editorial-v1. */}
        {/* Breadcrumb / Back link */}
        <nav className="mb-8">
          <Link
            href={`/site/${subdomain}`}
            className="inline-flex items-center gap-2 text-sm transition-colors hover:opacity-80"
            style={{ color: 'var(--accent)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {text('plannersBackHome')}
          </Link>
        </nav>

        {/* Profile Header */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
          {/* Photo */}
          <div className="relative w-40 h-40 md:w-48 md:h-48 flex-shrink-0">
            {planner.photo ? (
              <Image
                src={planner.photo}
                alt={planner.fullName}
                fill
                priority
                className="object-cover rounded-2xl"
              />
            ) : (
              <div
                className="w-full h-full rounded-2xl flex items-center justify-center text-5xl font-bold"
                style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--accent)' }}
              >
                {planner.fullName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="text-center md:text-left flex-1">
            <h1
              className="text-3xl md:text-4xl font-bold leading-tight"
              style={{ color: 'var(--text-heading)' }}
            >
              {planner.fullName}
            </h1>

            <p
              className="mt-2 text-lg"
              style={{ color: 'var(--text-secondary)' }}
            >
              {specialty}
            </p>

            {/* Rating */}
            {rating && (
              <div className="flex items-center justify-center md:justify-start gap-2 mt-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-5 h-5 ${star <= Math.round(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 fill-gray-300'}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {rating} {reviewCount ? `(${reviewCount} resenas)` : ''}
                </span>
              </div>
            )}

            {/* WhatsApp CTA */}
            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}?text=Hola ${planner.name}! Me interesa planear un viaje con ${siteName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-3 px-6 py-3 rounded-full font-medium text-base transition-all hover:scale-[1.03]"
                style={{ backgroundColor: '#25D366', color: '#ffffff' }}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                {text('plannersPlanTrip')}
              </a>
            )}
          </div>
        </div>

        {/* Bio / Quote Section */}
        {quote && (
          <section className="mb-12">
            <h2
              className="text-xl font-semibold mb-4"
              style={{ color: 'var(--text-heading)' }}
            >
              {text('plannersAbout')} {planner.name}
            </h2>
            <blockquote
              className="text-lg leading-relaxed italic border-l-4 pl-6 py-2"
              style={{ color: 'var(--text-secondary)', borderColor: 'var(--accent)' }}
            >
              &ldquo;{quote}&rdquo;
            </blockquote>
          </section>
        )}

        {/* Specialty Section */}
        <section className="mb-12">
          <h2
            className="text-xl font-semibold mb-4"
            style={{ color: 'var(--text-heading)' }}
          >
            {text('plannersSpecialty')}
          </h2>
          <div className="flex flex-wrap gap-3">
            <span
              className="inline-block px-4 py-2 rounded-full font-mono text-xs tracking-widest uppercase"
              style={{
                backgroundColor: 'var(--accent)',
                color: 'var(--accent-text)',
                opacity: 0.9,
              }}
            >
              {specialty}
            </span>
            {sectionMatch?.specialty && sectionMatch.specialty !== specialty && (
              <span
                className="inline-block px-4 py-2 rounded-full font-mono text-xs tracking-widest uppercase"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {sectionMatch.specialty}
              </span>
            )}
          </div>
        </section>

        {/* Reviews */}
        {plannerReviews.length > 0 && (
          <section className="mb-12">
            <ReviewsBlock
              reviews={plannerReviews}
              title={`Lo que dicen sobre ${planner.name}`}
              variant="grid-2"
            />
          </section>
        )}

        {/* Agency Info */}
        <section
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            {text('plannersTravelPlannerIn')}
          </p>
          <p className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>
            {siteName}
          </p>
          <Link
            href={`/site/${subdomain}`}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--accent)' }}
          >
            {text('plannersVisitWebsite')}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </section>
      </div>
    </div>
  );

  return (
    <TemplateSlot
      name="planner-detail"
      website={website}
      payload={editorialPayload}
    >
      {genericBody}
    </TemplateSlot>
  );
}
