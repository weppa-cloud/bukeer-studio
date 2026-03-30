'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { WebsitePage, ProductData } from '@/lib/supabase/get-pages';
import { getCategoryProducts } from '@/lib/supabase/get-pages';
import { getBasePath } from '@/lib/utils/base-path';
import { CardCarousel } from '@/components/ui/card-carousel';
import { SkeletonGrid } from '@/components/ui/skeleton-card';

interface CategoryPageProps {
  website: WebsiteData;
  page: WebsitePage;
  categoryType?: string;
}

const ITEMS_PER_PAGE = 12;

// Category pills for activity listings
const ACTIVITY_CATEGORIES = ['Todos', 'City Tours', 'Naturaleza', 'Aventura', 'Nautico', 'Gastronomia'];
const STAR_RATINGS = ['Todos', '3\u2605', '4\u2605', '5\u2605'];

export function CategoryPage({ website, page, categoryType }: CategoryPageProps) {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [sortBy, setSortBy] = useState('popular');
  const [destinationFilter, setDestinationFilter] = useState('Todos');
  const [starFilter, setStarFilter] = useState('Todos');

  const heroConfig = page.hero_config || {};
  const introContent = page.intro_content || {};
  const ctaConfig = page.cta_config || {};
  const basePath = getBasePath(website.subdomain);
  const isHotel = categoryType === 'hotel' || categoryType === 'hotels';
  const isActivity = categoryType === 'activity' || categoryType === 'activities';

  useEffect(() => {
    async function fetchProducts() {
      if (!categoryType) return;
      setIsLoading(true);
      const offset = (currentPage - 1) * ITEMS_PER_PAGE;
      const result = await getCategoryProducts(website.subdomain, categoryType, {
        limit: ITEMS_PER_PAGE,
        offset,
        search: searchQuery || undefined,
      });
      setProducts(result.items);
      setTotal(result.total);
      setIsLoading(false);
    }
    fetchProducts();
  }, [website.subdomain, categoryType, currentPage, searchQuery]);

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Client-side filter + sort
  const filteredProducts = products.filter((p) => {
    // Hotel: destination filter
    if (isHotel && destinationFilter !== 'Todos') {
      if (!p.location || !p.location.toLowerCase().includes(destinationFilter.toLowerCase())) return false;
    }
    // Hotel: star filter
    if (isHotel && starFilter !== 'Todos') {
      const stars = parseInt(starFilter);
      if (!p.rating || p.rating < stars) return false;
    }
    // Activity: category filter
    if (isActivity && activeFilter !== 'Todos') {
      if (!p.name?.toLowerCase().includes(activeFilter.toLowerCase()) &&
          !p.description?.toLowerCase().includes(activeFilter.toLowerCase())) return false;
    }
    return true;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price_asc') {
      const pa = parseFloat((a.price || '0').replace(/[^0-9.]/g, '')) || 0;
      const pb = parseFloat((b.price || '0').replace(/[^0-9.]/g, '')) || 0;
      return pa - pb;
    }
    if (sortBy === 'price_desc') {
      const pa = parseFloat((a.price || '0').replace(/[^0-9.]/g, '')) || 0;
      const pb = parseFloat((b.price || '0').replace(/[^0-9.]/g, '')) || 0;
      return pb - pa;
    }
    if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
    return 0; // 'popular' keeps server order
  });

  return (
    <div className="min-h-screen">
      {/* Hero — Themed Listing Hero with eyebrow */}
      {heroConfig.backgroundImage ? (
        <section className="relative h-[40vh] min-h-[300px] flex items-center justify-center">
          <Image src={heroConfig.backgroundImage} alt={heroConfig.title || page.title} fill className="object-cover" priority />
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 text-center text-white px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">{heroConfig.title || page.title}</h1>
            {heroConfig.subtitle && <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-90">{heroConfig.subtitle}</p>}
          </div>
        </section>
      ) : (
        <section className="pt-28 pb-16">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="font-mono text-xs tracking-[0.15em] uppercase mb-3"
              style={{ color: 'var(--accent)' }}
            >
              {getCategoryLabel(categoryType)}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ fontSize: 'var(--text-display-lg)', color: 'var(--text-heading)' }}
            >
              {heroConfig.title || page.title}
            </motion.h1>
            {heroConfig.subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-base max-w-xl mx-auto mt-4"
                style={{ color: 'var(--text-secondary)' }}
              >
                {heroConfig.subtitle}
              </motion.p>
            )}
          </div>
        </section>
      )}

      {/* Intro */}
      {introContent.text && (
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>{introContent.text}</p>
          </div>
        </section>
      )}

      {/* Activity category pills */}
      {isActivity && (
        <section className="pb-10">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="flex flex-wrap gap-3 justify-center"
            >
              {ACTIVITY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(cat)}
                  className="px-5 py-2 rounded-full font-mono text-xs tracking-wider uppercase transition-colors cursor-pointer"
                  style={{
                    backgroundColor: activeFilter === cat ? 'var(--accent)' : 'var(--nav-link-hover-bg)',
                    color: activeFilter === cat ? 'var(--accent-text)' : 'var(--text-secondary)',
                    border: `1px solid ${activeFilter === cat ? 'var(--accent)' : 'var(--border-medium)'}`,
                  }}
                >
                  {cat}
                </button>
              ))}
            </motion.div>
          </div>
        </section>
      )}

      {/* Hotel filter bar — search + destination + star pills */}
      {isHotel && (
        <section className="pb-10">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center gap-4"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              {/* Search */}
              <div className="relative flex-1 w-full md:w-auto">
                <label className="font-mono text-xs tracking-wider uppercase block mb-1.5" style={{ color: 'var(--text-muted)' }}>Buscar</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Nombre del hotel..."
                    aria-label="Buscar hotel"
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-4 py-2 rounded-lg font-sans text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)', color: 'var(--text-heading)' }}
                  />
                </div>
              </div>

              {/* Destination dropdown */}
              <div className="flex-1 w-full md:w-auto">
                <label className="font-mono text-xs tracking-wider uppercase block mb-1.5" style={{ color: 'var(--text-muted)' }}>Destino</label>
                <select
                  value={destinationFilter}
                  onChange={(e) => setDestinationFilter(e.target.value)}
                  className="w-full px-4 py-2 rounded-lg font-sans text-sm outline-none appearance-none cursor-pointer"
                  style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)', color: 'var(--text-heading)' }}
                >
                  {['Todos', 'Cartagena', 'Santa Marta', 'Medellin', 'Eje Cafetero', 'San Andres', 'Bogota', 'Cali'].map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              {/* Star rating pills */}
              <div>
                <label className="font-mono text-xs tracking-wider uppercase block mb-1.5" style={{ color: 'var(--text-muted)' }}>Estrellas</label>
                <div className="flex gap-2">
                  {STAR_RATINGS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setStarFilter(r)}
                      className="px-3 py-1.5 rounded-lg font-mono text-xs transition-colors cursor-pointer"
                      style={{
                        backgroundColor: starFilter === r ? 'var(--accent)' : 'var(--nav-link-hover-bg)',
                        color: starFilter === r ? 'var(--accent-text)' : 'var(--text-secondary)',
                        border: `1px solid ${starFilter === r ? 'var(--accent)' : 'var(--border-medium)'}`,
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* Generic filter bar for other types */}
      {!isHotel && !isActivity && (
        <section className="pb-10">
          <div className="max-w-7xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center gap-4"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="relative flex-1 w-full md:w-auto">
                <label className="font-mono text-xs tracking-wider uppercase block mb-1.5" style={{ color: 'var(--text-muted)' }}>Buscar</label>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Nombre..."
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-9 pr-4 py-2 rounded-lg font-sans text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border-subtle)', color: 'var(--text-heading)' }}
                  />
                </div>
              </div>
              {/* Results count now shown in sort bar above */}
            </motion.div>
          </div>
        </section>
      )}

      {/* Sort + Results count bar */}
      <section className="pb-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {sortedProducts.length} {sortedProducts.length === 1 ? 'resultado' : 'resultados'}
          </span>
          <div className="flex items-center gap-2">
            <label className="font-mono text-[10px] tracking-wider uppercase" style={{ color: 'var(--text-muted)' }}>Ordenar:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-1.5 rounded-lg font-sans text-sm outline-none appearance-none cursor-pointer sort-select"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-heading)' }}
            >
              <option value="popular">Popular</option>
              <option value="price_asc">Precio ↑</option>
              <option value="price_desc">Precio ↓</option>
              <option value="name_asc">A — Z</option>
            </select>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <SkeletonGrid
              count={6}
              type={isHotel ? 'hotel' : isActivity ? 'activity' : 'default'}
            />
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg" style={{ color: 'var(--text-muted)' }}>No se encontraron resultados</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sortedProducts.map((product, index) => (
                isActivity
                  ? <ActivityCard key={product.id} product={product} index={index} basePath={basePath} />
                  : <StandardCard key={product.id} product={product} index={index} basePath={basePath} categoryType={categoryType} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="text-center mt-12">
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={currentPage >= totalPages}
                className="px-6 py-3 rounded-full font-sans text-sm font-medium transition-all disabled:opacity-50"
                style={{ border: '1px solid var(--border-medium)', color: 'var(--text-secondary)' }}
              >
                Cargar mas resultados
              </button>
            </div>
          )}

          <div className="text-center mt-6">
            <Link href={`${basePath}/`} className="font-mono text-xs tracking-wider uppercase" style={{ color: 'var(--accent)' }}>
              ← Volver al inicio
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      {ctaConfig.title && (
        <section className="py-16 px-4" style={{ backgroundColor: 'var(--spotlight-color)' }}>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: 'var(--text-heading)' }}>{ctaConfig.title}</h2>
            {ctaConfig.subtitle && <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>{ctaConfig.subtitle}</p>}
            {ctaConfig.buttonText && (
              <Link
                href={ctaConfig.buttonLink ? (ctaConfig.buttonLink.startsWith('http') ? ctaConfig.buttonLink : `${basePath}${ctaConfig.buttonLink}`) : `${basePath}/contacto`}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-medium transition-colors"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}
              >
                {ctaConfig.buttonText}
              </Link>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// Activity overlay card — 1:1 aspect ratio, image as background, name + price overlaid
function ActivityCard({ product, index, basePath }: { product: ProductData; index: number; basePath: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
    >
      <Link
        href={`${basePath}/actividades/${product.slug}`}
        className="group relative block rounded-2xl overflow-hidden"
        style={{ aspectRatio: '1/1' }}
      >
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-110"
          />
        ) : (
          <div className="absolute inset-0 bg-muted flex items-center justify-center">
            <span className="text-4xl">🎯</span>
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.2) 100%)' }} />
        {/* Duration badge */}
        {product.duration && (
          <div
            className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-sm font-mono text-[10px] tracking-wider"
            style={{ backgroundColor: 'var(--card-badge-bg)', border: '1px solid var(--card-badge-border)', color: 'var(--card-badge-text)' }}
          >
            <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {product.duration}
          </div>
        )}
        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <h3 className="text-xl leading-tight mb-1" style={{ color: '#fff' }}>{product.name}</h3>
          {product.price && <span className="text-lg" style={{ color: 'var(--accent)' }}>{product.price}</span>}
        </div>
      </Link>
    </motion.div>
  );
}

