'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { MobileCardCarousel } from '@/components/ui/card-carousel';
import { resolveAlt, type LocalizableAlt } from '@bukeer/website-contract';
import { useWebsiteLocale } from '@/lib/hooks/use-website-locale';

interface ActivitiesSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export interface ActivityItem {
  id: string;
  slug?: string;
  name: string;
  image?: string;
  imageAlt?: LocalizableAlt;
  duration?: string;
  price?: string;
  category?: string;
  difficulty?: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  description?: string;
}

export function ActivitiesSection({ section, website }: ActivitiesSectionProps) {
  const locale = useWebsiteLocale();
  const variant = section.variant || 'default';
  const sectionContent = section.content as {
    title?: string;
    subtitle?: string;
    activities?: ActivityItem[];
  };

  const title = sectionContent.title || 'Actividades Destacadas';
  const subtitle = sectionContent.subtitle;
  const activities = sectionContent.activities || [];

  if (activities.length === 0) return null;

  return (
    <section
      className="section-padding"
      style={{
        backgroundColor: variant === 'showcase'
          ? 'color-mix(in srgb, var(--bg-card) 14%, var(--bg))'
          : 'var(--bg)',
      }}
    >
      <div className="container">
        <SectionHeading title={title} subtitle={subtitle} />

        <MobileCardCarousel
          items={activities}
          ariaLabel="Carrusel de actividades"
          getItemKey={(activity) => activity.id}
          itemWidthClassName="w-[88%] sm:w-[72%]"
          renderItem={(activity, index) => (
            <ActivityCard
              activity={activity}
              index={index}
              subdomain={website.subdomain}
              locale={locale}
            />
          )}
        />

        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity, index) => (
            <ActivityCard key={activity.id} activity={activity} index={index} subdomain={website.subdomain} locale={locale} />
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href={`/site/${website.subdomain}/actividades`}
            className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-heading)',
            }}
          >
            Ver todas las actividades
          </Link>
        </div>
      </div>
    </section>
  );
}

function SectionHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center mb-12"
    >
      <p className="font-mono text-xs tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--accent)' }}>
        Experiencias Curadas
      </p>
      <h2 className="section-title" style={{ color: 'var(--text-heading)' }}>
        {title}
      </h2>
      {subtitle && (
        <p className="section-subtitle mt-4 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

export function getDifficultyStyle(difficulty: string): { bg: string; text: string } {
  const normalized = difficulty.toLowerCase().trim();
  if (normalized === 'facil' || normalized === 'fácil' || normalized === 'easy') {
    return { bg: 'rgb(16 185 129 / 0.9)', text: '#ffffff' };
  }
  if (normalized === 'medio' || normalized === 'moderado' || normalized === 'medium' || normalized === 'moderate') {
    return { bg: 'rgb(245 158 11 / 0.9)', text: '#ffffff' };
  }
  if (normalized === 'dificil' || normalized === 'difícil' || normalized === 'hard' || normalized === 'difficult') {
    return { bg: 'rgb(239 68 68 / 0.9)', text: '#ffffff' };
  }
  // Default: accent-based
  return { bg: 'color-mix(in srgb, var(--accent) 16%, var(--bg-card))', text: 'var(--accent)' };
}

export function ActivityCard({
  activity,
  index,
  subdomain,
  locale,
  basePath: overrideBasePath,
}: {
  activity: ActivityItem;
  index: number;
  subdomain: string;
  locale: string;
  basePath?: string;
}) {
  const base = overrideBasePath ?? `/site/${subdomain}`;
  const detailSlug = (activity.slug || '').trim();
  const detailHref = detailSlug
    ? `${base}/actividades/${encodeURIComponent(detailSlug)}`
    : `${base}/actividades`;

  const difficultyStyle = activity.difficulty ? getDifficultyStyle(activity.difficulty) : null;

  return (
    <Link
      href={detailHref}
      className="block"
      aria-label={`Ver detalle de ${activity.name}`}
    >
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ delay: index * 0.08, duration: 0.55 }}
        className="group rounded-2xl overflow-hidden flex flex-col shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        {/* Image — 16:9 landscape */}
        <div className="relative aspect-[16/9] overflow-hidden">
          {activity.image ? (
            <Image
              src={activity.image}
              alt={resolveAlt(activity.imageAlt, locale) || activity.name || `Activity image ${index + 1}`}
              fill
              draggable={false}
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full" style={{ backgroundColor: 'var(--bg-card)' }} />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--card-gradient), transparent)' }} />

          {/* Badges overlay on image */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            {activity.category && (
              <span
                className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full backdrop-blur-sm"
                style={{ backgroundColor: 'var(--card-badge-bg)', border: '1px solid var(--card-badge-border)', color: 'var(--card-badge-text)' }}
              >
                {activity.category}
              </span>
            )}
            {activity.difficulty && difficultyStyle && (
              <span
                className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full font-bold"
                style={{
                  backgroundColor: difficultyStyle.bg,
                  color: difficultyStyle.text,
                }}
              >
                {activity.difficulty}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col flex-1">
          {/* Location with pin */}
          {activity.location && (
            <p className="flex items-center gap-1 text-sm mb-1 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" style={{ color: 'var(--accent)' }}>
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              {activity.location}
            </p>
          )}

          <h3 className="product-card-title font-bold mb-2 line-clamp-2" style={{ color: 'var(--text-heading)' }}>
            {activity.name}
          </h3>

          {activity.description && (
            <p className="text-sm leading-relaxed line-clamp-3 mb-3" style={{ color: 'var(--text-secondary)' }}>
              {activity.description}
            </p>
          )}

          {/* Rating inline: star + numeric + review count */}
          {activity.rating && (
            <div className="flex items-center gap-1.5 mb-4">
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" style={{ color: 'var(--accent)' }}>
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-sm font-medium" style={{ color: 'var(--text-heading)' }}>
                {activity.rating.toFixed(1)}
              </span>
              {activity.reviewCount && (
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  ({activity.reviewCount} {activity.reviewCount === 1 ? 'resena' : 'resenas'})
                </span>
              )}
            </div>
          )}

          <div className="flex-1" />

          {/* Footer: price left + duration right, CTA */}
          <div className="pt-4 flex items-end justify-between gap-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Desde</p>
              <p className="product-price mt-1" style={{ color: 'var(--accent)' }}>
                {activity.price || 'Consultar'}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              {activity.duration && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent) 10%, var(--bg-card))',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  {activity.duration}
                </span>
              )}
              <span className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
                Ver actividad
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
