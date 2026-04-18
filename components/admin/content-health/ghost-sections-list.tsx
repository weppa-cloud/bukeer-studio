import Link from 'next/link';
import type { GhostSection } from '@bukeer/website-contract';

export interface GhostSectionsListProps {
  ghosts: GhostSection[];
  productEditorBasePath: string;
}

const REASON_LABELS = {
  empty: 'vacío',
  threshold_not_met: 'datos insuficientes',
  dependency_missing: 'dependencia faltante',
  feature_disabled: 'deshabilitado',
} as const;

export function GhostSectionsList({ ghosts, productEditorBasePath }: GhostSectionsListProps) {
  if (ghosts.length === 0) {
    return (
      <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">
        Todas las secciones tienen contenido.
      </p>
    );
  }

  return (
    <section aria-label="Secciones vacías">
      <header className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground">Secciones vacías</h4>
        <span className="text-xs text-muted-foreground">{ghosts.length} pendiente{ghosts.length === 1 ? '' : 's'}</span>
      </header>
      <ul className="space-y-2" role="list">
        {ghosts.map((ghost) => {
          const ctaHref = ghost.cta ? `${productEditorBasePath}${ghost.cta.anchor}` : null;
          return (
            <li
              key={ghost.section}
              className="flex items-center justify-between gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{ghost.label}</p>
                <p className="text-xs text-muted-foreground">Motivo: {REASON_LABELS[ghost.reason]}</p>
              </div>
              {ctaHref && ghost.cta && (
                <Link
                  href={ctaHref}
                  className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`${ghost.cta.label} para sección ${ghost.label}`}
                >
                  {ghost.cta.label} →
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
