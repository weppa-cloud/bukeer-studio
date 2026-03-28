'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface PackagesSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function PackagesSection({ section }: PackagesSectionProps) {
  const sectionContent = section.content as {
    title?: string;
    subtitle?: string;
    packages?: Array<{
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
    }>;
  };

  const title = sectionContent.title || 'Paquetes Destacados';
  const packages = sectionContent.packages || [];

  if (packages.length === 0) return null;

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
