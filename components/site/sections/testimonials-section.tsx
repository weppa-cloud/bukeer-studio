'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface TestimonialsSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

// Testimonial Card Component (reusable)
function TestimonialCard({ testimonial }: {
  testimonial: {
    id?: string;
    name: string;
    avatar?: string;
    text?: string;
    content?: string;
    rating?: number;
    location?: string;
  }
}) {
  return (
    <div className="variant-card bg-card p-6 h-full border">
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
      <p className="text-muted-foreground italic">&ldquo;{testimonial.text || testimonial.content}&rdquo;</p>
      {/* Author */}
      <div className="flex items-center gap-3 mt-6">
        {testimonial.avatar ? (
          <Image
            src={testimonial.avatar}
            alt={testimonial.name}
            width={48}
            height={48}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-semibold">
              {testimonial.name.charAt(0)}
            </span>
          </div>
        )}
        <div>
          <p className="font-semibold">{testimonial.name}</p>
          {testimonial.location && (
            <p className="text-sm text-muted-foreground">{testimonial.location}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function TestimonialsSection({ section }: TestimonialsSectionProps) {
  const variant = section.variant || 'carousel';
  const sectionContent = section.content as {
    title?: string;
    testimonials?: Array<{
      id?: string;
      name: string;
      avatar?: string;
      text?: string;
      content?: string;
      rating?: number;
      location?: string;
    }>;
  };

  const title = sectionContent.title || 'Lo que dicen nuestros viajeros';
  const testimonials = sectionContent.testimonials || [];

  return (
    <div className="section-padding bg-muted/30">
      <div className={variant === 'infinite' ? '' : 'container'}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12 container"
        >
          <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
        </motion.div>

        {/* Infinite Marquee variant */}
        {variant === 'infinite' && testimonials.length > 0 && (
          <div className="relative overflow-hidden">
            {/* Gradient masks for smooth edges */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-muted/30 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-muted/30 to-transparent z-10 pointer-events-none" />

            {/* First row - scrolls left */}
            <div className="flex mb-6">
              <motion.div
                className="flex gap-6"
                animate={{ x: [0, -50 * testimonials.length * 26] }}
                transition={{
                  x: {
                    duration: testimonials.length * 8,
                    repeat: Infinity,
                    ease: "linear",
                  },
                }}
              >
                {/* Duplicate testimonials for seamless loop */}
                {[...testimonials, ...testimonials, ...testimonials].map((testimonial, index) => (
                  <div key={`row1-${index}`} className="flex-none w-80 md:w-96">
                    <TestimonialCard testimonial={testimonial} />
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Second row - scrolls right (if enough testimonials) */}
            {testimonials.length > 2 && (
              <div className="flex">
                <motion.div
                  className="flex gap-6"
                  animate={{ x: [-50 * testimonials.length * 26, 0] }}
                  transition={{
                    x: {
                      duration: testimonials.length * 10,
                      repeat: Infinity,
                      ease: "linear",
                    },
                  }}
                >
                  {[...testimonials, ...testimonials, ...testimonials].reverse().map((testimonial, index) => (
                    <div key={`row2-${index}`} className="flex-none w-80 md:w-96">
                      <TestimonialCard testimonial={testimonial} />
                    </div>
                  ))}
                </motion.div>
              </div>
            )}
          </div>
        )}

        {/* Carousel / Marquee variant (original) */}
        {(variant === 'carousel' || variant === 'marquee') && (
          <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory hide-scrollbar">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.id || `testimonial-${index}`}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex-none w-80 md:w-96 snap-center"
              >
                <TestimonialCard testimonial={testimonial} />
              </motion.div>
            ))}
          </div>
        )}

        {/* Grid variant */}
        {variant === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.id || `testimonial-${index}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="variant-card bg-card p-6"
              >
                <p className="text-muted-foreground italic">&ldquo;{testimonial.text || testimonial.content}&rdquo;</p>
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-semibold text-sm">
                      {testimonial.name.charAt(0)}
                    </span>
                  </div>
                  <p className="font-semibold">{testimonial.name}</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Stack variant - 3D stacked cards */}
        {variant === 'stack' && <StackedTestimonials testimonials={testimonials} />}
      </div>
    </div>
  );
}

// Stacked Testimonials Component
function StackedTestimonials({ testimonials }: { testimonials: Array<{
  id?: string;
  name: string;
  avatar?: string;
  text?: string;
  content?: string;
  rating?: number;
  location?: string;
}> }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (testimonials.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [testimonials.length]);

  const getCardStyle = (index: number) => {
    const diff = index - currentIndex;
    const normalizedDiff = ((diff % testimonials.length) + testimonials.length) % testimonials.length;

    if (normalizedDiff === 0) {
      return { zIndex: 30, scale: 1, y: 0, opacity: 1, rotateZ: 0 };
    } else if (normalizedDiff === 1 || normalizedDiff === testimonials.length - 1) {
      const direction = normalizedDiff === 1 ? 1 : -1;
      return { zIndex: 20, scale: 0.95, y: 20, opacity: 0.7, rotateZ: direction * 3 };
    } else if (normalizedDiff === 2 || normalizedDiff === testimonials.length - 2) {
      const direction = normalizedDiff === 2 ? 1 : -1;
      return { zIndex: 10, scale: 0.9, y: 40, opacity: 0.4, rotateZ: direction * 6 };
    }
    return { zIndex: 0, scale: 0.85, y: 60, opacity: 0, rotateZ: 0 };
  };

  return (
    <div className="flex flex-col items-center">
      {/* Stack container */}
      <div className="relative w-full max-w-lg h-[300px] md:h-[350px]" style={{ perspective: '1000px' }}>
        <AnimatePresence>
          {testimonials.map((testimonial, index) => {
            const style = getCardStyle(index);
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
