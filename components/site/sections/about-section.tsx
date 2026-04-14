'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface AboutSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function AboutSection({ section, website }: AboutSectionProps) {
  const variant = section.variant || 'default';
  const { content } = website;
  const sectionContent = section.content as {
    title?: string;
    subtitle?: string;
    text?: string;
    image?: string;
    eyebrow?: string;
    features?: Array<{ icon: string; title: string; description: string }>;
    stats?: Array<{ value: string; label: string }>;
  };

  const title = sectionContent.title || 'Sobre Nosotros';
  const text = sectionContent.text || content.tagline;

  // Split Stats variant — 2 columns with embedded 2x2 stats grid + spotlight
  if (variant === 'split_stats') {
    return (
      <div
        className="section-padding relative overflow-hidden"
        style={{ borderTop: '1px solid hsl(var(--border) / 0.2)', borderBottom: '1px solid hsl(var(--border) / 0.2)' }}
      >
        <div className="container">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            {/* Text + Stats */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              {sectionContent.eyebrow && (
                <p className="font-mono text-xs tracking-[0.15em] uppercase text-primary mb-4">
                  {sectionContent.eyebrow}
                </p>
              )}
              <h2 className="section-title" style={{ color: 'var(--text-heading)' }}>{title}</h2>
              {text && (
                <p className="mt-6 text-base text-muted-foreground leading-relaxed">{text}</p>
              )}

              {/* 2x2 Stats Grid */}
              {sectionContent.stats && sectionContent.stats.length > 0 && (
                <div className="grid grid-cols-2 gap-4 mt-8">
                  {sectionContent.stats.map((stat) => (
                    <div
                      key={stat.label}
                      className="p-4 rounded-xl border border-border/30 bg-muted/30"
                    >
                      <p className="font-bold text-2xl text-primary">{stat.value}</p>
                      <p className="text-xs text-muted-foreground leading-tight mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
              className="relative rounded-2xl overflow-hidden"
              style={{ aspectRatio: '4/5' }}
            >
              {sectionContent.image ? (
                <Image src={sectionContent.image} alt={title} fill className="object-cover" />
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
            <h2 className="section-title" style={{ color: 'var(--text-heading)' }}>{title}</h2>
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
