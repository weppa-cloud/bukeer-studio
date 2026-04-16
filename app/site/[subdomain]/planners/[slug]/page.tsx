import { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getWebsiteBySubdomain } from '@/lib/supabase/get-website';
import { getPlanners } from '@/lib/supabase/get-planners';
import type { PlannerData } from '@/lib/supabase/get-planners';

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

  const planners = website.account_id ? await getPlanners(website.account_id) : [];
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

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      locale: 'es_ES',
      siteName,
      url: `${baseUrl}/planners/${slug}`,
      ...(planner.photo && { images: [{ url: planner.photo }] }),
    },
    twitter: {
      card: 'summary',
      title,
      description,
      ...(planner.photo && { images: [planner.photo] }),
    },
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

  const planners = website.account_id ? await getPlanners(website.account_id) : [];
  const planner = planners.find((p) => p.slug === slug);

  if (!planner) {
    notFound();
  }

  const whatsappBase = website.content.social?.whatsapp || '';
  const whatsappNumber = (planner.phone || whatsappBase).replace(/[^0-9]/g, '');
  const specialty = planner.position || mapRole(planner.role);
  const siteName = website.content?.account?.name || website.content?.siteName || subdomain;

  // Try to find matching planner data from the planners section for quote/rating
  const plannersSection = website.sections?.find(
    (s) => s.section_type === 'planners' || s.section_type === 'team' || s.section_type === 'travel_planners'
  );
  const sectionPlanners = (plannersSection?.content as { planners?: Array<{ name: string; quote?: string; rating?: number; reviewCount?: number; specialty?: string }> })?.planners;
  const sectionMatch = sectionPlanners?.find(
    (sp) =>
      sp.name.toLowerCase().includes(planner.name.toLowerCase()) ||
      planner.fullName.toLowerCase().includes(sp.name.toLowerCase())
  );

  const quote = sectionMatch?.quote;
  const rating = sectionMatch?.rating;
  const reviewCount = sectionMatch?.reviewCount;

  return (
    <div className="section-padding">
      <div className="container max-w-4xl">
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
            Volver al inicio
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
                Planear mi viaje
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
              Sobre {planner.name}
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
            Especialidad
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

        {/* Agency Info */}
        <section
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
        >
          <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
            Travel Planner en
          </p>
          <p className="text-lg font-semibold" style={{ color: 'var(--text-heading)' }}>
            {siteName}
          </p>
          <Link
            href={`/site/${subdomain}`}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium transition-colors hover:opacity-80"
            style={{ color: 'var(--accent)' }}
          >
            Visitar sitio web
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </section>
      </div>
    </div>
  );
}
