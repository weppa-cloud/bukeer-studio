'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { MobileCardCarousel } from '@/components/ui/card-carousel';

interface PackagesSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface PackageItem {
  id: string;
  slug?: string;
  name: string;
  image?: string;
  destination?: string;
  duration?: string;
  price?: string;
  description?: string;
  category?: string;
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

  if (packages.length === 0) return null;

  if (variant === 'carousel') {
    return (
      <section className="section-padding" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-card) 22%, var(--bg))' }}>
        <div className="container">
          <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />

          <MobileCardCarousel
            items={packages}
            ariaLabel="Carrusel de paquetes"
            getItemKey={(pkg) => pkg.id}
            itemWidthClassName="w-[88%] sm:w-[72%]"
            renderItem={(pkg, index) => <PackageCard pkg={pkg} index={index} subdomain={website.subdomain} />}
          />

          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg, index) => (
              <PackageCard key={pkg.id} pkg={pkg} index={index} subdomain={website.subdomain} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="section-padding" style={{ backgroundColor: 'color-mix(in srgb, var(--bg-card) 22%, var(--bg))' }}>
      <div className="container">
        <SectionHeading eyebrow={eyebrow} title={title} subtitle={subtitle} />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg, index) => (
            <PackageCard key={pkg.id} pkg={pkg} index={index} subdomain={website.subdomain} />
          ))}
        </div>
      </div>
    </section>
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

function PackageCard({ pkg, index, subdomain }: { pkg: PackageItem; index: number; subdomain: string }) {
  const detailTarget = (pkg.slug || pkg.id || '').trim();
  const detailHref = detailTarget ? `/site/${subdomain}/paquetes/${encodeURIComponent(detailTarget)}` : '#cta';

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
        whileHover={{ y: -4 }}
        className="group rounded-[20px] overflow-hidden flex flex-col"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="relative h-52 overflow-hidden">
          {pkg.image ? (
            <Image src={pkg.image} alt={pkg.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="w-full h-full" style={{ backgroundColor: 'var(--bg-card)' }} />
          )}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, var(--card-gradient), transparent)' }} />
          {pkg.category && (
            <div className="absolute top-3 left-3">
              <span
                className="font-mono text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full"
                style={{ backgroundColor: 'var(--card-badge-bg)', border: '1px solid var(--card-badge-border)', color: 'var(--card-badge-text)' }}
              >
                {pkg.category}
              </span>
            </div>
          )}
        </div>

        <div className="p-5 flex flex-col flex-1">
          {(pkg.duration || pkg.destination) && (
            <div className="mb-3 flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              {pkg.duration && <span>{pkg.duration}</span>}
              {pkg.destination && <span className="line-clamp-1">{pkg.destination}</span>}
            </div>
          )}

          <h3 className="product-card-title mb-3 line-clamp-2" style={{ color: 'var(--text-heading)' }}>
            {pkg.name}
          </h3>

          <p className="text-sm leading-relaxed mb-5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
            {pkg.description?.trim() || 'Experiencia completa diseñada por expertos locales.'}
          </p>

          <div className="flex-1" />

          <div className="pt-4 flex items-end justify-between gap-4" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
                Desde
              </p>
              <p className="product-price mt-1" style={{ color: 'var(--accent)' }}>
                {pkg.price || 'Consultar'}
              </p>
            </div>
            <span className="font-mono text-xs uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
              Ver paquete ›
            </span>
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
