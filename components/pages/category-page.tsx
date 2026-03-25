'use client';

import { useState, useEffect } from 'react';
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

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section
        className="relative h-[40vh] min-h-[300px] flex items-center justify-center"
        style={{
          backgroundColor: 'var(--md-sys-color-primary-container)',
        }}
      >
        {heroConfig.backgroundImage && (
          <Image
            src={heroConfig.backgroundImage}
            alt={heroConfig.title || page.title}
            fill
            className="object-cover"
            priority
          />
        )}
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

      {/* Intro Section */}
      {introContent.text && (
        <section className="py-12 px-4 bg-surface">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-lg text-on-surface-variant">{introContent.text}</p>
            {introContent.highlights && introContent.highlights.length > 0 && (
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                {introContent.highlights.map((highlight, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 rounded-full bg-primary-container text-on-primary-container"
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
      <section className="py-8 px-4 bg-surface-container-low">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-3 pl-12 rounded-full border border-outline-variant bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant"
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
            </div>
            <p className="text-on-surface-variant">
              {total} {total === 1 ? 'resultado' : 'resultados'}
            </p>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-surface-container rounded-2xl overflow-hidden animate-pulse"
                >
                  <div className="h-48 bg-surface-container-high" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-surface-container-high rounded w-3/4" />
                    <div className="h-3 bg-surface-container-high rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-lg text-on-surface-variant">
                No se encontraron resultados
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link
                  key={product.id}
                  href={`${basePath}/${getCategorySlug(product.type)}/${product.slug}`}
                  className="group bg-surface-container rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
                >
                  <div className="relative h-48">
                    {product.image ? (
                      <Image
                        src={product.image}
                        alt={product.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary-container flex items-center justify-center">
                        <span className="text-4xl">
                          {getProductIcon(product.type)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg text-on-surface group-hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                    {product.location && (
                      <p className="text-sm text-on-surface-variant mt-1 flex items-center gap-1">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {product.location}
                      </p>
                    )}
                    {product.country && (
                      <p className="text-sm text-on-surface-variant mt-1">
                        {product.city ? `${product.city}, ` : ''}
                        {product.country}
                      </p>
                    )}
                    {product.description && (
                      <p className="text-sm text-on-surface-variant mt-2 line-clamp-2">
                        {product.description}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-12 flex justify-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-lg bg-surface-container text-on-surface disabled:opacity-50 hover:bg-surface-container-high transition-colors"
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    currentPage === i + 1
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-lg bg-surface-container text-on-surface disabled:opacity-50 hover:bg-surface-container-high transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      {ctaConfig.title && (
        <section className="py-16 px-4 bg-primary-container">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-on-primary-container mb-4">
              {ctaConfig.title}
            </h2>
            {ctaConfig.subtitle && (
              <p className="text-on-primary-container/80 mb-8">
                {ctaConfig.subtitle}
              </p>
            )}
            {ctaConfig.buttonText && (
              <Link
                href={ctaConfig.buttonLink ? (ctaConfig.buttonLink.startsWith('http') ? ctaConfig.buttonLink : `${basePath}${ctaConfig.buttonLink}`) : `${basePath}/contacto`}
                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-on-primary rounded-full font-medium hover:bg-primary/90 transition-colors"
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
