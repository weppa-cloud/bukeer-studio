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
  rating?: number;
  reviewCount?: number;
  maxGroup?: number;
  badge?: string;
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

// Showcase variant — pixel-perfect match with theme reference using bridge CSS variables
function ShowcasePackages({ title, subtitle, packages }: { title: string; subtitle?: string; packages: PackageItem[] }) {
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg, index) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -4 }}
              className="group block rounded-2xl overflow-hidden flex flex-col"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
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
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--card-gradient), transparent)' }} />
                {/* Category badge */}
                {pkg.category && (
                  <div className="absolute top-3 left-3">
                    <span
                      className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full backdrop-blur-sm"
                      style={{ backgroundColor: 'var(--card-badge-bg)', border: '1px solid var(--card-badge-border)', color: 'var(--card-badge-text)' }}
                    >
                      {pkg.category}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="text-xl leading-tight" style={{ color: 'var(--text-heading)' }}>{pkg.name}</h3>
                  {pkg.rating && (
                    <div className="flex items-center gap-1 shrink-0">
                      <svg className="w-3 h-3 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-heading)' }}>{pkg.rating}</span>
                      {pkg.reviewCount && (
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>({pkg.reviewCount})</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Meta: destination + duration + group size */}
                <div className="flex items-center gap-3 mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
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
                  {pkg.maxGroup && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Max {pkg.maxGroup}
                    </span>
                  )}
                  {pkg.servicesCount != null && pkg.servicesCount > 0 && (
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                      {pkg.servicesCount} servicios
                    </span>
                  )}
                </div>

                {/* Highlights */}
                {pkg.highlights && pkg.highlights.length > 0 && (
                  <ul className="space-y-1.5 mb-4">
                    {pkg.highlights.slice(0, 3).map((h, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <svg className="w-3 h-3 text-green-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {h}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex-1" />

                {/* Footer */}
                <div className="pt-3 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                  {pkg.price ? (
                    <span className="text-xl" style={{ color: 'var(--accent)' }}>{pkg.price}</span>
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Consultar</span>
                  )}
                  <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
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
