import type {
  ExperimentResult,
  FunnelStage,
  GrowthInventoryRow,
  InventoryStatus,
} from '@bukeer/website-contract';
import { GrowthExperimentRow } from './growth-experiment-row';
import { GrowthInventoryFilters } from './growth-inventory-filters';
import {
  StudioButton,
  StudioEmptyState,
} from '@/components/studio/ui/primitives';
import Link from 'next/link';

/**
 * Growth Inventory table — server-paginated (50 rows/page).
 *
 * Server component (ADR-001). The query string carries page state so the
 * RSC re-renders on filter / page changes without client-side hydration.
 *
 * Multi-tenant scoping (ADR-009): the page route is responsible for passing
 * `account_id` + `website_id`; this component only renders the rows it gets.
 */

const PAGE_SIZE = 50;

interface GrowthInventoryTableProps {
  websiteId: string;
  rows: GrowthInventoryRow[];
  total: number;
  page: number;
  filters: {
    locale?: string;
    market?: string;
    cluster?: string;
    funnel_stage?: FunnelStage;
    status?: InventoryStatus;
    result?: ExperimentResult;
  };
  /** Available filter options derived from the dataset on the server */
  options: {
    locales: string[];
    markets: string[];
    clusters: string[];
  };
}

function buildHref(
  websiteId: string,
  next: Partial<GrowthInventoryTableProps['filters']> & { page?: number }
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return `/dashboard/${websiteId}/growth${qs ? `?${qs}` : ''}`;
}

export function GrowthInventoryTable({
  websiteId,
  rows,
  total,
  page,
  filters,
  options,
}: GrowthInventoryTableProps) {
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, total);

  return (
    <div className="space-y-3">
      <GrowthInventoryFilters
        websiteId={websiteId}
        filters={filters}
        options={options}
      />

      {rows.length === 0 ? (
        <StudioEmptyState
          title="Sin filas en el inventario"
          description="Aún no hay surfaces growth para este website. Conecta GSC/GA4 o registra hipótesis para empezar."
        />
      ) : (
        <div className="studio-card overflow-x-auto dark:border-[var(--studio-border)]">
          <table className="w-full text-sm" aria-label="Growth Inventory">
            <thead>
              <tr className="text-left border-b border-[var(--studio-border)] bg-[var(--studio-surface)]/40">
                <th className="py-3 px-3 text-xs font-medium text-[var(--studio-text-muted)]">
                  URL / Cluster
                </th>
                <th className="py-3 px-3 text-xs font-medium text-[var(--studio-text-muted)]">
                  Stage / Channel
                </th>
                <th className="py-3 px-3 text-xs font-medium text-[var(--studio-text-muted)]">
                  Métricas 28D
                </th>
                <th className="py-3 px-3 text-xs font-medium text-[var(--studio-text-muted)]">
                  Hipótesis
                </th>
                <th className="py-3 px-3 text-xs font-medium text-[var(--studio-text-muted)]">
                  Owner
                </th>
                <th className="py-3 px-3 text-xs font-medium text-[var(--studio-text-muted)]">
                  Baseline
                </th>
                <th className="py-3 px-3 text-xs font-medium text-[var(--studio-text-muted)]">
                  Evaluación
                </th>
                <th className="py-3 px-3 text-xs font-medium text-[var(--studio-text-muted)]">
                  Status
                </th>
                <th className="py-3 px-3 text-xs font-medium text-[var(--studio-text-muted)]">
                  Result
                </th>
                <th className="py-3 px-3 text-xs font-medium text-[var(--studio-text-muted)]">
                  Ready
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <GrowthExperimentRow
                  key={`${row.website_id}:${row.canonical_url}:${row.funnel_stage}`}
                  row={row}
                />
              ))}
            </tbody>
          </table>

          {total > PAGE_SIZE ? (
            <div className="flex items-center justify-between px-3 py-3 border-t border-[var(--studio-border)]">
              <p className="text-xs text-[var(--studio-text-muted)]">
                {start}–{end} de {total}
              </p>
              <div className="flex items-center gap-2">
                <Link
                  href={buildHref(websiteId, {
                    ...filters,
                    page: Math.max(1, page - 1),
                  })}
                  aria-disabled={page <= 1}
                  className={page <= 1 ? 'pointer-events-none opacity-50' : ''}
                >
                  <StudioButton size="sm" variant="outline" disabled={page <= 1}>
                    ←
                  </StudioButton>
                </Link>
                <span className="text-xs text-[var(--studio-text-muted)]">
                  {page} / {pageCount}
                </span>
                <Link
                  href={buildHref(websiteId, {
                    ...filters,
                    page: Math.min(pageCount, page + 1),
                  })}
                  aria-disabled={page >= pageCount}
                  className={
                    page >= pageCount ? 'pointer-events-none opacity-50' : ''
                  }
                >
                  <StudioButton
                    size="sm"
                    variant="outline"
                    disabled={page >= pageCount}
                  >
                    →
                  </StudioButton>
                </Link>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
