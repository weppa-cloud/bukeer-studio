'use client';

import { useEffect, useState, useRef } from 'react';
import { WebsiteData, WebsiteSection } from '@/lib/supabase/get-website';
import { BlurFade } from '@/components/ui/blur-fade';
import { Clock } from 'lucide-react';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

interface CountdownTimerContent {
  title: string;
  targetDate: string;
  mode: 'departure' | 'offer';
  ctaText?: string;
  ctaUrl?: string;
  fallbackText?: string;
}

interface CountdownTimerSectionProps {
  section: WebsiteSection;
  website: WebsiteData;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calculateTimeLeft(targetDate: string): TimeLeft | null {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / 1000 / 60) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span
        className="text-3xl md:text-5xl font-extrabold tabular-nums leading-none text-white"
        aria-live="polite"
        aria-atomic
      >
        {pad(value)}
      </span>
      <span className="text-xs font-medium text-white/70 mt-1 uppercase tracking-wider">{label}</span>
    </div>
  );
}

export function CountdownTimerSection({ section }: CountdownTimerSectionProps) {
  const text = getPublicUiExtraTextGetter('es-CO');
  const content = (section.content as unknown as CountdownTimerContent | null) || {
    title: '',
    targetDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    mode: 'departure' as const,
  };
  const { title, targetDate, mode, ctaText, ctaUrl, fallbackText } = content;

  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [mounted, setMounted] = useState(false);
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    setMounted(true);
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setTimeLeft(calculateTimeLeft(targetDate));

    if (prefersReducedMotion.current) return;

    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!mounted) return null;

  const expired = timeLeft === null;

  return (
    <section
      className="py-10 md:py-14 relative overflow-hidden"
      style={{ background: 'var(--accent)' }}
      aria-label={mode === 'departure' ? 'Próxima salida' : 'Oferta por tiempo limitado'}
    >
      {/* subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ background: 'radial-gradient(ellipse at center, #ffffff 0%, transparent 70%)' }}
        aria-hidden
      />

      <div className="container relative z-10">
        <BlurFade delay={0} direction="up" duration={0.4}>
          <div className="flex flex-col items-center text-center gap-6">
            <div className="flex items-center gap-2 text-white/90">
              <Clock className="w-5 h-5" aria-hidden />
              <p className="text-sm font-semibold uppercase tracking-widest">
                {mode === 'departure' ? 'Próxima salida' : 'Oferta termina en'}
              </p>
            </div>

            <h2 className="text-xl md:text-2xl font-bold text-white max-w-lg">{title}</h2>

            {expired ? (
              <p className="text-white/80 text-sm">{fallbackText || 'Consulta disponibilidad para próximas fechas.'}</p>
            ) : (
              <div className="flex items-center gap-4 md:gap-8" role="timer" aria-label={text('sectionCountdownTitle')}>
                <TimeUnit value={timeLeft!.days} label="días" />
                <span className="text-3xl font-bold text-white/50 -mt-3" aria-hidden>:</span>
                <TimeUnit value={timeLeft!.hours} label="horas" />
                <span className="text-3xl font-bold text-white/50 -mt-3" aria-hidden>:</span>
                <TimeUnit value={timeLeft!.minutes} label="min" />
                {timeLeft!.days === 0 && (
                  <>
                    <span className="text-3xl font-bold text-white/50 -mt-3" aria-hidden>:</span>
                    <TimeUnit value={timeLeft!.seconds} label="seg" />
                  </>
                )}
              </div>
            )}

            {ctaUrl && !expired && (
              <a
                href={ctaUrl}
                className="rounded-xl bg-white px-8 py-3 text-sm font-bold transition-opacity hover:opacity-90"
                style={{ color: 'var(--accent)' }}
              >
                {ctaText || 'Reservar mi cupo'}
              </a>
            )}
          </div>
        </BlurFade>
      </div>
    </section>
  );
}
