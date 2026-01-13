'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface PartnersSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function PartnersSection({ section }: PartnersSectionProps) {
  const variant = section.variant || 'marquee';
  const sectionContent = section.content as {
    title?: string;
    partners?: Array<{
      name: string;
      logo: string;
      url?: string;
    }>;
  };

  const title = sectionContent.title || 'Nuestros Partners';
  const partners = sectionContent.partners || [];

  return (
    <div className="section-padding bg-muted/30">
      <div className="container">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-2xl font-semibold text-center mb-12 text-muted-foreground"
        >
          {title}
        </motion.h2>

        {/* Marquee variant */}
        {variant === 'marquee' && partners.length > 0 && (
          <div className="relative overflow-hidden">
            <div className="flex animate-marquee gap-16">
              {[...partners, ...partners].map((partner, index) => (
                <div
                  key={`${partner.name}-${index}`}
                  className="flex-none grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100"
                >
                  {partner.url ? (
                    <a href={partner.url} target="_blank" rel="noopener noreferrer">
                      <Image
                        src={partner.logo}
                        alt={partner.name}
                        width={120}
                        height={60}
                        className="h-12 w-auto object-contain"
                      />
                    </a>
                  ) : (
                    <Image
                      src={partner.logo}
                      alt={partner.name}
                      width={120}
                      height={60}
                      className="h-12 w-auto object-contain"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grid variant */}
        {variant === 'grid' && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 items-center">
            {partners.map((partner, index) => (
              <motion.div
                key={partner.name}
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="flex justify-center grayscale hover:grayscale-0 transition-all opacity-60 hover:opacity-100"
              >
                {partner.url ? (
                  <a href={partner.url} target="_blank" rel="noopener noreferrer">
                    <Image
                      src={partner.logo}
                      alt={partner.name}
                      width={120}
                      height={60}
                      className="h-10 w-auto object-contain"
                    />
                  </a>
                ) : (
                  <Image
                    src={partner.logo}
                    alt={partner.name}
                    width={120}
                    height={60}
                    className="h-10 w-auto object-contain"
                  />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
      `}</style>
    </div>
  );
}
