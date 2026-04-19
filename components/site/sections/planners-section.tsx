'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { BlurFade } from '@/components/ui/blur-fade';
import { useWebsiteLocale } from '@/lib/hooks/use-website-locale';
import { buildEntityAlt } from '@/lib/utils/entity-alt';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import type { PlannerData } from '@/lib/supabase/get-planners';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

interface PlannersSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
  dbPlanners?: PlannerData[];
}

interface Planner {
  name: string;
  photo?: string;
  specialty: string;
  rating?: number;
  reviewCount?: number;
  quote?: string;
  whatsapp?: string;
  slug?: string;
}

/** Map user_rol values to human-readable Spanish labels */
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

/** Convert DB planners to the component's Planner interface */
function mapDbPlanners(
  dbPlanners: PlannerData[],
  sectionPlanners?: Planner[]
): Planner[] {
  return dbPlanners.map((dbPlanner) => {
    // Try to find matching section content planner for quote/rating data
    const match = sectionPlanners?.find(
      (sp) =>
        sp.name.toLowerCase().includes(dbPlanner.name.toLowerCase()) ||
        dbPlanner.fullName.toLowerCase().includes(sp.name.toLowerCase())
    );

    return {
      name: dbPlanner.fullName,
      photo: dbPlanner.photo || undefined,
      specialty: match?.specialty || dbPlanner.position || mapRole(dbPlanner.role),
      whatsapp: dbPlanner.phone || undefined,
      quote: match?.quote || undefined,
      rating: match?.rating,
      reviewCount: match?.reviewCount,
      slug: dbPlanner.slug,
    };
  });
}

const HARDCODED_FALLBACK: Planner[] = [
  { name: 'Yenny Giraldo', specialty: 'Grupos', quote: 'Cada grupo tiene su ritmo, yo lo encuentro' },
  { name: 'Juan David', specialty: 'Familias', quote: 'Viajes que unen familias para siempre' },
  { name: 'Veronica Morales', specialty: 'Familias', quote: 'Los ninos son los mejores viajeros' },
  { name: 'Susana Guerra', specialty: 'Grupos', quote: 'Colombia en grupo es otra experiencia' },
  { name: 'Diana Tabares', specialty: 'Adultos', quote: 'Viajes a la medida de tu tiempo' },
  { name: 'Leidy Giraldo', specialty: 'Amigos', quote: 'Las mejores historias nacen viajando' },
  { name: 'Paola Henao', specialty: 'Parejas', quote: 'Romance y aventura en cada destino' },
];

