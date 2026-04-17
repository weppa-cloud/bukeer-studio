'use client';

import Image from 'next/image';
import { WebsiteSection } from '@/lib/supabase/get-website';
import { BlurFade } from '@/components/ui/blur-fade';
import {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionPanel,
} from '@/components/ui/accordion';
import { MapPin, Check, ChevronDown } from 'lucide-react';

interface ItineraryDay {
  dayNumber: number;
  title: string;
  location?: string;
  summary: string;
  activities: string[];
  included?: string[];
  image?: string;
  night?: string;
}

interface ItineraryAccordionContent {
  title?: string;
  subtitle?: string;
  days: ItineraryDay[];
  schema?: boolean;
}

interface ItineraryAccordionSectionProps {
  section: WebsiteSection;
}

export function ItineraryAccordionSection({ section }: ItineraryAccordionSectionProps) {
  const content = (section.content as ItineraryAccordionContent | null) || { days: [] };
  const { title = 'Itinerario día a día', subtitle, days = [] } = content;

  return (
    <section className="section-padding" aria-label="Itinerario">
      <div className="container max-w-3xl">
        <BlurFade delay={0} direction="up" duration={0.4}>
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-heading)]">{title}</h2>
            {subtitle && <p className="mt-2 text-[var(--text-secondary)]">{subtitle}</p>}
          </div>
        </BlurFade>

        <Accordion openMultiple>
          {days.map((day, i) => (
            <BlurFade key={day.dayNumber} delay={0.05 * i} direction="up" duration={0.35}>
              <AccordionItem value={`day-${day.dayNumber}`}>
                <AccordionHeader>
                  <AccordionTrigger className="text-base">
                    <span className="flex items-center gap-3 flex-1 min-w-0">
                      <span
                        className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-white"
                        style={{ background: 'var(--accent)' }}
                        aria-hidden
                      >
                        {day.dayNumber}
                      </span>
                      <span className="flex flex-col items-start min-w-0">
                        <span className="font-semibold text-[var(--text-heading)] leading-tight truncate">
                          {day.title}
                        </span>
                        {day.location && (
                          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)] font-normal mt-0.5">
                            <MapPin className="w-3 h-3 shrink-0" aria-hidden />
                            {day.location}
                          </span>
                        )}
                      </span>
                    </span>
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-200 group-data-[panel-open]:rotate-180"
                      aria-hidden
                    />
                  </AccordionTrigger>
                </AccordionHeader>

                <AccordionPanel>
                  <div className="space-y-4">
                    {day.image && (
                      <div className="relative h-44 w-full overflow-hidden rounded-xl">
                        <Image
                          src={day.image}
                          alt={day.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 700px"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <p className="text-[var(--text-secondary)] leading-relaxed">{day.summary}</p>

                    {day.activities.length > 0 && (
                      <ul className="space-y-1.5">
                        {day.activities.map((act, j) => (
                          <li key={j} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                            <Check className="w-4 h-4 text-[var(--accent)] shrink-0 mt-0.5" aria-hidden />
                            {act}
                          </li>
                        ))}
                      </ul>
                    )}

                    {day.included && day.included.length > 0 && (
                      <div className="rounded-lg bg-muted/40 p-3">
                        <p className="text-xs font-semibold text-[var(--text-heading)] mb-1.5 uppercase tracking-wide">
                          Incluye esta noche
                        </p>
                        <ul className="space-y-1">
                          {day.included.map((item, j) => (
                            <li key={j} className="text-xs text-[var(--text-muted)] flex items-center gap-1.5">
                              <Check className="w-3 h-3 text-green-500 shrink-0" aria-hidden />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {day.night && (
                      <p className="text-xs text-[var(--text-muted)] italic">🏨 Alojamiento: {day.night}</p>
                    )}
                  </div>
                </AccordionPanel>
              </AccordionItem>
            </BlurFade>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
