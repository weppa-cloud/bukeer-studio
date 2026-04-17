'use client';

import { WebsiteSection } from '@/lib/supabase/get-website';
import { BlurFade } from '@/components/ui/blur-fade';
import { Check, X } from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface ComparisonColumn {
  label: string;
  highlighted?: boolean;
}

interface ComparisonRow {
  feature: string;
  values: (string | boolean)[];
}

interface ComparisonTableContent {
  title?: string;
  subtitle?: string;
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
}

interface ComparisonTableSectionProps {
  section: WebsiteSection;
}

function CellValue({ value, highlighted }: { value: string | boolean; highlighted?: boolean }) {
  if (typeof value === 'boolean') {
    return value ? (
      <Check className={`w-5 h-5 mx-auto ${highlighted ? 'text-[var(--accent)]' : 'text-green-500'}`} aria-label="Incluido" />
    ) : (
      <X className="w-5 h-5 mx-auto text-red-400" aria-label="No incluido" />
    );
  }
  return (
    <span className={`text-sm ${highlighted ? 'font-semibold text-[var(--accent)]' : 'text-[var(--text-secondary)]'}`}>
      {value}
    </span>
  );
}

export function ComparisonTableSection({ section }: ComparisonTableSectionProps) {
  const content = (section.content as ComparisonTableContent | null) || { columns: [], rows: [] };
  const { title, subtitle, columns = [], rows = [] } = content;

  return (
    <section className="section-padding" aria-label="Comparativa">
      <div className="container">
        {(title || subtitle) && (
          <BlurFade delay={0} direction="up" duration={0.4}>
            <div className="text-center mb-10">
              {title && <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-heading)]">{title}</h2>}
              {subtitle && <p className="mt-2 text-[var(--text-secondary)] max-w-xl mx-auto">{subtitle}</p>}
            </div>
          </BlurFade>
        )}

        <BlurFade delay={0.1} direction="up" duration={0.45}>
          <ScrollArea className="w-full whitespace-nowrap rounded-2xl border" style={{ borderColor: 'var(--border-subtle)' }}>
            <table className="w-full min-w-[560px] caption-bottom text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <th className="px-4 py-3 text-left text-[var(--text-muted)] font-medium w-48">Características</th>
                  {columns.map((col, i) => (
                    <th
                      key={i}
                      className={`px-4 py-3 text-center font-semibold ${
                        col.highlighted
                          ? 'text-[var(--accent)] bg-[var(--accent)]/5'
                          : 'text-[var(--text-heading)]'
                      }`}
                    >
                      {col.highlighted && (
                        <span className="block text-xs font-normal text-[var(--accent)] mb-0.5">⭐ Bukeer</span>
                      )}
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <BlurFade key={i} delay={0.04 * i + 0.15} direction="left" duration={0.35} inView>
                    <tr
                      className={`border-b transition-colors hover:bg-muted/30 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <td className="px-4 py-3 font-medium text-[var(--text-heading)]">{row.feature}</td>
                      {row.values.map((val, j) => (
                        <td
                          key={j}
                          className={`px-4 py-3 text-center ${columns[j]?.highlighted ? 'bg-[var(--accent)]/5' : ''}`}
                        >
                          <CellValue value={val} highlighted={columns[j]?.highlighted} />
                        </td>
                      ))}
                    </tr>
                  </BlurFade>
                ))}
              </tbody>
            </table>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </BlurFade>
      </div>
    </section>
  );
}