export function PlannersSection({ section, website, dbPlanners }: PlannersSectionProps) {
  const sectionContent = section.content as {
    title?: string;
    subtitle?: string;
    eyebrow?: string;
    planners?: Planner[];
    dbPlanners?: PlannerData[];
  };

  const locale = useWebsiteLocale();
  const text = getPublicUiExtraTextGetter(locale);
  const title = sectionContent.title || text('sectionPlannersTitle');
  const subtitle = sectionContent.subtitle || text('sectionPlannersSubtitle');
  const eyebrow = sectionContent.eyebrow || text('sectionPlannersEyebrow');
  const agency = website.content.siteName || '';
  const whatsappBase = website.content.social?.whatsapp || '';
  const subdomain = website.subdomain;

  // Resolve DB planners: prop > section content injection > empty
  const resolvedDbPlanners = dbPlanners || sectionContent.dbPlanners || [];

  // Priority: DB planners > section content planners > hardcoded fallback
  let planners: Planner[];
  if (resolvedDbPlanners.length > 0) {
    planners = mapDbPlanners(resolvedDbPlanners, sectionContent.planners);
  } else if (sectionContent.planners && sectionContent.planners.length > 0) {
    planners = sectionContent.planners.map((p) => ({
      ...p,
      slug: p.slug || slugify(p.name),
    }));
  } else {
    planners = HARDCODED_FALLBACK.map((p) => ({
      ...p,
      slug: slugify(p.name),
    }));
  }

  const specialtyColors: Record<string, string> = {
    'Grupos': 'var(--accent)',
    'Familias': '#006B60',
    'Parejas': '#E8A838',
    'Adultos': '#9E7AFF',
    'Amigos': '#FE8BBB',
    'Agente de Viajes': 'var(--accent)',
    'Agente de Viajes Senior': '#006B60',
    'Operaciones': '#9E7AFF',
    'Administrador': '#E8A838',
  };

  return (
    <div className="section-padding">
      <div className="container">
        {/* Header */}
        <BlurFade delay={0}>
          <div className="text-center mb-16">
            <p className="font-mono text-xs tracking-[0.15em] uppercase mb-3" style={{ color: 'var(--accent)' }}>
              {eyebrow}
            </p>
            <h2 className="section-title" style={{ color: 'var(--text-heading)' }}>
              {title}
            </h2>
            <p className="section-subtitle mt-4 max-w-xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
              {subtitle}
            </p>
          </div>
        </BlurFade>

        {/* Planners Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {planners.map((planner, index) => {
            const profileHref = planner.slug ? `/site/${subdomain}/planners/${planner.slug}` : null;
            const waNumber = (planner.whatsapp || whatsappBase).replace(/[^0-9]/g, '');
            const waHref = waNumber
              ? `https://wa.me/${waNumber}?text=Hola ${planner.name}! Me interesa planear un viaje a Colombia`
              : null;

            const cardInner = (
              <motion.div
                whileHover={{ y: -4 }}
                transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                className="rounded-2xl p-6 text-center relative group"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
              >
                {/* Avatar */}
                <div className="relative w-20 h-20 mx-auto mb-4">
                  {planner.photo ? (
                    <Image
                      src={planner.photo}
                      alt={buildEntityAlt('planner', planner.name, locale, agency)}
                      fill
                      className="object-cover rounded-full"
                    />
                  ) : (
                    <div
                      className="w-full h-full rounded-full flex items-center justify-center text-2xl font-bold"
                      style={{ backgroundColor: 'var(--spotlight-color)', color: 'var(--accent)' }}
                    >
                      {planner.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}
                  {/* Online indicator */}
                  <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 bg-green-500" style={{ borderColor: 'var(--bg-card)' }} />
                </div>

                {/* Name */}
                <h3 className="font-semibold text-lg leading-tight" style={{ color: 'var(--text-heading)' }}>
                  {planner.name}
                </h3>

                {/* Specialty badge */}
                <span
                  className="inline-block mt-2 px-3 py-1 rounded-full font-mono text-[10px] tracking-widest uppercase"
                  style={{
                    backgroundColor: `${specialtyColors[planner.specialty] || 'var(--accent)'}20`,
                    color: specialtyColors[planner.specialty] || 'var(--accent)',
                  }}
                >
                  {planner.specialty}
                </span>

                {/* Quote */}
                {planner.quote && (
                  <p className="mt-3 text-sm italic leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                    &ldquo;{planner.quote}&rdquo;
                  </p>
                )}

                {/* Rating */}
                {planner.rating && (
                  <div className="flex items-center justify-center gap-1 mt-3">
                    <svg className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {planner.rating} ({planner.reviewCount})
                    </span>
                  </div>
                )}

                {/* Bottom row: Ver perfil label + WhatsApp icon */}
                <div className="mt-4 flex items-center justify-between gap-2">
                  <span
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium"
                    style={{ color: 'var(--accent)' }}
                  >
                    {text('sectionPlannersViewProfile')}
                    <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>

                  {/* WhatsApp icon — stops card navigation */}
                  {waHref && (
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full transition-all hover:scale-[1.12]"
                      style={{ backgroundColor: '#25D36620', color: '#25D366' }}
                      aria-label={`WhatsApp ${planner.name}`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                    </a>
                  )}
                </div>
              </motion.div>
            );

            return (
              <BlurFade key={planner.name} delay={index * 0.08} direction="up">
                <SpotlightCard
                  className="rounded-2xl"
                  spotlightColor={specialtyColors[planner.specialty] || 'var(--accent)'}
                >
                  {profileHref ? (
                    <Link href={profileHref} className="block cursor-pointer">
                      {cardInner}
                    </Link>
                  ) : (
                    cardInner
                  )}
                </SpotlightCard>
              </BlurFade>
            );
          })}
        </div>
      </div>
    </div>
  );
}
