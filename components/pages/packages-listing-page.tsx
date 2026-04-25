'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { getBasePath } from '@/lib/utils/base-path';
import { PackageCard } from '@/components/site/sections/packages-section';
import type { PackageItem } from '@/components/site/sections/packages-section';
import { toPackageItems } from '@/lib/products/to-items';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { ProductData } from '@bukeer/website-contract';
import { localeToLanguage, normalizeLocale } from '@/lib/seo/locale-routing';
import { convertCurrencyAmount } from '@/lib/site/currency';
import { usePreferredCurrency } from '@/lib/site/use-preferred-currency';
import { supabaseImageUrl } from '@/lib/images/supabase-transform';

interface PackagesListingPageProps {
  website: WebsiteData;
  packages: ProductData[];
}

function parseNumericPrice(price?: string): number | null {
  if (!price) return null;
  const cleaned = price.replace(/[^0-9]/g, '');
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

type SortOption = 'popular' | 'price-asc' | 'price-desc' | 'duration' | 'newest';

export function PackagesListingPage({ website, packages }: PackagesListingPageProps) {
  const isCustomDomain = Boolean((website as WebsiteData & { isCustomDomain?: boolean }).isCustomDomain);
  const basePath = getBasePath(website.subdomain, isCustomDomain);
  const siteName = website.content?.account?.name || website.content?.siteName || website.subdomain;

  const [activeDestination, setActiveDestination] = useState<string>('all');
  const [activePriceRange, setActivePriceRange] = useState<string>('all');
  const [activeDuration, setActiveDuration] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [showFilters, setShowFilters] = useState(false);

  const packageItems = useMemo(
    () => toPackageItems(packages, 0) as unknown as PackageItem[],
    [packages]
  );
  const { currencyConfig, preferredCurrency } = usePreferredCurrency(website.content.account);

  const getComparablePrice = (item: PackageItem): number | null => {
    if (typeof item.priceValue === 'number' && Number.isFinite(item.priceValue) && item.priceValue > 0) {
      const sourceCurrency = item.priceCurrency ?? null;
      const targetCurrency = preferredCurrency ?? sourceCurrency;
      return convertCurrencyAmount(item.priceValue, sourceCurrency, targetCurrency, currencyConfig);
    }
    return parseNumericPrice(item.price);
  };

  // Extract unique destinations
  const uniqueDestinations = useMemo(() => {
    const dests = packageItems
      .map((p) => p.destination)
      .filter((d): d is string => Boolean(d?.trim()));
    return [...new Set(dests)].sort();
  }, [packageItems]);

  // Extract duration ranges
  const durationOptions = useMemo(() => {
    const durations = packageItems
      .map((p) => {
        if (!p.duration) return 0;
        const match = p.duration.match(/(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter((d) => d > 0);

    const hasDurations = durations.length > 0;
    if (!hasDurations) return [];

    const options: { label: string; value: string }[] = [];
    if (durations.some((d) => d <= 3)) options.push({ label: '1-3 días', value: '1-3' });
    if (durations.some((d) => d >= 4 && d <= 7)) options.push({ label: '4-7 días', value: '4-7' });
    if (durations.some((d) => d >= 8 && d <= 14)) options.push({ label: '8-14 días', value: '8-14' });
    if (durations.some((d) => d > 14)) options.push({ label: '15+ días', value: '15+' });
    return options;
  }, [packageItems]);

  // Price range options
  const priceOptions = useMemo(() => {
    const prices = packageItems
      .map((p) => getComparablePrice(p))
      .filter((n): n is number => n !== null && n > 0);
    if (prices.length === 0) return [];

    return [
      { label: 'Económico', value: 'budget' },
      { label: 'Medio', value: 'mid' },
      { label: 'Premium', value: 'premium' },
    ];
  }, [packageItems, preferredCurrency, currencyConfig]);

  // Filter logic
  const filteredPackages = useMemo(() => {
    let items = [...packageItems];

    if (activeDestination !== 'all') {
      items = items.filter((p) => p.destination === activeDestination);
    }

    if (activePriceRange !== 'all') {
      items = items.filter((p) => {
        const n = getComparablePrice(p);
        if (n === null) return false;
        switch (activePriceRange) {
          case 'budget': return n <= 500;
          case 'mid': return n > 500 && n <= 1500;
          case 'premium': return n > 1500;
          default: return true;
        }
      });
    }

    if (activeDuration !== 'all') {
      items = items.filter((p) => {
        if (!p.duration) return false;
        const match = p.duration.match(/(\d+)/);
        if (!match) return false;
        const d = parseInt(match[1], 10);
        switch (activeDuration) {
          case '1-3': return d >= 1 && d <= 3;
          case '4-7': return d >= 4 && d <= 7;
          case '8-14': return d >= 8 && d <= 14;
          case '15+': return d >= 15;
          default: return true;
        }
      });
    }

    // Sort
    switch (sortBy) {
      case 'price-asc':
        items.sort((a, b) => (getComparablePrice(a) || 0) - (getComparablePrice(b) || 0));
        break;
      case 'price-desc':
        items.sort((a, b) => (getComparablePrice(b) || 0) - (getComparablePrice(a) || 0));
        break;
      case 'duration':
        items.sort((a, b) => {
          const dA = a.duration?.match(/(\d+)/)?.[1];
          const dB = b.duration?.match(/(\d+)/)?.[1];
          return (parseInt(dA || '0', 10)) - (parseInt(dB || '0', 10));
        });
        break;
      case 'newest':
        items.sort((a, b) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
          return dateB - dateA;
        });
        break;
      case 'popular':
      default:
        // Featured first, then rest
        items.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
        break;
    }

    return items;
  }, [
    packageItems,
    activeDestination,
    activePriceRange,
    activeDuration,
    sortBy,
    preferredCurrency,
    currencyConfig,
  ]);

  const anyFilterActive = activeDestination !== 'all' || activePriceRange !== 'all' || activeDuration !== 'all';

  function clearFilters() {
    setActiveDestination('all');
    setActivePriceRange('all');
    setActiveDuration('all');
  }

  // Pick hero image from first featured package or first package
  const heroPackage = packageItems.find((p) => p.featured) || packageItems[0];
  const heroImage = heroPackage?.image;

  // Editorial quote
  const editorialQuote = heroPackage?.destination
    ? `Descubre ${heroPackage.destination} y más destinos únicos.`
    : 'Viajes diseñados para crear recuerdos extraordinarios.';

  // JSON-LD
  const baseUrl = website.custom_domain
    ? `https://${website.custom_domain}`
    : `https://${website.subdomain}.bukeer.com`;
  const websiteLocale =
    (website as WebsiteData & { default_locale?: string; defaultLocale?: string }).default_locale ??
    (website as WebsiteData & { default_locale?: string; defaultLocale?: string }).defaultLocale ??
    website.content?.locale ??
    'es-CO';
  const normalizedSchemaLocale = normalizeLocale(websiteLocale, 'es-CO');
  const schemaLanguage = localeToLanguage(normalizedSchemaLocale);
  const isEnglishSchema = schemaLanguage === 'en';
  const packagesLabel = isEnglishSchema ? 'Packages' : 'Paquetes';
  const packagesSegment = isEnglishSchema ? 'packages' : 'paquetes';
  const homeLabel = isEnglishSchema ? 'Home' : 'Inicio';
  const collectionDescription = isEnglishSchema
    ? `Discover curated travel packages by ${siteName}. All-in-one unique experiences.`
    : `Descubre los paquetes de viaje curados por ${siteName}. Experiencias únicas todo incluido.`;

  const jsonLdSchemas = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      inLanguage: normalizedSchemaLocale,
      name: `${packagesLabel} | ${siteName}`,
      description: collectionDescription,
      url: `${baseUrl}/${packagesSegment}`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: packageItems.length,
        itemListElement: packageItems.slice(0, 10).map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: p.name,
          url: `${baseUrl}/${packagesSegment}/${p.slug || ''}`,
        })),
      },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      inLanguage: normalizedSchemaLocale,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: homeLabel, item: baseUrl },
        { '@type': 'ListItem', position: 2, name: packagesLabel },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'TravelAgency',
      name: siteName,
      url: baseUrl,
      inLanguage: normalizedSchemaLocale,
    },
  ];

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
        style={{ background: 'linear-gradient(135deg, var(--bg) 0%, color-mix(in srgb, var(--accent) 6%, var(--bg)) 100%)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 lg:pt-32 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: Editorial text */}
            <div>
              <span
                className="font-mono text-xs tracking-[0.25em] uppercase"
                style={{ color: 'var(--accent)' }}
              >
                Viajes a tu medida
              </span>
              <h1
                className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1]"
                style={{ color: 'var(--text-heading)' }}
              >
                Paquetes{' '}
                <em
                  className="not-italic font-serif"
                  style={{ color: 'var(--accent)' }}
                >
                  Curados
                </em>
              </h1>
              <p
                className="mt-6 text-lg leading-relaxed max-w-lg"
                style={{ color: 'var(--text-secondary)' }}
              >
                Descubre itinerarios diseñados por expertos locales. Cada paquete combina lo mejor de
                cada destino en una experiencia completa y sin complicaciones.
              </p>
            </div>

            {/* Right: Hero image + editorial card */}
            <div
              className="relative pb-10"
            >
              {heroImage && (
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                  <Image
                    src={supabaseImageUrl(heroImage, { width: 900, quality: 74 })}
                    alt={heroPackage?.name || 'Paquete destacado'}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                    priority
                  />
                  <div
                    className="absolute inset-0"
                    style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.3), transparent 50%)' }}
                  />
                </div>
              )}

              {/* Floating editorial card */}
              <div
                className="absolute -bottom-6 -left-4 sm:left-6 max-w-xs p-5 rounded-xl shadow-xl"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0" style={{ color: 'var(--accent)' }}>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                      Selección Editorial
                    </p>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {editorialQuote}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FILTER BAR ─── */}
      <section
        className="sticky top-0 z-30 border-b"
        style={{
          background: 'color-mix(in srgb, var(--bg) 95%, transparent)',
          backdropFilter: 'blur(12px)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Desktop filters */}
          <div className="hidden md:flex items-center gap-4">
            {/* Destination */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Destino
              </label>
              <select
                value={activeDestination}
                onChange={(e) => setActiveDestination(e.target.value)}
                className="pl-3 pr-8 py-2 rounded-lg text-sm cursor-pointer min-w-[160px]"
                style={{
                  backgroundColor: activeDestination !== 'all' ? 'color-mix(in srgb, var(--accent) 10%, var(--bg-card))' : 'var(--bg-card)',
                  color: 'var(--text-heading)',
                  border: `1px solid ${activeDestination !== 'all' ? 'var(--accent)' : 'var(--border-medium)'}`,
                }}
              >
                <option value="all">Todos los destinos</option>
                {uniqueDestinations.map((dest) => (
                  <option key={dest} value={dest}>{dest}</option>
                ))}
              </select>
            </div>

            {/* Price range */}
            {priceOptions.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Presupuesto
                </label>
                <select
                  value={activePriceRange}
                  onChange={(e) => setActivePriceRange(e.target.value)}
                  className="pl-3 pr-8 py-2 rounded-lg text-sm cursor-pointer min-w-[140px]"
                  style={{
                    backgroundColor: activePriceRange !== 'all' ? 'color-mix(in srgb, var(--accent) 10%, var(--bg-card))' : 'var(--bg-card)',
                    color: 'var(--text-heading)',
                    border: `1px solid ${activePriceRange !== 'all' ? 'var(--accent)' : 'var(--border-medium)'}`,
                  }}
                >
                  <option value="all">Cualquier precio</option>
                  {priceOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Duration */}
            {durationOptions.length > 0 && (
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Duración
                </label>
                <select
                  value={activeDuration}
                  onChange={(e) => setActiveDuration(e.target.value)}
                  className="pl-3 pr-8 py-2 rounded-lg text-sm cursor-pointer min-w-[140px]"
                  style={{
                    backgroundColor: activeDuration !== 'all' ? 'color-mix(in srgb, var(--accent) 10%, var(--bg-card))' : 'var(--bg-card)',
                    color: 'var(--text-heading)',
                    border: `1px solid ${activeDuration !== 'all' ? 'var(--accent)' : 'var(--border-medium)'}`,
                  }}
                >
                  <option value="all">Cualquier duración</option>
                  {durationOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex-1" />

            {/* Clear filters */}
            {anyFilterActive && (
              <button
                onClick={clearFilters}
                className="text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                style={{
                  color: 'var(--accent)',
                  backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                }}
              >
                Limpiar filtros ×
              </button>
            )}

            {/* Sort */}
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Ordenar
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="appearance-none px-3 pr-8 py-2 rounded-lg text-sm cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-heading)',
                  border: '1px solid var(--border-medium)',
                }}
              >
                <option value="popular">Popular</option>
                <option value="price-asc">Precio: menor</option>
                <option value="price-desc">Precio: mayor</option>
                <option value="duration">Duración</option>
                <option value="newest">Más recientes</option>
              </select>
            </div>
          </div>

          {/* Mobile filters */}
          <div className="md:hidden">
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {filteredPackages.length} {filteredPackages.length === 1 ? 'paquete' : 'paquetes'}
                {anyFilterActive && ' encontrados'}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium"
                  style={{
                    backgroundColor: anyFilterActive ? 'color-mix(in srgb, var(--accent) 10%, var(--bg-card))' : 'var(--bg-card)',
                    color: 'var(--text-heading)',
                    border: `1px solid ${anyFilterActive ? 'var(--accent)' : 'var(--border-medium)'}`,
                  }}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                  </svg>
                  Filtros
                  {anyFilterActive && (
                    <span
                      className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center"
                      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
                    >
                      !
                    </span>
                  )}
                </button>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="appearance-none px-3 py-2 rounded-lg text-sm cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-heading)',
                    border: '1px solid var(--border-medium)',
                  }}
                >
                  <option value="popular">Popular</option>
                  <option value="price-asc">Menor precio</option>
                  <option value="price-desc">Mayor precio</option>
                  <option value="newest">Recientes</option>
                </select>
              </div>
            </div>

            {/* Mobile expanded filters */}
            {showFilters && (
              <div className="overflow-hidden">
                <div className="pt-4 grid grid-cols-1 gap-3">
                  <select
                    value={activeDestination}
                    onChange={(e) => setActiveDestination(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-heading)',
                      border: '1px solid var(--border-medium)',
                    }}
                  >
                    <option value="all">Todos los destinos</option>
                    {uniqueDestinations.map((dest) => (
                      <option key={dest} value={dest}>{dest}</option>
                    ))}
                  </select>
                  {priceOptions.length > 0 && (
                    <select
                      value={activePriceRange}
                      onChange={(e) => setActivePriceRange(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-heading)',
                        border: '1px solid var(--border-medium)',
                      }}
                    >
                      <option value="all">Cualquier precio</option>
                      {priceOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                  {durationOptions.length > 0 && (
                    <select
                      value={activeDuration}
                      onChange={(e) => setActiveDuration(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-sm"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-heading)',
                        border: '1px solid var(--border-medium)',
                      }}
                    >
                      <option value="all">Cualquier duración</option>
                      {durationOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                  {anyFilterActive && (
                    <button
                      onClick={clearFilters}
                      className="text-sm font-medium py-2"
                      style={{ color: 'var(--accent)' }}
                    >
                      Limpiar filtros ×
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ─── RESULTS COUNT (desktop) ─── */}
      <div className="hidden md:block max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-2">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {filteredPackages.length} {filteredPackages.length === 1 ? 'paquete' : 'paquetes'}
          {anyFilterActive && ' encontrados'}
        </p>
      </div>

      {/* ─── PACKAGE GRID ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-16">
        {filteredPackages.length === 0 ? (
          <EmptyState onClear={clearFilters} hasFilters={anyFilterActive} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPackages.map((pkg, i) => (
              <PackageCard
                key={pkg.id}
                pkg={pkg}
                index={i}
                subdomain={website.subdomain}
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
        className="relative overflow-hidden"
        style={{ backgroundColor: 'var(--accent)' }}
      >
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-20 text-center">
          <div>
            <h2
              className="text-3xl sm:text-4xl font-bold mb-4"
              style={{ color: 'var(--accent-text)' }}
            >
              ¿No encuentras tu viaje ideal?
            </h2>
            <p
              className="text-lg mb-8 max-w-xl mx-auto opacity-90"
              style={{ color: 'var(--accent-text)' }}
            >
              Nuestros expertos pueden diseñar un itinerario personalizado para ti.
              Cuéntanos tu destino soñado.
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
      <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 10%, var(--bg))' }}>
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: 'var(--accent)' }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
      </div>
      <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-heading)' }}>
        No se encontraron paquetes
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
