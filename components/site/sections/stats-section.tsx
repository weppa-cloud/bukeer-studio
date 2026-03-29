'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';

interface StatsSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function StatsSection({ section }: StatsSectionProps) {
  const sectionContent = section.content as {
    title?: string;
    stats?: Array<{
      value: number | string;
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
          {stats.map((stat, index) => {
            // Parse value: extract numeric part and suffix from strings like "15,000+", "4.9★", "50+"
            let numericValue: number;
            let effectiveSuffix = stat.suffix || '';

            if (typeof stat.value === 'number') {
              numericValue = stat.value;
            } else {
              const str = String(stat.value);
              // Extract numeric part (digits, commas, dots) and trailing suffix
              const match = str.match(/^([0-9,.]+)\s*(.*)$/);
              if (match) {
                numericValue = parseFloat(match[1].replace(/,/g, '')) || 0;
                if (!effectiveSuffix && match[2]) effectiveSuffix = match[2];
              } else {
                numericValue = 0;
                effectiveSuffix = str; // Show entire string as-is if no number
              }
            }

            // For decimal values like 4.9, use the decimal display
            const isDecimal = numericValue % 1 !== 0;

            return (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center"
            >
              <CountUp
                end={numericValue}
                suffix={effectiveSuffix}
                decimals={isDecimal ? 1 : 0}
                className="text-4xl md:text-5xl font-bold text-primary"
              />
              <p className="mt-2 text-muted-foreground">{stat.label}</p>
            </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// CountUp component
function CountUp({
  end,
  suffix = '',
  decimals = 0,
  className,
}: {
  end: number;
  suffix?: string;
  decimals?: number;
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
          setCount(decimals > 0 ? parseFloat(current.toFixed(decimals)) : Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [isInView, end, decimals]);

  const display = decimals > 0
    ? count.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : count.toLocaleString();

  return (
    <span ref={ref} className={className}>
      {display}{suffix}
    </span>
  );
}
