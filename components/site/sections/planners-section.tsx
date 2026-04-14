'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { BlurFade } from '@/components/ui/blur-fade';
import { SpotlightCard } from '@/components/ui/spotlight-card';

interface PlannersSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface Planner {
  name: string;
  photo?: string;
  specialty: string;
  rating?: number;
  reviewCount?: number;
  quote?: string;
  whatsapp?: string;
}

export function PlannersSection({ section, website }: PlannersSectionProps) {
  const sectionContent = section.content as {
    title?: string;
    subtitle?: string;
    eyebrow?: string;
    planners?: Planner[];
  };

  const title = sectionContent.title || 'Nuestros Travel Planners';
  const subtitle = sectionContent.subtitle || 'Expertos locales que disenan tu viaje ideal';
  const eyebrow = sectionContent.eyebrow || 'Tu guia personal';
  const whatsappBase = website.content.social?.whatsapp || '';

  const planners = sectionContent.planners || [
    { name: 'Yenny Giraldo', specialty: 'Grupos', quote: 'Cada grupo tiene su ritmo, yo lo encuentro' },
    { name: 'Juan David', specialty: 'Familias', quote: 'Viajes que unen familias para siempre' },
    { name: 'Veronica Morales', specialty: 'Familias', quote: 'Los ninos son los mejores viajeros' },
    { name: 'Susana Guerra', specialty: 'Grupos', quote: 'Colombia en grupo es otra experiencia' },
    { name: 'Diana Tabares', specialty: 'Adultos', quote: 'Viajes a la medida de tu tiempo' },
    { name: 'Leidy Giraldo', specialty: 'Amigos', quote: 'Las mejores historias nacen viajando' },
    { name: 'Paola Henao', specialty: 'Parejas', quote: 'Romance y aventura en cada destino' },
  ];

  const specialtyColors: Record<string, string> = {
    'Grupos': 'var(--accent)',
    'Familias': '#006B60',
    'Parejas': '#E8A838',
    'Adultos': '#9E7AFF',
    'Amigos': '#FE8BBB',
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
          {planners.map((planner, index) => (
            <BlurFade key={planner.name} delay={index * 0.08} direction="up">
              <SpotlightCard
                className="rounded-2xl"
                spotlightColor={specialtyColors[planner.specialty] || 'var(--accent)'}
              >
                <motion.div
                  whileHover={{ y: -4 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  className="rounded-2xl p-6 text-center"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
                >
                  {/* Avatar */}
                  <div className="relative w-20 h-20 mx-auto mb-4">
                    {planner.photo ? (
                      <Image
                        src={planner.photo}
                        alt={planner.name}
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

                  {/* WhatsApp CTA */}
                  <a
                    href={`https://wa.me/${(planner.whatsapp || whatsappBase).replace(/[^0-9]/g, '')}?text=Hola ${planner.name}! Me interesa planear un viaje a Colombia`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-full font-medium text-sm transition-all hover:scale-[1.03]"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    Hablar con {planner.name.split(' ')[0]}
                  </a>
                </motion.div>
              </SpotlightCard>
            </BlurFade>
          ))}
        </div>
      </div>
    </div>
  );
}
