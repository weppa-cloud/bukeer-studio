'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface TestimonialsSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#4285F4', '#EA4335', '#FBBC05', '#34A853',
  '#FF6D00', '#7B1FA2', '#0288D1', '#00897B',
];

const getAvatarColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// Google "G" logo SVG — used as source badge
const GoogleLogo = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-label="Google">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

// Star path for reuse
const STAR_PATH = 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z';

type TestimonialItem = {
  id?: string;
  name: string;
  avatar?: string;
  text?: string;
  content?: string;
  rating?: number;
  location?: string;
  source?: string;
  relative_time?: string;
  images?: Array<{ url: string; thumbnail?: string }>;
  response?: { text: string; date: string } | null;
};

// ─── Testimonial Card ─────────────────────────────────────────────────────────

const TestimonialCard = ({ testimonial }: { testimonial: TestimonialItem }) => {
  const quoteText = testimonial.text || testimonial.content || '';
  const rating = testimonial.rating || 5;
  const avatarColor = getAvatarColor(testimonial.name);
  const initials = testimonial.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
  const isGoogle =
    (testimonial.source as string) === 'google' ||
    (testimonial.source as string) === 'google_reviews';

  return (
    <div
      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col"
      style={{ backgroundColor: 'var(--bg-card, #ffffff)', borderColor: 'var(--border-subtle, #f1f5f9)' }}
    >
      {/* Header row: avatar+name left, source logo right */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          {testimonial.avatar ? (
            <Image
              src={testimonial.avatar}
              alt={testimonial.name}
              width={48}
              height={48}
              unoptimized={false}
              className="rounded-full object-cover flex-shrink-0"
              style={{ width: 48, height: 48 }}
            />
          ) : (
            <div
              className="rounded-full flex items-center justify-center flex-shrink-0 text-white font-semibold text-sm"
              style={{ width: 48, height: 48, backgroundColor: avatarColor }}
            >
              {initials}
            </div>
          )}
          {/* Name + time */}
          <div className="min-w-0">
            <p
              className="font-bold text-sm leading-tight truncate"
              style={{ color: 'var(--text-heading, #0f172a)' }}
            >
              {testimonial.name}
            </p>
            {testimonial.relative_time && (
              <p
                className="text-xs mt-0.5 uppercase tracking-wide"
                style={{ color: 'var(--text-secondary, #64748b)' }}
              >
                {testimonial.relative_time}
              </p>
            )}
          </div>
        </div>
        {/* Source badge — top-right corner */}
        {isGoogle && (
          <div className="flex-shrink-0 mt-0.5">
            <GoogleLogo />
          </div>
        )}
      </div>

      {/* Stars */}
      <div className="flex gap-0.5 mt-3">
        {[...Array(5)].map((_, i) => (
          <svg
            key={i}
            className={`w-4 h-4 ${i < rating ? 'text-yellow-400' : 'text-slate-200'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d={STAR_PATH} />
          </svg>
        ))}
      </div>

      {/* Quote — clamped at 5 lines to keep cards consistent height */}
      {quoteText && (
        <p
          className="mt-3 text-sm leading-relaxed italic line-clamp-5"
          style={{ color: 'var(--text-secondary, #334155)' }}
        >
          &ldquo;{quoteText}&rdquo;
        </p>
      )}
    </div>
  );
};

export function TestimonialsSection({ section, website }: TestimonialsSectionProps) {
  const rawVariant = section.variant || 'grid';
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mql = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent | MediaQueryList) => setIsMobile(e.matches);
    handler(mql);
    mql.addEventListener('change', handler as (e: MediaQueryListEvent) => void);
    return () => mql.removeEventListener('change', handler as (e: MediaQueryListEvent) => void);
  }, []);

  // Only switch variant after mount — prevents SSR/hydration mismatch that causes
  // React 19 streaming error: "previously unvisited boundary must have exactly one root segment"
  const variant = mounted && isMobile && (rawVariant === 'infinite' || rawVariant === 'marquee')
    ? 'carousel'
    : rawVariant;

  const sectionContent = section.content as {
    title?: string;
    source?: 'google_reviews' | 'manual';
    averageRating?: number;
    totalReviews?: number;
    googleMapsUrl?: string;
    businessName?: string;
    testimonials?: TestimonialItem[];
  };

  const title = sectionContent.title || 'Lo que dicen nuestros viajeros';
  const testimonials = sectionContent.testimonials || [];
  const isGoogle = sectionContent.source === 'google_reviews';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logoUrl = (website?.content as any)?.logo as string | undefined;

  return (
    <div className="section-padding bg-muted/30">
      <div className={variant === 'infinite' ? '' : 'container'}>
        {/* Section header — left-aligned title, aggregate badge top-right */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-10 container"
        >
          {/* Left: title */}
          <h2 className="section-title text-left" style={{ color: 'var(--text-heading)' }}>
            {title}
          </h2>

          {/* Right: aggregate rating badge */}
          {isGoogle && sectionContent.averageRating && (
            <div className="flex items-center gap-2 flex-shrink-0 bg-white rounded-xl border border-slate-100 shadow-sm px-4 py-2.5">
              {logoUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={logoUrl}
                  alt="logo"
                  className="h-6 w-auto object-contain"
                  loading="lazy"
                />
              )}
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <span
                    key={i}
                    className={i < Math.round(sectionContent.averageRating!) ? 'text-yellow-400' : 'text-slate-200'}
                    aria-hidden="true"
                  >
                    ★
                  </span>
                ))}
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--text-heading)' }}>
                {sectionContent.averageRating}
                {sectionContent.totalReviews ? `/5 · ${sectionContent.totalReviews} reseñas en` : '/5'}
              </span>
              {sectionContent.googleMapsUrl ? (
                <a
                  href={sectionContent.googleMapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
                  aria-label="Ver en Google"
                >
                  <GoogleLogo />
                </a>
              ) : (
                <GoogleLogo />
              )}
            </div>
          )}
        </motion.div>

        {/* Infinite Marquee variant */}
        {variant === 'infinite' && testimonials.length > 0 && (
          <div className="relative overflow-hidden">
            {/* Gradient masks for smooth edges */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-muted/30 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-muted/30 to-transparent z-10 pointer-events-none" />

            {/* First row - scrolls left */}
            <div className="flex mb-6 items-stretch" style={{ height: '320px' }}>
              <motion.div
                className="flex gap-6 h-full"
                animate={{ x: [0, -50 * testimonials.length * 26] }}
                transition={{
                  x: {
                    duration: testimonials.length * 8,
                    repeat: Infinity,
                    ease: 'linear',
                  },
                }}
              >
                {[...testimonials, ...testimonials, ...testimonials].map((testimonial, index) => (
                  <div key={`row1-${index}`} className="flex-none w-72 md:w-96 h-full">
                    <TestimonialCard testimonial={testimonial} />
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Second row - scrolls right (if enough testimonials) */}
            {testimonials.length > 2 && (
              <div className="flex items-stretch" style={{ height: '320px' }}>
                <motion.div
                  className="flex gap-6 h-full"
                  animate={{ x: [-50 * testimonials.length * 26, 0] }}
                  transition={{
                    x: {
                      duration: testimonials.length * 10,
                      repeat: Infinity,
                      ease: 'linear',
                    },
                  }}
                >
                  {[...testimonials, ...testimonials, ...testimonials].reverse().map((testimonial, index) => (
                    <div key={`row2-${index}`} className="flex-none w-72 md:w-96 h-full">
                      <TestimonialCard testimonial={testimonial} />
                    </div>
                  ))}
                </motion.div>
              </div>
            )}
          </div>
        )}

        {/* Carousel / Marquee variant */}
        {(variant === 'carousel' || variant === 'marquee') && (
          <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.id || `testimonial-${index}`}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex-none w-[85vw] max-w-[340px] md:max-w-96 snap-center"
              >
                <TestimonialCard testimonial={testimonial} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Grid variant — uses new TestimonialCard */}
        {variant === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.id || `testimonial-${index}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Math.min(index * 0.08, 0.4) }}
              >
                <TestimonialCard testimonial={testimonial} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Stack variant - 3D stacked cards */}
        {variant === 'stack' && <StackedTestimonials testimonials={testimonials} />}

        {/* Crossfade variant — single testimonial with auto-advance + progress bar */}
        {variant === 'crossfade' && testimonials.length > 0 && (
          <CrossfadeTestimonials testimonials={testimonials} />
        )}
      </div>
    </div>
  );
}

// Crossfade Testimonials Component — single card with auto-rotate + progress bar
const CrossfadeTestimonials = ({ testimonials }: { testimonials: TestimonialItem[] }) => {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || testimonials.length <= 1) return;
    const interval = setInterval(() => {
      setActive((p) => (p + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [paused, testimonials.length]);

  const current = testimonials[active];

  return (
    <div
      className="max-w-2xl mx-auto"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative min-h-[240px]" role="region" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.blockquote
            key={active}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="text-center"
          >
            {/* Stars */}
            {current.rating && (
              <div className="flex justify-center gap-1 mb-4">
                {Array.from({ length: current.rating }).map((_, i) => (
                  <span key={i} className="text-yellow-400 text-lg" aria-hidden="true">★</span>
                ))}
                <span className="sr-only">{current.rating} de 5 estrellas</span>
              </div>
            )}

            {/* Quote — FIXED contrast: foreground color instead of muted */}
            <p className="font-display text-lg md:text-xl leading-relaxed mb-6 italic text-foreground/90 max-w-xl mx-auto">
              &ldquo;{current.text || current.content}&rdquo;
            </p>

            {/* Review images (if available) — use native img for external Google URLs */}
            {current.images && current.images.length > 0 && (
              <div className="flex justify-center gap-2 mb-6">
                {current.images.slice(0, 4).map((img, imgIdx) => (
                  <div key={imgIdx} className="relative w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={`Foto de ${current.name}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
                {current.images.length > 4 && (
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-muted flex items-center justify-center text-xs text-muted-foreground font-medium">
                    +{current.images.length - 4}
                  </div>
                )}
              </div>
            )}

            {/* Author with avatar — native img for Google profile photos */}
            <div className="flex items-center justify-center gap-3">
              {current.avatar ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={current.avatar}
                  alt={current.name}
                  width={40}
                  height={40}
                  className="w-10 h-10 rounded-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-semibold text-sm">
                    {current.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="text-left">
                <p className="font-semibold text-sm text-foreground">{current.name}</p>
                {current.location && (
                  <p className="text-xs text-muted-foreground">{current.location}</p>
                )}
              </div>
            </div>

            {/* Owner response */}
            {current.response && (
              <div className="mt-4 max-w-md mx-auto pl-4 border-l-2 border-primary/20 text-left">
                <p className="text-xs text-muted-foreground italic line-clamp-2">
                  {current.response.text}
                </p>
              </div>
            )}
          </motion.blockquote>
        </AnimatePresence>
      </div>

      {/* Dot navigation */}
      <div className="flex justify-center gap-3 mt-10" role="tablist" aria-label="Testimonios">
        {testimonials.map((t, i) => (
          <button
            key={i}
            onClick={() => setActive(i)}
            role="tab"
            aria-selected={i === active}
            aria-label={`Testimonio de ${t.name}`}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200"
          >
            <span
              className="block rounded-full transition-all duration-200"
              style={{
                width: i === active ? '12px' : '8px',
                height: i === active ? '12px' : '8px',
                backgroundColor: i === active ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
              }}
            />
          </button>
        ))}
      </div>

      {/* Progress bar */}
      {!paused && (
        <div className="flex justify-center mt-3">
          <div className="w-16 h-0.5 rounded-full overflow-hidden bg-muted">
            <motion.div
              key={active}
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 5, ease: 'linear' }}
              className="h-full rounded-full bg-primary"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Stacked Testimonials Component
const StackedTestimonials = ({ testimonials }: { testimonials: TestimonialItem[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (testimonials.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const getCardStyle = (index: number, isMobile: boolean) => {
    const diff = index - currentIndex;
    const normalizedDiff = ((diff % testimonials.length) + testimonials.length) % testimonials.length;

    if (normalizedDiff === 0) {
      return { zIndex: 30, scale: 1, y: 0, opacity: 1, rotateZ: 0 };
    } else if (normalizedDiff === 1 || normalizedDiff === testimonials.length - 1) {
      const direction = normalizedDiff === 1 ? 1 : -1;
      // On mobile, hide background cards more aggressively to prevent text overlap
      return {
        zIndex: 20,
        scale: isMobile ? 0.92 : 0.95,
        y: isMobile ? 30 : 20,
        opacity: isMobile ? 0.3 : 0.7,
        rotateZ: direction * 3,
      };
    } else if (normalizedDiff === 2 || normalizedDiff === testimonials.length - 2) {
      const direction = normalizedDiff === 2 ? 1 : -1;
      return {
        zIndex: 10,
        scale: isMobile ? 0.85 : 0.9,
        y: isMobile ? 50 : 40,
        opacity: isMobile ? 0 : 0.4,
        rotateZ: direction * 6,
      };
    }
    return { zIndex: 0, scale: 0.85, y: 60, opacity: 0, rotateZ: 0 };
  };

  return (
    <div className="flex flex-col items-center">
      {/* Stack container */}
      <div className="relative w-full max-w-lg h-[340px] md:h-[350px] overflow-hidden" style={{ perspective: '1000px' }}>
        <AnimatePresence>
          {testimonials.map((testimonial, index) => {
            const style = getCardStyle(index, isMobile);
            return (
              <motion.div
                key={testimonial.id || `stack-${index}`}
                className="absolute inset-0 variant-card bg-card p-8 shadow-xl border cursor-pointer"
                style={{ transformStyle: 'preserve-3d' }}
                initial={{ opacity: 0, scale: 0.8, y: 100 }}
                animate={{
                  opacity: style.opacity,
                  scale: style.scale,
                  y: style.y,
                  rotateZ: style.rotateZ,
                  zIndex: style.zIndex,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={() => setCurrentIndex(index)}
              >
                {/* Quote icon */}
                <svg className="w-10 h-10 text-primary/20 mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>

                {/* Rating */}
                {testimonial.rating && (
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <svg
                        key={i}
                        className={`w-5 h-5 ${i < testimonial.rating! ? 'text-yellow-400' : 'text-muted'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                )}

                {/* Quote */}
                <p className="text-lg md:text-xl text-foreground leading-relaxed mb-6">
                  &ldquo;{testimonial.text || testimonial.content}&rdquo;
                </p>

                {/* Author */}
                <div className="flex items-center gap-4 mt-auto">
                  {testimonial.avatar ? (
                    <Image
                      src={testimonial.avatar}
                      alt={testimonial.name}
                      width={56}
                      height={56}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-bold text-xl">
                        {testimonial.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-lg">{testimonial.name}</p>
                    {testimonial.location && (
                      <p className="text-muted-foreground">{testimonial.location}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Navigation dots */}
      <div className="flex gap-2 mt-8">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-3 h-3 rounded-full transition-all ${
              index === currentIndex
                ? 'bg-primary w-8'
                : 'bg-muted hover:bg-muted-foreground/50'
            }`}
            aria-label={`Go to testimonial ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}
