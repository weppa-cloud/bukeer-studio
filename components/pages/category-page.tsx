'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { WebsitePage, ProductData } from '@/lib/supabase/get-pages';
import { getCategoryProducts } from '@/lib/supabase/get-pages';
import { getBasePath } from '@/lib/utils/base-path';

interface CategoryPageProps {
  website: WebsiteData;
  page: WebsitePage;
  categoryType?: string;
}

const ITEMS_PER_PAGE = 12;

export function CategoryPage({ website, page, categoryType }: CategoryPageProps) {
  const [products, setProducts] = useState<ProductData[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const heroConfig = page.hero_config || {};
  const introContent = page.intro_content || {};
  const ctaConfig = page.cta_config || {};
  const basePath = getBasePath(website.subdomain);

  // Fetch products
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

  const getCategorySlug = (type: string) => {
    const mapping: Record<string, string> = {
      destination: 'destinos',
      hotel: 'hoteles',
      activity: 'actividades',
      transfer: 'traslados',
      package: 'paquetes',
    };
    return mapping[type] || type;
  };

  const getCategoryLabel = (type?: string) => {
    const labels: Record<string, string> = {
      destination: 'Destinos',
      hotel: 'Alojamiento',
      activity: 'Experiencias',
      transfer: 'Traslados',
      package: 'Paquetes',
    };
    return labels[type || ''] || '';
  };

  return (
    <div className="min-h-screen">
      {/* Hero Section — Themed Listing Hero */}
      {heroConfig.backgroundImage ? (
        <section
          className="relative h-[40vh] min-h-[300px] flex items-center justify-center"
        >
          <Image
            src={heroConfig.backgroundImage}
            alt={heroConfig.title || page.title}
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative z-10 text-center text-white px-4">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              {heroConfig.title || page.title}
            </h1>
            {heroConfig.subtitle && (
              <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-90">
                {heroConfig.subtitle}
              </p>
            )}
          </div>
        </section>
      ) : (
        <section className="pt-28 pb-16">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-xs tracking-[0.15em] uppercase mb-3 text-primary font-mono"
            >
              {getCategoryLabel(categoryType)}
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4"
            >
              {heroConfig.title || page.title}
            </motion.h1>
            {heroConfig.subtitle && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="text-base text-muted-foreground max-w-xl mx-auto"
              >
                {heroConfig.subtitle}
              </motion.p>
            )}
          </div>
        </section>
      )}

      {/* Intro Section */}
      {introContent.text && (
        <section className="py-12 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-lg text-muted-foreground">{introContent.text}</p>
            {introContent.highlights && introContent.highlights.length > 0 && (
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                {introContent.highlights.map((highlight: string, index: number) => (
                  <span
                    key={index}
                    className="px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium"
                  >
                    {highlight}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Search and Filters */}
      <section className="pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center gap-4 bg-card border border-border"
          >
            {/* Search */}
            <div className="relative flex-1 w-full md:w-auto">
              <label className="text-xs tracking-wider uppercase block mb-1.5 text-muted-foreground font-mono">
                Buscar
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="Nombre..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-9 pr-4 py-2 rounded-lg text-sm outline-none bg-background border border-border focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Results count */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{total} {total === 1 ? 'resultado' : 'resultados'}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden animate-pulse bg-card border border-border"
                >
                  <div className="h-48 bg-muted" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-muted-foreground">
                No se encontraron resultados
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-60px' }}
                  transition={{ delay: index * 0.05, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ y: -4 }}
                >
                  <Link
                    href={`${basePath}/${getCategorySlug(product.type)}/${product.slug}`}
                    className="group block rounded-2xl overflow-hidden bg-card border border-border"
                  >
                    <div className="relative aspect-[16/10] overflow-hidden">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-4xl">
                            {getProductIcon(product.type)}
                          </span>
                        </div>
                      )}
                      {/* Rating badge for hotels */}
                      {product.rating && product.rating > 0 && (
                        <div className="absolute top-3 right-3 flex items-center gap-0.5 px-2 py-1 rounded-full backdrop-blur-sm bg-background/60 border border-border/50">
                          {Array.from({ length: product.rating }).map((_, i) => (
                            <svg key={i} className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      )}
                      {/* Duration badge for activities */}
                      {product.duration && (
                        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full backdrop-blur-sm bg-background/60 border border-border/50">
                          <svg className="w-2.5 h-2.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-[10px] tracking-wider text-muted-foreground font-mono">
                            {product.duration}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-lg leading-tight mb-1 group-hover:text-primary transition-colors">
                        {product.name}
                      </h3>
                      {product.location && (
                        <div className="flex items-center gap-1 mb-2">
                          <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-xs text-muted-foreground">{product.location}</span>
                        </div>
                      )}
                      {product.country && !product.location && (
                        <p className="text-xs text-muted-foreground mb-2">
                          {product.city ? `${product.city}, ` : ''}
                          {product.country}
                        </p>
                      )}
                      {product.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {product.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        {product.price && (
                          <span className="font-semibold text-lg text-primary">{product.price}</span>
                        )}
                        <span className="text-[10px] uppercase tracking-wider text-primary font-mono">
                          Ver {getCategoryLabel(product.type) === 'Alojamiento' ? 'Hotel' : 'Detalle'} →
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-card border border-border text-foreground disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Anterior
              </button>
              {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    currentPage === i + 1
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-foreground hover:bg-muted'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg bg-card border border-border text-foreground disabled:opacity-50 hover:bg-muted transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}

          {/* Load more button */}
          {totalPages > 1 && currentPage < totalPages && (
            <div className="text-center mt-8">
              <button
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-6 py-3 rounded-full text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-all"
              >
                Cargar mas resultados
              </button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      {ctaConfig.title && (
        <section className="py-16 px-4 bg-primary/5">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              {ctaConfig.title}
            </h2>
            {ctaConfig.subtitle && (
              <p className="text-muted-foreground mb-8">
                {ctaConfig.subtitle}
              </p>
            )}
            {ctaConfig.buttonText && (
              <Link
                href={ctaConfig.buttonLink ? (ctaConfig.buttonLink.startsWith('http') ? ctaConfig.buttonLink : `${basePath}${ctaConfig.buttonLink}`) : `${basePath}/contacto`}
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors"
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

function getProductIcon(type: string): string {
  const icons: Record<string, string> = {
    destination: '🌍',
    hotel: '🏨',
    activity: '🎯',
    transfer: '🚐',
    package: '📦',
  };
  return icons[type] || '📍';
}
