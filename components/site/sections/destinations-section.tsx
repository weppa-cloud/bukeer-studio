'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useRef, useEffect, useCallback, MouseEvent } from 'react';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface DestinationsSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface Destination {
  id: string;
  name: string;
  image: string;
  description?: string;
  price?: string;
  slug?: string;
  state?: string;
  hotel_count?: number;
  activity_count?: number;
  min_price?: string;
}

function getDestinationHref(destination: Destination, subdomain: string): string {
  const slug = (destination.slug || '').trim();
  if (slug) {
    return `/site/${subdomain}/destinos/${encodeURIComponent(slug)}`;
  }
  return `/site/${subdomain}/destinos`;
}

function normalizeDestination(raw: Record<string, unknown>, index: number): Destination {
  // Accept both snake_case (DB) and camelCase (normalized) field names
  const hotelCount = typeof raw.hotel_count === 'number' ? raw.hotel_count
    : typeof raw.hotelCount === 'number' ? raw.hotelCount : undefined;
  const activityCount = typeof raw.activity_count === 'number' ? raw.activity_count
    : typeof raw.activityCount === 'number' ? raw.activityCount : undefined;
  return {
    id:
      (typeof raw.id === 'string' && raw.id) ||
      (typeof raw.slug === 'string' && raw.slug) ||
      `destination-${index}`,
    name: (typeof raw.name === 'string' && raw.name) || 'Destino',
    image: (typeof raw.image === 'string' && raw.image) || '',
    description: (typeof raw.description === 'string' && raw.description) || undefined,
    price:
      (typeof raw.price === 'string' && raw.price) ||
      (typeof raw.min_price === 'string' && raw.min_price) ||
      undefined,
    slug: typeof raw.slug === 'string' ? raw.slug : undefined,
    state: typeof raw.state === 'string' ? raw.state : undefined,
    hotel_count: hotelCount,
    activity_count: activityCount,
    min_price: typeof raw.min_price === 'string' ? raw.min_price : undefined,
  };
}