// Standard card — hotels, packages, destinations, transfers
function StandardCard({ product, index, basePath, categoryType }: { product: ProductData; index: number; basePath: string; categoryType?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: index * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4 }}
    >
      <Link
        href={`${basePath}/${getCategorySlug(product.type)}/${product.slug}`}
        className="group block rounded-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="relative overflow-hidden">
          {product.images && product.images.length > 1 ? (
            <CardCarousel images={product.images as string[]} alt={product.name} />
          ) : product.image ? (
            <div className="relative overflow-hidden" style={{ aspectRatio: '16/10' }}>
              <Image src={product.image} alt={product.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
            </div>
          ) : (
            <div className="flex items-center justify-center bg-muted" style={{ aspectRatio: '16/10' }}>
              <span className="text-4xl">{getProductIcon(product.type)}</span>
            </div>
          )}
          {/* Star badge for hotels */}
          {product.rating && product.rating > 0 && (
            <div
              className="absolute top-3 right-3 flex items-center gap-0.5 px-2 py-1 rounded-full backdrop-blur-sm"
              style={{ backgroundColor: 'var(--card-badge-bg)', border: '1px solid var(--card-badge-border)' }}
            >
              {Array.from({ length: product.rating }).map((_, i) => (
                <svg key={i} className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="text-lg leading-tight mb-1" style={{ color: 'var(--text-heading)' }}>{product.name}</h3>
          {product.location && (
            <div className="flex items-center gap-1 mb-3">
              <svg className="w-3 h-3" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-sans text-xs" style={{ color: 'var(--text-muted)' }}>{product.location}</span>
            </div>
          )}
          {product.description && (
            <p className="text-sm line-clamp-2 mb-3" style={{ color: 'var(--text-secondary)' }}>{product.description}</p>
          )}
          <div className="flex items-center justify-between">
            {product.price && <span className="text-lg" style={{ color: 'var(--accent)' }}>{product.price}</span>}
            <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: 'var(--accent)' }}>
              Ver {categoryType === 'hotel' || categoryType === 'hotels' ? 'Hotel' : categoryType === 'package' || categoryType === 'packages' ? 'Paquete' : 'Detalle'} →
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

// Helpers
function getCategorySlug(type: string): string {
  const m: Record<string, string> = { destination: 'destinos', hotel: 'hoteles', activity: 'actividades', transfer: 'traslados', package: 'paquetes' };
  return m[type] || type;
}

function getCategoryLabel(type?: string): string {
  const m: Record<string, string> = { destination: 'Destinos', hotel: 'Alojamiento', activity: 'Experiencias', transfer: 'Traslados', package: 'Paquetes' };
  return m[type || ''] || '';
}

function getProductIcon(type: string): string {
  const m: Record<string, string> = { destination: '🌍', hotel: '🏨', activity: '🎯', transfer: '🚐', package: '📦' };
  return m[type] || '📍';
}
