import { cn } from '@/lib/utils';
import type { DataSourceCode } from '@bukeer/website-contract';

const LABELS: Record<DataSourceCode, string> = {
  flutter: 'Flutter',
  studio: 'Studio',
  ai: 'IA',
  aggregation: 'Agregado',
  computed: 'Computado',
  google: 'Google',
  hardcoded: 'Default',
};

const DESCRIPTIONS: Record<DataSourceCode, string> = {
  flutter: 'Editado desde Bukeer Flutter (catálogo)',
  studio: 'Editado desde Bukeer Studio (esta app)',
  ai: 'Generado por IA — puede regenerarse',
  aggregation: 'Calculado desde productos hijos (paquetes)',
  computed: 'Derivado en tiempo de render — no editable directo',
  google: 'Obtenido de Google (reviews, places)',
  hardcoded: 'Usando texto por defecto del sistema',
};

const CLASSES: Record<DataSourceCode, string> = {
  flutter: 'bg-sky-500/15 text-sky-700 border-sky-500/30',
  studio: 'bg-primary/15 text-primary border-primary/30',
  ai: 'bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/30',
  aggregation: 'bg-amber-800/15 text-amber-800 border-amber-800/30',
  computed: 'bg-rose-500/15 text-rose-700 border-rose-500/30',
  google: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  hardcoded: 'bg-muted text-muted-foreground border-border',
};

export interface DataSourceBadgeProps {
  source: DataSourceCode;
  compact?: boolean;
  className?: string;
}

export function DataSourceBadge({ source, compact = false, className }: DataSourceBadgeProps) {
  const label = LABELS[source];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        CLASSES[source],
        className,
      )}
      title={DESCRIPTIONS[source]}
      aria-label={`Fuente: ${label}`}
      data-source={source}
    >
      <span aria-hidden>{dotFor(source)}</span>
      {!compact && label}
    </span>
  );
}

function dotFor(source: DataSourceCode): string {
  switch (source) {
    case 'flutter': return '🟦';
    case 'studio': return '🟨';
    case 'ai': return '🟪';
    case 'aggregation': return '🟫';
    case 'computed': return '🟥';
    case 'google': return '🟩';
    case 'hardcoded': return '⬛';
  }
}
