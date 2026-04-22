'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { WebsiteData } from '@/lib/supabase/get-website';
import { getBasePath } from '@/lib/utils/base-path';
import { getPublicUiMessages } from '@/lib/site/public-ui-messages';

interface SearchResult {
  id: string;
  name: string;
  type: string;
  slug: string;
  image?: string;
  location?: string;
  description?: string;
  price?: string | number;
}

interface SearchPageClientProps {
  subdomain: string;
  initialQuery: string;
  website: WebsiteData;
}

export function SearchPageClient({ subdomain, initialQuery, website }: SearchPageClientProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const router = useRouter();
  const basePath = getBasePath(subdomain);
  const locale =
    (website as WebsiteData & { resolvedLocale?: string | null }).resolvedLocale
    ?? website.default_locale
    ?? website.content?.locale
    ?? 'es-CO';
  const messages = getPublicUiMessages(locale);

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

  const getCategoryLabel = (type: string) => {
    const labels: Record<string, string> = {
      destination: messages.searchPage.destinationLabel,
      hotel: messages.searchPage.hotelLabel,
      activity: messages.searchPage.activityLabel,
      transfer: messages.searchPage.transferLabel,
      package: messages.searchPage.packageLabel,
    };
    return labels[type] || type;
  };

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setIsLoading(true);
      setHasSearched(true);

      try {
        // Search across all product types
        const types = ['hotel', 'activity', 'destination', 'package'];
        const allResults: SearchResult[] = [];

        for (const type of types) {
          const { getCategoryProducts } = await import('@/lib/supabase/get-pages');
          const result = await getCategoryProducts(subdomain, type, {
            limit: 6,
            offset: 0,
            search: query,
            locale,
          });
          allResults.push(
            ...result.items.map((item) => ({
              id: item.id,
              name: item.name,
              type: item.type,
              slug: item.slug,
              image: item.image,
              location: item.location,
              description: item.description,
              price: item.type === 'activity' ? undefined : item.price,
            }))
          );
        }

        setResults(allResults);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [query, subdomain, website.id]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`${basePath}/buscar?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <div className="min-h-[70vh]">
      {/* Search Hero */}
      <section className="pt-28 pb-12">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-xs tracking-[0.15em] uppercase mb-3 text-primary font-mono"
          >
            {messages.searchPage.eyebrow}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold mb-8"
          >
            {messages.searchPage.title}
          </motion.h1>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            onSubmit={handleSearch}
            className="relative"
          >
            <svg
              className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={messages.searchPage.placeholder}
              className="w-full pl-14 pr-6 py-4 rounded-2xl border border-border bg-card text-lg focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          </motion.form>
        </div>
      </section>

      {/* Results */}
      <section className="pb-24 px-6">
        <div className="max-w-7xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden animate-pulse bg-card border border-border">
                  <div className="h-48 bg-muted" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : hasSearched && results.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <p className="text-6xl mb-4">🔍</p>
              <p className="text-lg font-medium mb-2">{messages.searchPage.noResultsPrefix} &ldquo;{query}&rdquo;</p>
              <p className="text-muted-foreground">{messages.searchPage.noResultsHint}</p>
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                {[messages.searchPage.destinationsCategory, messages.searchPage.hotelsCategory, messages.searchPage.activitiesCategory, messages.searchPage.packagesCategory].map((cat) => (
                  <Link
                    key={cat}
                    href={`${basePath}/${cat.toLowerCase()}`}
                    className="px-5 py-2 rounded-full text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </motion.div>
          ) : results.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-6">
                {results.length} {results.length === 1 ? messages.searchPage.resultSingular : messages.searchPage.resultPlural} {messages.searchPage.resultFor} &ldquo;{query}&rdquo;
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((result, index) => (
                  <motion.div
                    key={result.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.5 }}
                    whileHover={{ y: -4 }}
                  >
                    <Link
                      href={`${basePath}/${getCategorySlug(result.type)}/${result.slug}`}
                      className="group block rounded-2xl overflow-hidden bg-card border border-border"
                    >
                      <div className="relative aspect-[16/10] overflow-hidden">
                        {result.image ? (
                          <Image
                            src={result.image}
                            alt={result.name}
                            fill
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full bg-muted flex items-center justify-center">
                            <span className="text-4xl">🔍</span>
                          </div>
                        )}
                        {/* Type badge */}
                        <div className="absolute top-3 left-3">
                          <span className="text-[10px] tracking-widest uppercase px-2.5 py-1 rounded-full backdrop-blur-sm bg-background/60 border border-border/50 text-muted-foreground font-mono">
                            {getCategoryLabel(result.type)}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-lg leading-tight mb-1 group-hover:text-primary transition-colors">
                          {result.name}
                        </h3>
                        {result.location && (
                          <div className="flex items-center gap-1 mb-2">
                            <svg className="w-3 h-3 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                            <span className="text-xs text-muted-foreground">{result.location}</span>
                          </div>
                        )}
                        {result.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{result.description}</p>
                        )}
                        {result.type !== 'activity' && result.price && (
                          <span className="font-semibold text-primary">{String(result.price)}</span>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </>
          ) : !hasSearched ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-center py-12"
            >
              <p className="text-muted-foreground">{messages.searchPage.initialHint}</p>
              <div className="flex flex-wrap justify-center gap-3 mt-6">
                {['Cartagena', 'Eje Cafetero', 'San Andres', 'Medellin'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setQuery(suggestion)}
                    className="px-5 py-2 rounded-full text-sm font-medium border border-border text-muted-foreground hover:bg-muted transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
