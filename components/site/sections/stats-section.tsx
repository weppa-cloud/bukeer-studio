'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface StatsSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function StatsSection({ section, website }: StatsSectionProps) {
  const sectionContent = section.content as {
    title?: string;
    stats?: Array<{
      value: number;
      suffix?: string;
      label: string;
    }>;
  };

  const stats = sectionContent.stats || [
    { value: 500, suffix: '+', label: 'Viajeros felices' },
    { value: 50, suffix: '+', label: 'Destinos' },
    { value: 10, label: 'Años de experiencia' },
    { value: 98, suffix: '%', label: 'Satisfacción' },
  ];

  return (
    <div className="section-padding">
      <div className="container">
        {sectionContent.title && (
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl font-bold text-center mb-12"
          >
            {sectionContent.title}
          </motion.h2>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <CountUp
                end={stat.value}
                suffix={stat.suffix}
                className="text-4xl md:text-5xl font-bold text-primary"
              />
              <p className="mt-2 text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// CountUp component
function CountUp({
  end,
  suffix = '',
  className,
}: {
  end: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (isInView) {
      const duration = 2000;
      const steps = 60;
      const increment = end / steps;
      let current = 0;

      const timer = setInterval(() => {
        current += increment;
        if (current >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [isInView, end]);

  return (
    <span ref={ref} className={className}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}
