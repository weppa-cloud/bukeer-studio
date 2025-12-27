'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface HotelsSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function HotelsSection({ section, website }: HotelsSectionProps) {
  const sectionContent = section.content as {
    title?: string;
    subtitle?: string;
    hotels?: Array<{
      id: string;
      name: string;
      image: string;
      location?: string;
      rating?: number;
      price?: string;
    }>;
  };

  const title = sectionContent.title || 'Hoteles Destacados';
  const hotels = sectionContent.hotels || [];

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
          {sectionContent.subtitle && (
            <p className="mt-4 text-muted-foreground">{sectionContent.subtitle}</p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {hotels.map((hotel, index) => (
            <motion.div
              key={hotel.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="group bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                {hotel.image ? (
                  <Image
                    src={hotel.image}
                    alt={hotel.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <svg className="w-12 h-12 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="p-5">
                <h3 className="font-semibold text-lg">{hotel.name}</h3>
                {hotel.location && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {hotel.location}
                  </p>
                )}
                <div className="flex items-center justify-between mt-4">
                  {hotel.rating && (
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-4 h-4 ${i < hotel.rating! ? 'text-yellow-400' : 'text-muted'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                  )}
                  {hotel.price && (
                    <p className="font-semibold text-primary">{hotel.price}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
