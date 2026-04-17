'use client';

import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { NumberTicker } from '@/components/ui/number-ticker';
import { BlurFade } from '@/components/ui/blur-fade';

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
    { value: 98, suffix: '%', label: 'Satisfaccion' },
  ];

  return (
    <div className="section-padding">
      <div className="container">
        {sectionContent.title && (
          <BlurFade delay={0}>
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
              {sectionContent.title}
            </h2>
          </BlurFade>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {stats.map((stat, index) => {
            let numericValue: number;
            let effectiveSuffix = stat.suffix || '';

            if (typeof stat.value === 'number') {
              numericValue = stat.value;
            } else {
              const str = String(stat.value);
              const match = str.match(/^([0-9,.]+)\s*(.*)$/);
              if (match) {
                numericValue = parseFloat(match[1].replace(/,/g, '')) || 0;
                if (!effectiveSuffix && match[2]) effectiveSuffix = match[2];
              } else {
                numericValue = 0;
                effectiveSuffix = str;
              }
            }

            const isDecimal = numericValue % 1 !== 0;

            return (
              <BlurFade key={index} delay={index * 0.1} direction="up">
                <div className="text-center">
                  <NumberTicker
                    value={numericValue}
                    suffix={effectiveSuffix}
                    decimalPlaces={isDecimal ? 1 : 0}
                    delay={0.3 + index * 0.15}
                    className="text-4xl md:text-5xl font-bold"
                    style={{ color: 'var(--accent)' }}
                  />
                  <p className="mt-2" style={{ color: 'var(--text-muted)' }}>{stat.label}</p>
                </div>
              </BlurFade>
            );
          })}
        </div>
      </div>
    </div>
  );
}
