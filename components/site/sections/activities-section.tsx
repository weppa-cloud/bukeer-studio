'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { MobileCardCarousel } from '@/components/ui/card-carousel';

interface ActivitiesSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface ActivityItem {
  id: string;
  slug?: string;
  name: string;
  image?: string;
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
          renderItem={(activity, index) => <ActivityCard activity={activity} index={index} subdomain={website.subdomain} />}
        />

        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activities.map((activity, index) => (
            <ActivityCard key={activity.id} activity={activity} index={index} subdomain={website.subdomain} />
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

function ActivityCard({ activity, index, subdomain }: { activity: ActivityItem; index: number; subdomain: string }) {
  const detailSlug = (activity.slug || '').trim();
  const detailHref = detailSlug
    ? `/site/${subdomain}/actividades/${encodeURIComponent(detailSlug)}`
    : `/site/${subdomain}/actividades`;

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
        whileHover={{ y: -4 }}
        className="group rounded-[20px] overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="relative aspect-[3/4] overflow-hidden">
          {activity.image ? (
            <Image src={activity.image} alt={activity.name} fill draggable={false} className="object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full" style={{ backgroundColor: 'var(--bg-card)' }} />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--card-gradient), transparent)' }} />

          <div className="absolute top-3 left-3 flex items-center gap-2">
            {activity.category && (
              <span
                className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full"
                style={{ backgroundColor: 'var(--card-badge-bg)', border: '1px solid var(--card-badge-border)', color: 'var(--card-badge-text)' }}
              >
                {activity.category}
              </span>
            )}
            {activity.difficulty && (
              <span
                className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: 'color-mix(in srgb, var(--accent) 16%, var(--bg-card))',
                  border: '1px solid color-mix(in srgb, var(--accent) 45%, var(--border-subtle))',
                  color: 'var(--accent)',
                }}
              >
                {activity.difficulty}
              </span>
            )}
          </div>
        </div>

        <div className="p-5 flex flex-col flex-1">
          <div className="mb-3 flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            {activity.duration && <span>{activity.duration}</span>}
            {activity.location && <span className="line-clamp-1">{activity.location}</span>}
          </div>

          <h3 className="product-card-title mb-3 line-clamp-2" style={{ color: 'var(--text-heading)' }}>
            {activity.name}
          </h3>

          {activity.description && (
            <p className="text-sm leading-relaxed line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>
              {activity.description}
            </p>
          )}

          {activity.rating && (
            <div className="flex items-center gap-1 mb-5">
              {Array.from({ length: 5 }).map((_, i) => (
                <svg key={i} className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor"
                  style={{ color: i < Math.round(activity.rating!) ? 'var(--accent)' : 'var(--border-medium)' }}>
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              {activity.reviewCount && (
                <span className="text-xs ml-0.5" style={{ color: 'var(--text-muted)' }}>
                  ({activity.reviewCount})
                </span>
              )}
            </div>
          )}

          <div className="flex-1" />

          <div className="pt-4 flex items-end justify-between gap-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>Desde</p>
              <p className="product-price mt-1" style={{ color: 'var(--accent)' }}>
                {activity.price || 'Consultar'}
              </p>
            </div>
            <span className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
              Ver actividad ›
            </span>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
