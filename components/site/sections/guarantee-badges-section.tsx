'use client';

import { WebsiteSection } from '@/lib/supabase/get-website';
import { BlurFade } from '@/components/ui/blur-fade';
import {
  RotateCcw, Lock, BadgeDollarSign, Headphones,
  ShieldCheck, Clock, Award, ThumbsUp,
} from 'lucide-react';

interface Badge {
  icon: string;
  label: string;
  description?: string;
}

interface GuaranteeBadgesContent {
  title?: string;
  badges: Badge[];
}

interface GuaranteeBadgesSectionProps {
  section: WebsiteSection;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  rotate_ccw: <RotateCcw className="w-6 h-6" />,
  lock: <Lock className="w-6 h-6" />,
  dollar: <BadgeDollarSign className="w-6 h-6" />,
  headphones: <Headphones className="w-6 h-6" />,
  shield: <ShieldCheck className="w-6 h-6" />,
  clock: <Clock className="w-6 h-6" />,
  award: <Award className="w-6 h-6" />,
  thumbs_up: <ThumbsUp className="w-6 h-6" />,
};

function BadgeIcon({ name }: { name: string }) {
  return (
    <span className="text-[var(--accent)]">
      {ICON_MAP[name] ?? <ShieldCheck className="w-6 h-6" />}
    </span>
  );
}

export function GuaranteeBadgesSection({ section }: GuaranteeBadgesSectionProps) {
  const content = (section.content as GuaranteeBadgesContent | null) || { badges: [] };
  const { title, badges = [] } = content;
  const variant = section.variant || 'risk_reversal_row';
  const isRow = variant === 'risk_reversal_row';

  return (
    <section className="section-padding bg-muted/20" aria-label="Garantías">
      <div className="container">
        {title && (
          <BlurFade delay={0} direction="up" duration={0.4}>
            <h2 className="text-center text-xl font-bold text-[var(--text-heading)] mb-8">{title}</h2>
          </BlurFade>
        )}

        <div
          className={
            isRow
              ? 'flex flex-wrap justify-center gap-4 md:gap-8'
              : 'grid sm:grid-cols-2 lg:grid-cols-3 gap-4'
          }
        >
          {badges.map((badge, i) => (
            <BlurFade key={i} delay={0.08 * i} direction="up" duration={0.4}>
              <div
                className={`flex items-center gap-3 rounded-xl border p-4 bg-background/80 hover:shadow-sm transition-shadow ${isRow ? 'min-w-[160px]' : ''}`}
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div className="shrink-0">
                  <BadgeIcon name={badge.icon} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-[var(--text-heading)] leading-tight">{badge.label}</p>
                  {badge.description && (
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">{badge.description}</p>
                  )}
                </div>
              </div>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
