'use client';

import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { BlurFade } from '@/components/ui/blur-fade';
import { NumberTicker } from '@/components/ui/number-ticker';
import { Shield } from 'lucide-react';

interface TrustBarContent {
  rating?: { score: number; count: number; source?: string };
  certifications?: { name: string; logo?: string }[];
  travelerCount?: number;
  travelerLabel?: string;
  sslBadge?: boolean;
}

interface TrustBarSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

function StarRating({ score }: { score: number }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${score} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          className={`w-4 h-4 ${i <= Math.floor(score) ? 'text-yellow-400' : 'text-yellow-400/30'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
          aria-hidden
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

export function TrustBarSection({ section }: TrustBarSectionProps) {
  const content = (section.content as unknown as TrustBarContent | null) || {};
  const { rating, certifications = [], travelerCount, travelerLabel, sslBadge } = content;

  return (
    <section
      className="border-b bg-muted/50 py-3"
      style={{ borderColor: 'var(--border-subtle)' }}
      aria-label="Confianza y certificaciones"
    >
      <div className="container">
        <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 text-sm min-h-[52px]">

          {/* Rating */}
          {rating && (
            <BlurFade delay={0} direction="right" duration={0.35}>
              <div className="flex items-center gap-2" role="img" aria-label={`Calificación: ${rating.score} estrellas en ${rating.source || 'Google'}`}>
                <StarRating score={rating.score} />
                <span className="font-semibold text-[var(--text-heading)]">{rating.score}</span>
                {rating.source && (
                  <span className="text-[var(--text-secondary)] hidden sm:inline">en {rating.source}</span>
                )}
                {rating.count > 0 && (
                  <span className="text-[var(--text-muted)] hidden md:inline">
                    (<NumberTicker value={rating.count} className="font-medium" /> reseñas)
                  </span>
                )}
              </div>
            </BlurFade>
          )}

          {/* Certifications */}
          {certifications.map((cert, i) => (
            <BlurFade key={i} delay={0.05 * (i + 1)} direction="right" duration={0.35}>
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                {cert.logo ? (
                  <img src={cert.logo} alt={cert.name} className="h-5 w-auto object-contain grayscale opacity-70" />
                ) : (
                  <Shield className="w-4 h-4 text-[var(--accent)]" aria-hidden />
                )}
                <span className="font-medium">{cert.name}</span>
              </div>
            </BlurFade>
          ))}

          {/* Traveler count */}
          {travelerCount && travelerCount > 0 && (
            <BlurFade delay={0.15} direction="right" duration={0.35}>
              <div className="flex items-center gap-1 text-[var(--text-secondary)]">
                <span className="text-[var(--accent)] font-bold text-base">
                  +<NumberTicker value={travelerCount} className="font-bold text-[var(--accent)]" />
                </span>
                <span>{travelerLabel || 'viajeros'}</span>
              </div>
            </BlurFade>
          )}

          {/* SSL badge */}
          {sslBadge && (
            <BlurFade delay={0.2} direction="right" duration={0.35}>
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
                <span className="text-xs font-medium">Pago seguro SSL</span>
              </div>
            </BlurFade>
          )}
        </div>
      </div>
    </section>
  );
}
