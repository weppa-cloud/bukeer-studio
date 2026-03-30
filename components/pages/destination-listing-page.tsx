'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { getBasePath } from '@/lib/utils/base-path';
import { RouteMap } from '@/components/ui/route-map';
import type { WebsiteData } from '@/lib/supabase/get-website';

export interface DestinationData {
  name: string;
  slug: string;
  state: string;
  lat: number;
  lng: number;
  hotel_count: number;
  activity_count: number;
  total: number;
  min_price: string | null;
  image: string | null;
}

interface DestinationListingPageProps {
  website: WebsiteData;
  destinations: DestinationData[];
}

export function DestinationListingPage({
  website,
  destinations,
}: DestinationListingPageProps) {
  const basePath = getBasePath(website);

  // Filter out destinations with fewer than 2 products
  const visibleDestinations = destinations.filter((d) => d.total >= 2);

  // Convert to route points for the map
  const routePoints = visibleDestinations.map((d) => ({
    city: d.name,
    lat: d.lat,
    lng: d.lng,
  }));

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      {/* Header Section */}
      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span
            className="text-sm font-semibold tracking-[0.2em] uppercase"
            style={{ color: 'var(--accent)' }}
          >
            EXPLORA
          </span>
          <h1
            className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-bold"
            style={{ color: 'var(--text-heading)' }}
          >
            Destinos en Colombia
          </h1>
          <p
            className="mt-4 text-lg max-w-2xl mx-auto"
            style={{ color: 'var(--text-body)' }}
          >
            Descubre los mejores destinos que tenemos para ti, con hoteles y
            actividades seleccionadas en cada ciudad.
          </p>
        </motion.div>
      </section>

      {/* Map Section */}
      {routePoints.length > 0 && (
        <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="rounded-2xl overflow-hidden shadow-lg"
            style={{ height: '400px' }}
          >
            <RouteMap points={routePoints} />
          </motion.div>
        </section>
      )}

      {/* Destinations Grid */}
      <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleDestinations.map((dest, index) => (
            <motion.div
              key={dest.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
            >
              <Link href={`${basePath}/destinos/${dest.slug}`}>
                <motion.div
                  className="relative rounded-2xl overflow-hidden shadow-md cursor-pointer group"
                  style={{ aspectRatio: '3/4' }}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Background Image */}
                  {dest.image ? (
                    <Image
                      src={dest.image}
                      alt={dest.name}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                      sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{ background: 'var(--surface-secondary)' }}
                    />
                  )}

                  {/* Gradient Overlay */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.05) 100%)',
                    }}
                  />

                  {/* Content */}
                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <h3 className="text-2xl font-bold text-white">
                      {dest.name}
                    </h3>
                    {dest.state && (
                      <p className="text-sm text-white/70 mt-1">{dest.state}</p>
                    )}
                    <p className="text-sm text-white/80 mt-2">
                      {dest.hotel_count} hoteles &middot; {dest.activity_count}{' '}
                      actividades
                    </p>
                    {dest.min_price && (
                      <p
                        className="text-sm font-semibold mt-2"
                        style={{ color: 'var(--accent)' }}
                      >
                        Desde {dest.min_price}
                      </p>
                    )}
                  </div>
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {visibleDestinations.length === 0 && (
          <div className="text-center py-20">
            <p
              className="text-lg"
              style={{ color: 'var(--text-body)' }}
            >
              No hay destinos disponibles en este momento.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
