'use client';

import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { BlurFade } from '@/components/ui/blur-fade';
import { Check, X } from 'lucide-react';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

interface InclusionsExclusionsContent {
  title?: string;
  included: string[];
  excluded: string[];
  note?: string;
}

interface InclusionsExclusionsSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

export function InclusionsExclusionsSection({ section }: InclusionsExclusionsSectionProps) {
  const text = getPublicUiExtraTextGetter('es-CO');
  const content = (section.content as unknown as InclusionsExclusionsContent | null) || { included: [], excluded: [] };
  const { title, included = [], excluded = [], note } = content;

  return (
    <section className="section-padding" aria-label={text('sectionInclusionsTitle')}>
      <div className="container max-w-4xl">
        {title && (
          <BlurFade delay={0} direction="up" duration={0.4}>
            <h2 className="text-2xl md:text-3xl font-bold text-center text-[var(--text-heading)] mb-10">{title}</h2>
          </BlurFade>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Included */}
          <BlurFade delay={0.05} direction="left" duration={0.45}>
            <div className="rounded-2xl border bg-background p-6" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="flex items-center gap-2 font-semibold text-[var(--text-heading)] mb-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <Check className="w-3.5 h-3.5" />
                </span>
                {text('sectionIncludes')}
              </h3>
              <ul className="space-y-2.5">
                {included.map((item, i) => (
                  <BlurFade key={i} delay={0.04 * i + 0.1} direction="left" duration={0.35}>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                      <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" aria-hidden />
                      {item}
                    </li>
                  </BlurFade>
                ))}
              </ul>
            </div>
          </BlurFade>

          {/* Excluded */}
          <BlurFade delay={0.1} direction="right" duration={0.45}>
            <div className="rounded-2xl border bg-background p-6" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="flex items-center gap-2 font-semibold text-[var(--text-heading)] mb-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-red-500">
                  <X className="w-3.5 h-3.5" />
                </span>
                {text('sectionExcludes')}
              </h3>
              <ul className="space-y-2.5">
                {excluded.map((item, i) => (
                  <BlurFade key={i} delay={0.04 * i + 0.15} direction="right" duration={0.35}>
                    <li className="flex items-start gap-2.5 text-sm text-[var(--text-muted)]">
                      <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden />
                      {item}
                    </li>
                  </BlurFade>
                ))}
              </ul>
            </div>
          </BlurFade>
        </div>

        {note && (
          <BlurFade delay={0.3} direction="up" duration={0.4}>
            <p className="mt-6 text-center text-sm text-[var(--text-muted)] italic max-w-xl mx-auto">{note}</p>
          </BlurFade>
        )}
      </div>
    </section>
  );
}