// Tilt Card Component with 3D effect
function TiltCard({ destination, href }: { destination: Destination; href: string }) {
  const cardRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x);
  const mouseYSpring = useSpring(y);

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <Link href={href} className="block" aria-label={`Ver detalle de ${destination.name}`}>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateY,
          rotateX,
          transformStyle: "preserve-3d",
        }}
        className="relative aspect-[4/5] rounded-xl cursor-pointer"
      >
        <div
          style={{ transform: "translateZ(75px)", transformStyle: "preserve-3d" }}
          className="absolute inset-2 rounded-xl overflow-hidden shadow-xl"
        >
          {destination.image ? (
            <Image
              src={destination.image}
              alt={destination.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div
            style={{ transform: "translateZ(50px)" }}
            className="absolute bottom-0 left-0 right-0 p-6"
          >
            <h3 className="text-xl font-bold text-white drop-shadow-lg">{destination.name}</h3>
            {destination.description && (
              <p className="mt-2 text-white/90 text-sm line-clamp-2 drop-shadow">
                {destination.description}
              </p>
            )}
            {destination.price && (
              <p className="mt-3 text-white font-semibold drop-shadow">
                Desde <span className="text-lg">{destination.price}</span>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

/** Auto-scroll row with manual drag support */
function ScrollRow({ children, direction = 'left', speed = 0.5 }: { children: React.ReactNode; direction?: 'left' | 'right'; speed?: number }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startScroll = useRef(0);
  const pauseUntil = useRef(0);
  const rafId = useRef(0);

  // Auto-scroll loop
  useEffect(() => {
    const el = rowRef.current;
    if (!el) return;

    // Start at middle for infinite feel
    const half = el.scrollWidth / 2;
    if (direction === 'right') el.scrollLeft = half;

    const tick = () => {
      if (!isDragging.current && Date.now() > pauseUntil.current) {
        const dir = direction === 'left' ? speed : -speed;
        el.scrollLeft += dir;
        // Loop: when reaching end/start, jump to the duplicate set
        if (direction === 'left' && el.scrollLeft >= half) el.scrollLeft -= half;
        if (direction === 'right' && el.scrollLeft <= 0) el.scrollLeft += half;
      }
      rafId.current = requestAnimationFrame(tick);
    };
    rafId.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId.current);
  }, [direction, speed]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    startX.current = e.pageX;
    startScroll.current = rowRef.current?.scrollLeft ?? 0;
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current || !rowRef.current) return;
    e.preventDefault();
    rowRef.current.scrollLeft = startScroll.current - (e.pageX - startX.current) * 1.5;
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    pauseUntil.current = Date.now() + 3000; // pause auto-scroll 3s after drag
  }, []);

  const onMouseEnter = useCallback(() => {
    pauseUntil.current = Date.now() + 60000; // pause on hover
  }, []);

  const onMouseLeave = useCallback(() => {
    isDragging.current = false;
    pauseUntil.current = Date.now() + 1000; // resume 1s after leave
  }, []);

  return (
    <div
      ref={rowRef}
      className="flex gap-5 overflow-x-hidden cursor-grab active:cursor-grabbing select-none"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onTouchStart={(e) => {
        isDragging.current = true;
        startX.current = e.touches[0].pageX;
        startScroll.current = rowRef.current?.scrollLeft ?? 0;
      }}
      onTouchMove={(e) => {
        if (!isDragging.current || !rowRef.current) return;
        rowRef.current.scrollLeft = startScroll.current - (e.touches[0].pageX - startX.current) * 1.5;
      }}
      onTouchEnd={() => {
        isDragging.current = false;
        pauseUntil.current = Date.now() + 3000;
      }}
    >
      {children}
    </div>
  );
}

/** Card for marquee rows — image with overlay info */
function MarqueeCard({ d, href }: { d: Destination; href: string }) {
  return (
    <Link href={href} className="block" aria-label={`Ver detalle de ${d.name}`}>
      <div
        className="relative shrink-0 w-56 md:w-64 lg:w-72 aspect-[3/4] rounded-2xl overflow-hidden group cursor-pointer select-none"
        style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
      >
        {d.image ? (
          <Image src={d.image} alt={d.name} fill draggable={false} className="object-cover transition-transform duration-700 group-hover:scale-110 pointer-events-none" />
        ) : (
          <div className="w-full h-full bg-muted" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: 'linear-gradient(to top, color-mix(in srgb, var(--accent, #1A5FAF) 40%, black) 0%, transparent 50%)' }}
        />
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5">
          <h3 className="text-lg md:text-xl font-bold text-white drop-shadow-lg">{d.name}</h3>
          {d.description && <p className="text-xs text-white/70 mt-1 drop-shadow line-clamp-1">{d.description}</p>}
          {(d.activity_count || d.hotel_count) ? (
            <div className="flex items-center gap-2 mt-2">
              {d.activity_count !== undefined && d.activity_count > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/15 backdrop-blur-sm text-white border border-white/10">
                  {d.activity_count} actividades
                </span>
              )}
              {d.hotel_count !== undefined && d.hotel_count > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/15 backdrop-blur-sm text-white border border-white/10">
                  {d.hotel_count} paquetes
                </span>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function DestinationsSection({ section, website }: DestinationsSectionProps) {
  const variant = section.variant || 'grid';
  const sectionContent = section.content as {
    title?: string;
    subtitle?: string;
    destinations?: Array<Destination | Record<string, unknown>>;
  };

  const title = sectionContent.title || 'Destinos Destacados';
  const subtitle = sectionContent.subtitle || 'Descubre los lugares más increíbles';
  const rawDestinations = Array.isArray(sectionContent.destinations)
    ? sectionContent.destinations
    : [];
  const destinations = rawDestinations
    .map((item, index) => normalizeDestination(item as Record<string, unknown>, index))
    .filter((d) => d.name.trim().length > 0);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="section-padding">
      <div className="container">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="section-title" style={{ color: 'var(--text-heading)' }}>{title}</h2>
          {subtitle && (
            <p className="section-subtitle mt-4 text-muted-foreground max-w-2xl mx-auto">
              {subtitle}
            </p>
          )}
        </motion.div>

        {/* Grid variant */}
        {variant === 'grid' && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {destinations.map((destination) => (
              <Link
                key={destination.id}
                href={getDestinationHref(destination, website.subdomain)}
                aria-label={`Ver detalle de ${destination.name}`}
              >
                <motion.div
                  variants={itemVariants}
                  className="group relative aspect-[4/5] rounded-xl overflow-hidden cursor-pointer"
                >
                  {destination.image ? (
                    <Image
                      src={destination.image}
                      alt={destination.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="text-xl font-bold text-white">{destination.name}</h3>
                    {destination.description && (
                      <p className="mt-2 text-white/80 text-sm line-clamp-2">
                        {destination.description}
                      </p>
                    )}
                    {destination.price && (
                      <p className="mt-3 text-white font-semibold">
                        Desde <span className="text-lg">{destination.price}</span>
                      </p>
                    )}
                  </div>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        )}

        {/* Bento variant */}
        {variant === 'bento' && destinations.length >= 5 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-[200px]"
          >
            {destinations.slice(0, 5).map((destination, index) => (
              <Link
                key={destination.id}
                href={getDestinationHref(destination, website.subdomain)}
                aria-label={`Ver detalle de ${destination.name}`}
              >
                <motion.div
                  variants={itemVariants}
                  className={`group relative rounded-xl overflow-hidden cursor-pointer ${
                    index === 0 ? 'col-span-2 row-span-2' : ''
                  }`}
                >
                  {destination.image ? (
                    <Image
                      src={destination.image}
                      alt={destination.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className={`font-bold text-white ${index === 0 ? 'text-2xl' : 'text-lg'}`}>
                      {destination.name}
                    </h3>
                    {destination.price && index === 0 && (
                      <p className="mt-2 text-white/90">Desde {destination.price}</p>
                    )}
                  </div>
                </motion.div>
              </Link>
            ))}
          </motion.div>
        )}

        {/* Carousel variant */}
        {variant === 'carousel' && (
          <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory">
            {destinations.map((destination) => (
              <motion.div
                key={destination.id}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="flex-none w-72 md:w-80 snap-center"
              >
                <Link
                  href={getDestinationHref(destination, website.subdomain)}
                  className="block group relative aspect-[3/4] rounded-xl overflow-hidden"
                  aria-label={`Ver detalle de ${destination.name}`}
                >
                  {destination.image ? (
                    <Image
                      src={destination.image}
                      alt={destination.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <h3 className="text-lg font-bold text-white">{destination.name}</h3>
                    {destination.price && (
                      <p className="mt-1 text-white/80">Desde {destination.price}</p>
                    )}
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {/* Tilt variant - 3D effect on hover */}
        {variant === 'tilt' && (
          <div
            style={{ perspective: "1500px" }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {destinations.map((destination, index) => (
              <motion.div
                key={destination.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <TiltCard
                  destination={destination}
                  href={getDestinationHref(destination, website.subdomain)}
                />
              </motion.div>
            ))}
          </div>
        )}

        {/* Marquee variant — dual-row auto-scroll + mouse/touch drag */}
        {variant === 'marquee' && destinations.length > 0 && (
          <div className="relative overflow-hidden -mx-[calc((100vw-100%)/2)]">
            {/* Fade edges */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-28 z-10 bg-gradient-to-r from-[var(--bg,hsl(var(--background)))] to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-28 z-10 bg-gradient-to-l from-[var(--bg,hsl(var(--background)))] to-transparent" />

            {/* Row 1 — auto-scrolls left, draggable */}
            <div className="mb-5">
              <ScrollRow direction="left" speed={0.6}>
                {[...destinations, ...destinations].map((d, i) => (
                  <MarqueeCard
                    key={`r1-${d.id}-${i}`}
                    d={d}
                    href={getDestinationHref(d, website.subdomain)}
                  />
                ))}
              </ScrollRow>
            </div>

            {/* Row 2 — auto-scrolls right, draggable */}
            <ScrollRow direction="right" speed={0.4}>
              {[...destinations, ...destinations].reverse().map((d, i) => (
                <MarqueeCard
                  key={`r2-${d.id}-${i}`}
                  d={d}
                  href={getDestinationHref(d, website.subdomain)}
                />
              ))}
            </ScrollRow>
          </div>
        )}

        {/* Empty state */}
        {destinations.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p>No hay destinos configurados</p>
          </div>
        )}
      </div>
    </div>
  );
}
