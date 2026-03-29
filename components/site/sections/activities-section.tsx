'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface ActivitiesSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function ActivitiesSection({ section }: ActivitiesSectionProps) {
  const variant = section.variant || 'default';
  const sectionContent = section.content as {
    title?: string;
    subtitle?: string;
    activities?: Array<{
      id: string;
      name: string;
      image: string;
      duration?: string;
      price?: string;
      category?: string;
      maxGroup?: string;
      location?: string;
      rating?: number;
      reviewCount?: number;
      description?: string;
      featured?: boolean;
    }>;
  };

  const title = sectionContent.title || 'Experiencias Únicas';
  const activities = sectionContent.activities || [];

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

  // Default variant
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
