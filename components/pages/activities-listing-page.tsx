'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { getBasePath } from '@/lib/utils/base-path';
import { ActivityCard } from '@/components/site/sections/activities-section';
import type { ActivityItem } from '@/components/site/sections/activities-section';
import { toActivityItems } from '@/lib/products/to-items';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { ProductData } from '@bukeer/website-contract';
import { localeToLanguage, normalizeLocale } from '@/lib/seo/locale-routing';
import { usePreferredCurrency } from '@/lib/site/use-preferred-currency';
import { supabaseImageUrl } from '@/lib/images/supabase-transform';

interface ActivitiesListingPageProps {
  website: WebsiteData;
  activities: ProductData[];
}

export function ActivitiesListingPage({ website, activities }: ActivitiesListingPageProps) {
  const isCustomDomain = Boolean((website as WebsiteData & { isCustomDomain?: boolean }).isCustomDomain);
  const basePath = getBasePath(website.subdomain, isCustomDomain);
  const { currencyConfig, preferredCurrency } = usePreferredCurrency(website.content.account);
  const websiteLocale =
    (website as WebsiteData & { default_locale?: string; defaultLocale?: string }).default_locale ??
    (website as WebsiteData & { default_locale?: string; defaultLocale?: string }).defaultLocale ??
    website.content?.locale ??
    'es-CO';

  const [activeCategory, setActiveCategory] = useState<string>('Todos');
  const [activeDifficulty, setActiveDifficulty] = useState<string>('Todos');
  const [activeLocation, setActiveLocation] = useState<string>('Todos');

  const activityItems = useMemo(
    () => toActivityItems(activities, 0) as unknown as ActivityItem[],
    [activities]
  );

  const uniqueCategories = useMemo(() => {
    const cats = activityItems.map((a) => a.category).filter((c): c is string => Boolean(c?.trim()));
    return [...new Set(cats)];
  }, [activityItems]);

  const uniqueLocations = useMemo(() => {
    const locs = activityItems.map((a) => a.location).filter((l): l is string => Boolean(l?.trim()));
    return [...new Set(locs)];
  }, [activityItems]);

  const showLocationFilter = uniqueLocations.length >= 2;

  const filteredActivities = useMemo(() => {
    return activityItems.filter((a) => {
      if (activeCategory !== 'Todos' && a.category !== activeCategory) return false;
      if (activeDifficulty !== 'Todos' && a.difficulty !== activeDifficulty) return false;
      if (activeLocation !== 'Todos' && a.location !== activeLocation) return false;
      return true;
    });
  }, [activityItems, activeCategory, activeDifficulty, activeLocation]);

  const anyFilterActive =
    activeCategory !== 'Todos' || activeDifficulty !== 'Todos' || activeLocation !== 'Todos';

  function clearFilters() {
    setActiveCategory('Todos');
    setActiveDifficulty('Todos');
    setActiveLocation('Todos');
  }

  // JSON-LD schemas
  const siteName = website.content?.account?.name || website.content?.siteName || website.subdomain;
  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${website.subdomain}.bukeer.com`;
  const normalizedSchemaLocale = normalizeLocale(websiteLocale, 'es-CO');
  const schemaLanguage = localeToLanguage(normalizedSchemaLocale);
  const isEnglishSchema = schemaLanguage === 'en';
  const activitiesSegment = isEnglishSchema ? 'activities' : 'actividades';
  const activitiesLabel = isEnglishSchema ? 'Activities' : 'Actividades';
  const homeLabel = isEnglishSchema ? 'Home' : 'Inicio';
  const collectionDescription = isEnglishSchema
    ? `Discover all activities and experiences available with ${siteName}.`
    : `Descubre todas las actividades y experiencias disponibles con ${siteName}.`;

  const jsonLdSchemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      inLanguage: normalizedSchemaLocale,
      name: `${activitiesLabel} | ${siteName}`,
      description: collectionDescription,
      url: `${baseUrl}/${activitiesSegment}`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: activityItems.length,
        itemListElement: activityItems.slice(0, 10).map((a, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: a.name,
          url: `${baseUrl}/${activitiesSegment}/${a.slug || ''}`,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      inLanguage: normalizedSchemaLocale,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: homeLabel, item: baseUrl },
        { '@type': 'ListItem', position: 2, name: activitiesLabel },
      ],
    },
  ];

  // Hero image from first activity with an image
  const heroActivity = activityItems.find((a) => a.image) || activityItems[0];
  const heroImage = heroActivity?.image;

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* JSON-LD */}
      {jsonLdSchemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
      ))}

      {/* ─── EDITORIAL HERO ─── */}
      <section
        className="relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, var(--bg) 0%, color-mix(in srgb, var(--accent) 6%, var(--bg)) 100%)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 lg:pt-32 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Editorial text */}
            <div>
              <span
                className="font-mono text-xs tracking-[0.25em] uppercase"
                style={{ color: 'var(--accent)' }}
              >
                Experiencias Inolvidables
              </span>
              <h1
                className="mt-4 text-3xl sm:text-5xl lg:text-6xl font-bold leading-[1.1]"
                style={{ color: 'var(--text-heading)' }}
              >
                Experiencias{' '}
                <em
                  className="not-italic font-serif"
                  style={{ color: 'var(--accent)' }}
                >
                  Únicas
                </em>
              </h1>
              <p
                className="mt-6 text-lg leading-relaxed max-w-lg"
                style={{ color: 'var(--text-secondary)' }}
              >
                Descubre actividades diseñadas para conectarte con la cultura, la naturaleza
                y las tradiciones de cada destino.
              </p>
            </div>

            {/* Right: Hero image + floating testimonial card */}
            <div
              className="relative mt-8 lg:mt-0"
            >
              {heroImage ? (
                <div className="relative aspect-[16/9] lg:aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src={supabaseImageUrl(heroImage, { width: 900, quality: 74 })}
                    alt={heroActivity?.name || 'Actividad destacada'}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.35), transparent 50%)' }}
                  />
                </div>
              ) : (
                <div
                  className="relative aspect-[16/9] lg:aspect-[4/3] rounded-2xl shadow-2xl"
                  style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 20%, var(--bg-card)), var(--bg-card))' }}
                />
              )}

              {/* Floating quote card */}
              <div
                className="absolute -bottom-6 left-4 sm:left-6 max-w-[260px] p-4 rounded-xl shadow-xl"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="text-xl shrink-0 mt-0.5"
                    style={{ color: 'var(--accent)' }}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>
                      Más allá del mapa
                    </p>
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      Experiencias locales auténticas con guías expertos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FILTER BAR (sticky, glassmorphism) ─── */}
      <section
        className="sticky top-0 z-30 border-b"
        style={{
          background: 'color-mix(in srgb, var(--bg) 92%, transparent)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap sm:gap-3">
            {/* Category pills — horizontal scroll on mobile */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 shrink-0">
              {['Todos', ...uniqueCategories].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className="shrink-0 px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 min-h-[36px]"
                  style={{
                    backgroundColor: activeCategory === cat ? 'var(--accent)' : 'var(--bg-card)',
                    color: activeCategory === cat ? 'var(--accent-text)' : 'var(--text-secondary)',
                    border: `1px solid ${activeCategory === cat ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Difficulty pills */}
            <div className="flex gap-1.5 shrink-0">
              {['Todos', 'Fácil', 'Intensa'].map((diff) => (
                <button
                  key={diff}
                  onClick={() => setActiveDifficulty(diff)}
                  className="px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 min-h-[36px]"
                  style={{
                    backgroundColor: activeDifficulty === diff ? 'var(--accent)' : 'var(--bg-card)',
                    color: activeDifficulty === diff ? 'var(--accent-text)' : 'var(--text-secondary)',
                    border: `1px solid ${activeDifficulty === diff ? 'var(--accent)' : 'var(--border-subtle)'}`,
                  }}
                >
                  {diff}
                </button>
              ))}
            </div>

            {/* Location dropdown */}
            {showLocationFilter && (
              <select
                value={activeLocation}
                onChange={(e) => setActiveLocation(e.target.value)}
                className="px-3 py-2 rounded-full text-sm font-medium shrink-0 cursor-pointer min-h-[36px]"
                style={{
                  backgroundColor: activeLocation !== 'Todos' ? 'color-mix(in srgb, var(--accent) 10%, var(--bg-card))' : 'var(--bg-card)',
                  color: activeLocation !== 'Todos' ? 'var(--accent)' : 'var(--text-secondary)',
                  border: `1px solid ${activeLocation !== 'Todos' ? 'var(--accent)' : 'var(--border-subtle)'}`,
                }}
              >
                <option value="Todos">Todos los lugares</option>
                {uniqueLocations.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            )}

            {/* Spacer */}
            <div className="flex-1 hidden sm:block" />

            {/* Clear filters */}
            {anyFilterActive && (
              <button
                onClick={clearFilters}
                className="text-sm font-medium shrink-0 px-3 py-2 rounded-full min-h-[36px] transition-colors"
                style={{
                  color: 'var(--accent)',
                  backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                }}
              >
                Limpiar filtros ×
              </button>
            )}

            {/* Results count */}
            <span className="text-sm shrink-0" style={{ color: 'var(--text-muted)' }}>
              {filteredActivities.length}{' '}
              {filteredActivities.length === 1 ? 'actividad' : 'actividades'}
            </span>
          </div>
        </div>
      </section>

      {/* ─── MAIN CONTENT ─── */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto py-8">
        {filteredActivities.length === 0 ? (
          <EmptyState onClear={clearFilters} hasFilters={anyFilterActive} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredActivities.map((activity, i) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                index={i}
                subdomain={website.subdomain}
                locale={websiteLocale}
                basePath={basePath}
                preferredCurrency={preferredCurrency}
                currencyConfig={currencyConfig}
              />
            ))}
          </div>
        )}
      </section>

      {/* ─── CTA SECTION ─── */}
      <section
        className="relative overflow-hidden mt-8"
        style={{ backgroundColor: 'var(--accent)' }}
      >
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 text-center">
          <div>
            <h2
              className="text-3xl sm:text-4xl font-bold mb-4"
              style={{ color: 'var(--accent-text)' }}
            >
              ¿Buscas algo especial?
            </h2>
            <p
              className="text-lg mb-8 max-w-xl mx-auto opacity-90"
              style={{ color: 'var(--accent-text)' }}
            >
              Creamos experiencias a tu medida. Cuéntanos qué tipo de aventura buscas.
            </p>
            <a
              href={`${basePath}/#contacto`}
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
              style={{
                backgroundColor: 'var(--accent-text)',
                color: 'var(--accent)',
              }}
            >
              Planear mi viaje
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function EmptyState({ onClear, hasFilters }: { onClear: () => void; hasFilters: boolean }) {
  return (
    <div className="text-center py-24">
      <div
        className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
        style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, var(--bg))' }}
      >
        <svg
          className="w-8 h-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
          style={{ color: 'var(--accent)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
      <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-heading)' }}>
        No se encontraron actividades
      </p>
      <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
        Intenta ajustar los filtros para ver más opciones.
      </p>
      {hasFilters && (
        <button
          onClick={onClear}
          className="px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-200"
          style={{
            backgroundColor: 'var(--accent)',
            color: 'var(--accent-text)',
          }}
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}
