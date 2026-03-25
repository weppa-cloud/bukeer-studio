'use client';

import { motion } from 'framer-motion';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface CtaSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function CtaSection({ section, website }: CtaSectionProps) {
  const { content } = website;
  const sectionContent = section.content as {
    title?: string;
    subtitle?: string;
    ctaText?: string;
    ctaUrl?: string;
    backgroundImage?: string;
  };

  const title = sectionContent.title || '¿Listo para tu próxima aventura?';

  return (
    <div className="relative py-24 overflow-hidden">
      {/* Background */}
      {sectionContent.backgroundImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${sectionContent.backgroundImage})` }}
          />
          <div className="absolute inset-0 bg-primary/80" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary" />
      )}

      <div className="container relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white">
            {title}
          </h2>
          {sectionContent.subtitle && (
            <p className="mt-6 text-lg text-white/90">
              {sectionContent.subtitle}
            </p>
          )}
          <div className="mt-8 flex flex-wrap gap-4 justify-center">
            {sectionContent.ctaText && sectionContent.ctaUrl && (
              <a
                href={sectionContent.ctaUrl}
                className="px-8 py-4 bg-white text-primary font-semibold rounded-lg hover:bg-white/90 transition-colors"
              >
                {sectionContent.ctaText}
              </a>
            )}
            {content.social?.whatsapp && (
              <a
                href={`https://wa.me/${content.social.whatsapp.replace(/[^0-9]/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-8 py-4 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
              >
                WhatsApp
              </a>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
