'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface ActivitiesSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface ActivityItem {
  id: string;
  name: string;
  image: string;
  duration?: string;
  price?: string;
  category?: string;
  difficulty?: string;
  maxGroup?: string;
  location?: string;
  rating?: number;
  reviewCount?: number;
  description?: string;
  featured?: boolean;
  badge?: string;
}

export function ActivitiesSection({ section }: ActivitiesSectionProps) {
  const variant = section.variant || 'default';
  const sectionContent = section.content as {
    title?: string;
    subtitle?: string;
    activities?: ActivityItem[];
  };

  const title = sectionContent.title || 'Experiencias Únicas';
  const activities = sectionContent.activities || [];

  if (variant === 'showcase') {
    return <ShowcaseActivities title={title} subtitle={sectionContent.subtitle} activities={activities} />;
  }

  // Cards variant — detailed tour cards with metadata
  if (variant === 'cards') {
    return (
      <div className="section-padding">
        <div className="container">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
            {sectionContent.subtitle && (
              <p className="mt-4 text-muted-foreground max-w-2xl">{sectionContent.subtitle}</p>
            )}
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {activities.map((tour, i) => (
              <motion.article
                key={tour.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                whileHover={{ y: -4 }}
                className={`group variant-card overflow-hidden ${tour.featured ? 'ring-1 ring-primary/20' : ''}`}
              >
                {/* Image */}
                <div className="relative h-56 overflow-hidden">
                  {tour.image ? (
                    <Image src={tour.image} alt={tour.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />
                  {tour.category && (
                    <div className="absolute top-4 left-4">
                      <span className="text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full bg-background/70 backdrop-blur-sm border border-border/50 text-muted-foreground">
                        {tour.category}
                      </span>
                    </div>
                  )}
                  {tour.price && (
                    <div className="absolute top-4 right-4 text-right">
                      <span className="font-bold text-lg text-white">{tour.price}</span>
                      <span className="text-xs text-white/70 block">por persona</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-bold text-xl leading-tight">{tour.name}</h3>
                    {tour.rating && (
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-primary text-sm">★</span>
                        <span className="text-sm font-medium">{tour.rating}</span>
                        {tour.reviewCount && <span className="text-xs text-muted-foreground">({tour.reviewCount})</span>}
                      </div>
                    )}
                  </div>

                  {tour.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{tour.description}</p>
                  )}

                  {/* Meta row */}
                  <div className="flex items-center gap-4 mb-5 pt-4 border-t border-border/50">
                    {tour.duration && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">⏱</span>
                        <span className="text-[11px] text-muted-foreground">{tour.duration}</span>
                      </div>
                    )}
                    {tour.maxGroup && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">👥</span>
                        <span className="text-[11px] text-muted-foreground">Máx. {tour.maxGroup}</span>
                      </div>
                    )}
                    {tour.location && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs">📍</span>
                        <span className="text-[11px] text-muted-foreground">{tour.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Default variant — overlay cards
  return (
    <div className="section-padding">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="group"
            >
              <div className="relative aspect-square rounded-xl overflow-hidden">
                {activity.image ? (
                  <Image
                    src={activity.image}
                    alt={activity.name}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full bg-muted" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-semibold text-white">{activity.name}</h3>
                  <div className="flex items-center justify-between mt-2 text-sm text-white/80">
                    {activity.duration && <span>{activity.duration}</span>}
                    {activity.price && <span className="font-semibold">{activity.price}</span>}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Showcase variant — G Adventures-inspired overlay cards with bridge CSS variables
function ShowcaseActivities({ title, subtitle, activities }: { title: string; subtitle?: string; activities: ActivityItem[] }) {
  const difficultyColors: Record<string, string> = {
    'Fácil': '#22c55e',
    'Moderado': '#eab308',
    'Aventura': '#ef4444',
    'Extremo': '#dc2626',
  };

  return (
    <div className="section-padding">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 style={{ fontSize: 'var(--text-display-md)', color: 'var(--text-heading)' }}>{title}</h2>
          {subtitle && (
            <p className="mt-4 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>{subtitle}</p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {activities.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: index * 0.08, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className="group relative block rounded-2xl overflow-hidden"
              style={{ aspectRatio: '3/4' }}
            >
              {activity.image ? (
                <Image
                  src={activity.image}
                  alt={activity.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                />
              ) : (
                <div className="absolute inset-0 bg-muted flex items-center justify-center">
                  <span className="text-4xl">🎯</span>
                </div>
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.1) 100%)' }} />

              {/* Top badges row */}
              <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                {/* Category badge */}
                {activity.category && (
                  <span
                    className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full backdrop-blur-sm"
                    style={{ backgroundColor: 'var(--card-badge-bg)', border: '1px solid var(--card-badge-border)', color: 'var(--card-badge-text)' }}
                  >
                    {activity.category}
                  </span>
                )}
                {/* Difficulty badge */}
                {activity.difficulty && (
                  <span
                    className="text-[10px] font-medium px-2 py-1 rounded-full backdrop-blur-sm"
                    style={{
                      backgroundColor: `${difficultyColors[activity.difficulty] || '#888'}22`,
                      color: difficultyColors[activity.difficulty] || '#888',
                      border: `1px solid ${difficultyColors[activity.difficulty] || '#888'}44`,
                    }}
                  >
                    {activity.difficulty}
                  </span>
                )}
              </div>

              {/* Duration badge — top right if no difficulty shown */}
              {activity.duration && !activity.difficulty && (
                <div
                  className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-sm font-mono text-[10px] tracking-wider"
                  style={{ backgroundColor: 'var(--card-badge-bg)', border: '1px solid var(--card-badge-border)', color: 'var(--card-badge-text)' }}
                >
                  <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {activity.duration}
                </div>
              )}

              {/* Featured/badge pill */}
              {activity.badge && (
                <div className="absolute top-3 left-3">
                  <span
                    className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full backdrop-blur-sm"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
                  >
                    {activity.badge}
                  </span>
                </div>
              )}

              {/* Bottom content */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h3 className="text-lg leading-tight mb-1.5 text-white font-semibold">{activity.name}</h3>

                {/* Location */}
                {activity.location && (
                  <div className="flex items-center gap-1 mb-2">
                    <svg className="w-3 h-3 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <span className="text-xs text-white/70">{activity.location}</span>
                  </div>
                )}

                {/* Meta row: duration + group size + rating */}
                <div className="flex items-center gap-3 text-xs text-white/70">
                  {activity.duration && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {activity.duration}
                    </span>
                  )}
                  {activity.maxGroup && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Max {activity.maxGroup}
                    </span>
                  )}
                </div>

                {/* Price + Rating row */}
                <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                  {activity.price && (
                    <span className="font-semibold text-lg" style={{ color: 'var(--accent)' }}>{activity.price}</span>
                  )}
                  {activity.rating && (
                    <div className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-xs font-medium text-white">{activity.rating}</span>
                      {activity.reviewCount && (
                        <span className="text-xs text-white/50">({activity.reviewCount})</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
