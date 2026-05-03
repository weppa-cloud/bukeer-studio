import type {
  ExperimentResult,
  GrowthInventoryRow,
  InventoryStatus,
} from '@bukeer/website-contract';
import { isReadyForInProgress } from '@bukeer/website-contract';
import { StudioBadge } from '@/components/studio/ui/primitives';

/**
 * Single Growth Inventory row (SPEC #337).
 *
 * Renders hypothesis / baseline / owner / success_metric / evaluation_date /
 * result chips and a "ready for in_progress" indicator that runs the
 * shared `isReadyForInProgress()` predicate from `@bukeer/website-contract`.
 */

interface GrowthExperimentRowProps {
  row: GrowthInventoryRow;
}

function statusTone(
  status: InventoryStatus
): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  switch (status) {
    case 'idea':
      return 'neutral';
    case 'queued':
      return 'info';
    case 'in_progress':
      return 'warning';
    case 'shipped':
      return 'info';
    case 'evaluated':
      return 'success';
    case 'archived':
      return 'neutral';
    default:
      return 'neutral';
  }
}

function resultTone(
  result: ExperimentResult
): 'neutral' | 'info' | 'success' | 'warning' | 'danger' {
  switch (result) {
    case 'win':
    case 'scale':
      return 'success';
    case 'loss':
    case 'stop':
      return 'danger';
    case 'inconclusive':
      return 'warning';
    case 'pending':
    default:
      return 'neutral';
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
  } catch {
    return '—';
  }
}

export function GrowthExperimentRow({ row }: GrowthExperimentRowProps) {
  const ready = isReadyForInProgress(row);

  return (
    <tr className="border-b border-[var(--studio-border)]/50 align-top">
      <td className="px-3 py-2">
        <div className="flex flex-col gap-0.5 max-w-[260px]">
          <p className="text-sm font-medium text-[var(--studio-text)] truncate">
            {row.canonical_url}
          </p>
          <p className="text-[11px] text-[var(--studio-text-muted)] capitalize">
            {row.template_type} · {row.locale} · {row.market}
            {row.cluster ? ` · ${row.cluster}` : ''}
          </p>
        </div>
      </td>

      <td className="px-3 py-2">
        <div className="flex flex-col gap-1">
          <StudioBadge tone="info">{row.funnel_stage}</StudioBadge>
          <span className="text-[10px] text-[var(--studio-text-muted)] capitalize">
            {row.channel}
          </span>
        </div>
      </td>

      <td className="px-3 py-2">
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="text-[var(--studio-text)]">
            {row.gsc_clicks_28d.toLocaleString('es-CO')} clicks
          </span>
          <span className="text-[var(--studio-text-muted)]">
            {row.ga4_sessions_28d.toLocaleString('es-CO')} sesiones
          </span>
          <span className="text-[var(--studio-text-muted)]">
            {row.qualified_leads} leads · {row.bookings_confirmed} bookings
          </span>
        </div>
      </td>

      <td className="px-3 py-2">
        <div className="flex flex-col gap-0.5 text-xs max-w-[220px]">
          <span
            className="text-[var(--studio-text)] line-clamp-2"
            title={row.hypothesis ?? undefined}
          >
            {row.hypothesis ?? <em className="text-[var(--studio-text-muted)]">Sin hipótesis</em>}
          </span>
          {row.success_metric ? (
            <span className="text-[10px] text-[var(--studio-text-muted)] truncate">
              KPI: {row.success_metric}
            </span>
          ) : null}
        </div>
      </td>

      <td className="px-3 py-2 text-xs text-[var(--studio-text)]">
        {row.owner ?? <span className="text-[var(--studio-text-muted)]">—</span>}
      </td>

      <td className="px-3 py-2 text-xs text-[var(--studio-text-muted)]">
        {formatDate(row.baseline_start)}
        {row.baseline_end ? ` → ${formatDate(row.baseline_end)}` : ''}
      </td>

      <td className="px-3 py-2 text-xs text-[var(--studio-text-muted)]">
        {formatDate(row.evaluation_date)}
      </td>

      <td className="px-3 py-2">
        <StudioBadge tone={statusTone(row.status)}>{row.status}</StudioBadge>
      </td>

      <td className="px-3 py-2">
        <StudioBadge tone={resultTone(row.result)}>{row.result}</StudioBadge>
      </td>

      <td className="px-3 py-2">
        {ready ? (
          <StudioBadge tone="success">Ready</StudioBadge>
        ) : (
          <StudioBadge tone="warning">Falta info</StudioBadge>
        )}
      </td>
    </tr>
  );
}
