'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface PackagesSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface PackageItem {
  id: string;
  name: string;
  image?: string;
  destination?: string;
  duration?: string;
  price?: string;
  description?: string;
  highlights?: string[];
  servicesCount?: number;
  category?: string;
  slug?: string;
}

export function PackagesSection({ section }: PackagesSectionProps) {
  const sectionContent = section.content as {
    title?: string;
    subtitle?: string;
    packages?: PackageItem[];
  };

  const variant = section.variant || 'default';
  const title = sectionContent.title || 'Paquetes Destacados';
  const packages = sectionContent.packages || [];

  if (packages.length === 0) return null;

  if (variant === 'showcase') {
    return <ShowcasePackages title={title} subtitle={sectionContent.subtitle} packages={packages} />;
  }

  return (
    <div className="section-padding bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
          {sectionContent.subtitle && (
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">{sectionContent.subtitle}</p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group variant-card bg-card overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
            >
              {/* Cover Image */}
              <div className="relative aspect-[16/10] overflow-hidden">
                {pkg.image ? (
                  <Image
                    src={pkg.image}
                    alt={pkg.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <svg className="w-12 h-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
                {/* Category badge */}
                {pkg.category && (
                  <div className="absolute top-3 left-3">
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-primary/90 text-primary-foreground backdrop-blur-sm">
                      {pkg.category}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-semibold text-lg line-clamp-2">{pkg.name}</h3>

                {/* Destination */}
                {pkg.destination && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {pkg.destination}
                  </p>
                )}

                {/* Duration */}
                {pkg.duration && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {pkg.duration}
                  </p>
                )}

                {/* Highlights */}
                {pkg.highlights && pkg.highlights.length > 0 && (
                  <ul className="mt-3 space-y-1">
                    {pkg.highlights.slice(0, 3).map((highlight, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-1.5">
                        <svg className="w-4 h-4 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="line-clamp-1">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Footer: Price + Services */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                  {pkg.price ? (
                    <p className="font-semibold text-primary">{pkg.price}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Consultar precio</p>
                  )}
                  {pkg.servicesCount != null && pkg.servicesCount > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {pkg.servicesCount} {pkg.servicesCount === 1 ? 'servicio' : 'servicios'}
                    </p>
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

// Showcase variant — themed package cards with gradient overlay, category badge, hover lift
function ShowcasePackages({ title, subtitle, packages }: { title: string; subtitle?: string; packages: PackageItem[] }) {
  return (
    <div className="section-padding bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
          {subtitle && (
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">{subtitle}</p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className="group block rounded-2xl overflow-hidden bg-card border border-border flex flex-col"
            >
              {/* Image with gradient overlay */}
              <div className="relative h-48 overflow-hidden">
                {pkg.image ? (
                  <Image
                    src={pkg.image}
                    alt={pkg.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <svg className="w-12 h-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                {/* Category badge */}
                {pkg.category && (
                  <div className="absolute top-3 left-3">
                    <span className="text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full backdrop-blur-sm bg-background/60 border border-border/50 text-muted-foreground font-mono">
                      {pkg.category}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-1">
                <h3 className="font-semibold text-xl leading-tight mb-2">{pkg.name}</h3>

                {/* Meta: destination + duration */}
                <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
                  {pkg.destination && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                      {pkg.destination}
                    </span>
                  )}
                  {pkg.duration && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {pkg.duration}
                    </span>
                  )}
                </div>

                {/* Highlights */}
                {pkg.highlights && pkg.highlights.length > 0 && (
                  <ul className="space-y-1.5 mb-4">
                    {pkg.highlights.slice(0, 3).map((h, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <svg className="w-3 h-3 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {h}
                      </li>
                    ))}
                  </ul>
                )}

                {/* Spacer */}
                <div className="flex-1" />

                {/* Footer */}
                <div className="pt-3 flex items-center justify-between border-t border-border">
                  {pkg.price ? (
                    <span className="font-semibold text-xl text-primary">{pkg.price}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Consultar</span>
                  )}
                  <span className="text-[10px] uppercase tracking-wider text-primary font-mono">
                    Ver Paquete →
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
