'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface TestimonialsSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function TestimonialsSection({ section, website }: TestimonialsSectionProps) {
  const variant = section.variant || 'carousel';
  const sectionContent = section.content as {
    title?: string;
    testimonials?: Array<{
      id?: string;
      name: string;
      avatar?: string;
      text?: string;
      content?: string; // Alternative field name from DB
      rating?: number;
      location?: string;
    }>;
  };

  const title = sectionContent.title || 'Lo que dicen nuestros viajeros';
  const testimonials = sectionContent.testimonials || [];

  return (
    <div className="section-padding bg-muted/30">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
        </motion.div>

        {/* Carousel / Marquee variant */}
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
                <div className="bg-card rounded-xl p-6 h-full shadow-sm">
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
                  <p className="text-muted-foreground italic">"{testimonial.text || testimonial.content}"</p>
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
                className="bg-card rounded-xl p-6 shadow-sm"
              >
                <p className="text-muted-foreground italic">"{testimonial.text || testimonial.content}"</p>
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
      </div>
    </div>
  );
}
