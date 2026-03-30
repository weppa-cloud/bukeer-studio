'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { BlurFade } from '@/components/ui/blur-fade';

interface FaqSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function FaqSection({ section }: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const sectionContent = section.content as {
    title?: string;
    faqs?: Array<{
      question: string;
      answer: string;
    }>;
  };

  const title = sectionContent.title || 'Preguntas Frecuentes';
  const faqs = sectionContent.faqs || [];

  return (
    <div className="section-padding">
      <div className="container max-w-3xl">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-center mb-12"
        >
          {title}
        </motion.h2>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <BlurFade
              key={index}
              delay={index * 0.05}
              direction="up"
            >
              <div className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between p-5 text-left bg-card hover:bg-muted/50 transition-colors"
              >
                <span className="font-medium pr-4">{faq.question}</span>
                <motion.svg
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="w-5 h-5 flex-none text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="p-5 pt-0 text-muted-foreground">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </div>
  );
}
