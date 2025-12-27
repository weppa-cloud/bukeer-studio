'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface AboutSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function AboutSection({ section, website }: AboutSectionProps) {
  const { content } = website;
  const sectionContent = section.content as {
    title?: string;
    text?: string;
    image?: string;
    features?: Array<{ icon: string; title: string; description: string }>;
  };

  const title = sectionContent.title || 'Sobre Nosotros';
  const text = sectionContent.text || content.tagline;

  return (
    <div className="section-padding">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold">{title}</h2>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              {text}
            </p>

            {/* Features list */}
            {sectionContent.features && sectionContent.features.length > 0 && (
              <div className="mt-8 space-y-4">
                {sectionContent.features.map((feature, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-4"
                  >
                    <div className="flex-none w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <svg className="w-5 h-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative aspect-square rounded-2xl overflow-hidden"
          >
            {sectionContent.image ? (
              <Image
                src={sectionContent.image}
                alt={title}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                <span className="text-6xl">✈️</span>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
