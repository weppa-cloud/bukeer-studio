'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { MobileCardCarousel } from '@/components/ui/card-carousel';
import { formatCircuitStops, getPackageCircuitStops, type PackageItineraryItem } from '@/lib/products/package-circuit';

interface PackagesSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export interface PackageItem {
  id: string;
  slug?: string;
  name: string;
  image?: string;
  destination?: string;
  duration?: string;
  price?: string;
  description?: string;
  category?: string;
  highlights?: string[];
  itinerary_items?: PackageItineraryItem[];
  featured?: boolean;
  created_at?: string;
}

export function PackagesSection({ section, website }: PackagesSectionProps) {
  const sectionContent = section.content as {
    eyebrow?: string;
    title?: string;
    subtitle?: string;
    packages?: PackageItem[];
  };

  const variant = section.variant || 'default';
  const title = sectionContent.title || 'Paquetes de Viaje';
  const subtitle = sectionContent.subtitle;
  const eyebrow = sectionContent.eyebrow || 'Experiencias Curadas';
  const packages = sectionContent.packages || [];

  // Destination filter state
  const [activeDestination, setActiveDestination] = useState<string>('Todos');

  const uniqueDestinations = useMemo(() => {
    const destinations = packages
      .map((pkg) => pkg.destination)
      .filter((d): d is string => Boolean(d && d.trim()));
    return [...new Set(destinations)];
  }, [packages]);

  const showFilter = uniqueDestinations.length >= 2;

  const filteredPackages = useMemo(() => {
    if (activeDestination === 'Todos') return packages;
    return packages.filter((pkg) => pkg.destination === activeDestination);
  }, [packages, activeDestination]);

  if (packages.length === 0) return null;

  if (variant === 'carousel') {
    return (
      <section className="section-padding" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-card) 22%, var(--bg))' }}>
        <div className="container">
          <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />

          {showFilter && (
            <DestinationFilter
              destinations={uniqueDestinations}
              active={activeDestination}
              onSelect={setActiveDestination}
            />
          )}

          <MobileCardCarousel
            items={filteredPackages}
            ariaLabel="Carrusel de paquetes"
            getItemKey={(pkg) => pkg.id}
            itemWidthClassName="w-[88%] sm:w-[72%]"
            renderItem={(pkg, index) => <PackageCard pkg={pkg} index={index} subdomain={website.subdomain} />}
          />

          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPackages.map((pkg, index) => (
              <PackageCard key={pkg.id} pkg={pkg} index={index} subdomain={website.subdomain} />
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <Link
              href={`/site/${website.subdomain}/paquetes`}
              className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium"
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                color: 'var(--text-heading)',
              }}
            >
              Ver todos los paquetes
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-card) 22%, var(--bg))' }}>
      <div className="container">
        <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />

        {showFilter && (
          <DestinationFilter
            destinations={uniqueDestinations}
            active={activeDestination}
            onSelect={setActiveDestination}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg, index) => (
            <PackageCard key={pkg.id} pkg={pkg} index={index} subdomain={website.subdomain} />
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Link
            href={`/site/${website.subdomain}/paquetes`}
            className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-medium"
            style={{
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              color: 'var(--text-heading)',
            }}
          >
            Ver todos los paquetes
          </Link>
        </div>
      </div>
    </section>
  );
}

function DestinationFilter({
  destinations,
  active,
  onSelect,
}: {
  destinations: string[];
  active: string;
  onSelect: (dest: string) => void;
}) {
  const all = ['Todos', ...destinations];
  return (
    <div className="mb-8 flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0 md:justify-center md:flex-wrap">
      {all.map((dest) => (
        <button
          key={dest}
          onClick={() => onSelect(dest)}
          className="shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: active === dest ? 'var(--accent)' : 'var(--bg-card)',
            color: active === dest ? 'var(--accent-text)' : 'var(--text-secondary)',
            border: `1px solid ${active === dest ? 'var(--accent)' : 'var(--border-subtle)'}`,
          }}
        >
          {dest}
        </button>
      ))}
    </div>
  );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center mb-12"
    >
      <p className="font-mono text-xs tracking-[0.2em] uppercase mb-3" style={{ color: 'var(--accent)' }}>
        {eyebrow}
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

