import { cn } from '@/lib/utils';

export interface ContentHealthScoreProps {
  score: number;
  ghostsCount?: number;
  aiUnlockedCount?: number;
  fallbacksCount?: number;
  variant?: 'circular' | 'inline';
  className?: string;
}

function colorFor(score: number): 'green' | 'yellow' | 'red' {
  if (score >= 80) return 'green';
  if (score >= 50) return 'yellow';
  return 'red';
}

const COLOR_CLASSES = {
  green: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  yellow: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  red: 'bg-destructive/10 text-destructive border-destructive/30',
};

export function ContentHealthScore({
  score,
  ghostsCount = 0,
  aiUnlockedCount = 0,
  fallbacksCount = 0,
  variant = 'circular',
  className,
}: ContentHealthScoreProps) {
  const color = colorFor(score);
  const ariaLabel = `Puntaje de contenido: ${score} sobre 100`;

  if (variant === 'inline') {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold',
          COLOR_CLASSES[color],
          className,
        )}
        role="status"
        aria-label={ariaLabel}
        data-color={color}
      >
        {score}/100
        {ghostsCount > 0 && (
          <span className="text-xs font-normal opacity-80">· {ghostsCount} vacías</span>
        )}
      </span>
    );
  }

  return (
    <div
      className={cn(
        'inline-flex flex-col items-center justify-center rounded-full border-2 p-4',
        COLOR_CLASSES[color],
        className,
      )}
      style={{ width: 96, height: 96 }}
      role="status"
      aria-label={ariaLabel}
      data-color={color}
    >
      <span className="text-2xl font-bold leading-none">{score}</span>
      <span className="mt-1 text-[10px] uppercase tracking-wide opacity-80">score</span>

      {(ghostsCount > 0 || aiUnlockedCount > 0 || fallbacksCount > 0) && (
        <span className="sr-only">
          {ghostsCount} secciones vacías, {aiUnlockedCount} campos IA sin lock, {fallbacksCount} usando default.
        </span>
      )}
    </div>
  );
}