function isNew(createdAt?: string): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  return diffDays < 30;
}

export function PackageCard({ pkg, index, subdomain, basePath: overrideBasePath }: { pkg: PackageItem; index: number; subdomain: string; basePath?: string }) {
  const base = overrideBasePath ?? `/site/${subdomain}`;
  const detailSlug = (pkg.slug || '').trim();
  const detailHref = detailSlug
    ? `${base}/paquetes/${encodeURIComponent(detailSlug)}`
    : `${base}/paquetes`;
  const circuitStops = getPackageCircuitStops({
    itineraryItems: pkg.itinerary_items,
    name: pkg.name,
    destination: pkg.destination,
  });
  const circuitLabel = formatCircuitStops(circuitStops);

  const showPopular = pkg.featured === true || pkg.category === 'Popular';
  const showNew = !showPopular && isNew(pkg.created_at);

  return (
    <Link
      href={detailHref}
      className="block"
      aria-label={`Ver detalle de ${pkg.name}`}
    >
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-60px' }}
        transition={{ delay: index * 0.08, duration: 0.55 }}
        className="group rounded-xl overflow-hidden flex flex-col hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
        }}
      >
        {/* Image — 16:9 landscape */}
        <div className="relative aspect-[16/9] overflow-hidden">
          {pkg.image ? (
            <Image
              src={pkg.image}
              alt={pkg.name}
              fill
              draggable={false}
              className="object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full" style={{ backgroundColor: 'var(--bg-card)' }} />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--card-gradient), transparent)' }} />

          {/* Badge top-left: duration pill */}
          {pkg.duration && (
            <div className="absolute top-3 left-3">
              <span
                className="inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full backdrop-blur-sm"
                style={{
                  backgroundColor: 'var(--card-badge-bg)',
                  border: '1px solid var(--card-badge-border)',
                  color: 'var(--card-badge-text)',
                }}
              >
                {pkg.duration}
              </span>
            </div>
          )}

          {/* Badge top-right: POPULAR or NUEVO */}
          {(showPopular || showNew) && (
            <div className="absolute top-3 right-3">
              <span
                className="inline-flex items-center text-[10px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-full"
                style={{
                  backgroundColor: showPopular ? 'var(--accent)' : '#16a34a',
                  color: showPopular ? 'var(--accent-text)' : '#ffffff',
                }}
              >
                {showPopular ? 'POPULAR' : 'NUEVO'}
              </span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col flex-1">
          <h3 className="product-card-title font-bold mb-1 line-clamp-2" style={{ color: 'var(--text-heading)' }}>
            {pkg.name}
          </h3>

          {pkg.destination && (
            <p className="flex items-center gap-1 text-sm mb-3 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" style={{ color: 'var(--accent)' }}>
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              {pkg.destination}
            </p>
          )}

          {pkg.description && (
            <p className="text-sm leading-relaxed line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>
              {pkg.description}
            </p>
          )}

          {circuitLabel && (
            <p className="text-xs mb-3 font-medium line-clamp-1" style={{ color: 'var(--text-secondary)' }}>
              Circuito: {circuitLabel}
            </p>
          )}

          {/* Highlights pills */}
          {pkg.highlights && pkg.highlights.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {pkg.highlights.slice(0, 3).map((highlight, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'color-mix(in srgb, var(--accent) 10%, var(--bg-card))',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <svg className="w-2.5 h-2.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" style={{ color: 'var(--accent)' }}>
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  {highlight}
                </span>
              ))}
            </div>
          )}

          <div className="flex-1" />

          {/* Footer */}
          <div className="pt-4 flex items-end justify-between gap-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
                Desde
              </p>
              <p className="product-price mt-1" style={{ color: 'var(--accent)' }}>
                {pkg.price || 'Consultar'}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
              Ver paquete
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
