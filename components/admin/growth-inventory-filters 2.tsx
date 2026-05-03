'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import {
  StudioSelect,
  StudioButton,
} from '@/components/studio/ui/primitives';
import type {
  ExperimentResult,
  FunnelStage,
  InventoryStatus,
} from '@bukeer/website-contract';

/**
 * Client-only filter form for Growth Inventory.
 *
 * Filter state is kept in the URL (query string) so the parent RSC re-runs
 * on change. We use `router.push` + `useTransition` to keep the UI responsive
 * while the server re-renders.
 */

interface GrowthInventoryFiltersProps {
  websiteId: string;
  filters: {
    locale?: string;
    market?: string;
    cluster?: string;
    funnel_stage?: FunnelStage;
    status?: InventoryStatus;
    result?: ExperimentResult;
  };
  options: {
    locales: string[];
    markets: string[];
    clusters: string[];
  };
}

const FUNNEL_STAGES: readonly FunnelStage[] = [
  'acquisition',
  'activation',
  'qualified_lead',
  'quote_sent',
  'booking',
  'review_referral',
] as const;

const INVENTORY_STATUSES: readonly InventoryStatus[] = [
  'idea',
  'queued',
  'in_progress',
  'shipped',
  'evaluated',
  'archived',
] as const;

const EXPERIMENT_RESULTS: readonly ExperimentResult[] = [
  'pending',
  'win',
  'loss',
  'inconclusive',
  'scale',
  'stop',
] as const;

function buildHref(
  websiteId: string,
  filters: GrowthInventoryFiltersProps['filters']
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== '' && value !== null) {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return `/dashboard/${websiteId}/growth${qs ? `?${qs}` : ''}`;
}

export function GrowthInventoryFilters({
  websiteId,
  filters,
  options,
}: GrowthInventoryFiltersProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function update(
    next: Partial<GrowthInventoryFiltersProps['filters']>
  ): void {
    const merged = { ...filters, ...next };
    // Reset page when filters change — handled via absent `page` param.
    startTransition(() => {
      router.push(buildHref(websiteId, merged), { scroll: false });
    });
  }

  function clearAll(): void {
    startTransition(() => {
      router.push(`/dashboard/${websiteId}/growth`, { scroll: false });
    });
  }

  const hasFilters = Object.values(filters).some(
    (value) => value !== undefined && value !== '' && value !== null
  );

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-2"
      aria-busy={isPending}
    >
      <StudioSelect
        aria-label="Locale"
        value={filters.locale ?? ''}
        onChange={(e) => update({ locale: e.target.value || undefined })}
        options={[
          { value: '', label: 'Locale: todos' },
          ...options.locales.map((l) => ({ value: l, label: l })),
        ]}
      />
      <StudioSelect
        aria-label="Mercado"
        value={filters.market ?? ''}
        onChange={(e) => update({ market: e.target.value || undefined })}
        options={[
          { value: '', label: 'Mercado: todos' },
          ...options.markets.map((m) => ({ value: m, label: m })),
        ]}
      />
      <StudioSelect
        aria-label="Cluster"
        value={filters.cluster ?? ''}
        onChange={(e) => update({ cluster: e.target.value || undefined })}
        options={[
          { value: '', label: 'Cluster: todos' },
          ...options.clusters.map((c) => ({ value: c, label: c })),
        ]}
      />
      <StudioSelect
        aria-label="Funnel stage"
        value={filters.funnel_stage ?? ''}
        onChange={(e) =>
          update({
            funnel_stage: (e.target.value as FunnelStage) || undefined,
          })
        }
        options={[
          { value: '', label: 'Funnel: todos' },
          ...FUNNEL_STAGES.map((s) => ({ value: s, label: s })),
        ]}
      />
      <StudioSelect
        aria-label="Status"
        value={filters.status ?? ''}
        onChange={(e) =>
          update({
            status: (e.target.value as InventoryStatus) || undefined,
          })
        }
        options={[
          { value: '', label: 'Status: todos' },
          ...INVENTORY_STATUSES.map((s) => ({ value: s, label: s })),
        ]}
      />
      <StudioSelect
        aria-label="Result"
        value={filters.result ?? ''}
        onChange={(e) =>
          update({
            result: (e.target.value as ExperimentResult) || undefined,
          })
        }
        options={[
          { value: '', label: 'Result: todos' },
          ...EXPERIMENT_RESULTS.map((r) => ({ value: r, label: r })),
        ]}
      />

      {hasFilters ? (
        <div className="md:col-span-3 lg:col-span-6 flex justify-end">
          <StudioButton
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={isPending}
          >
            Limpiar filtros
          </StudioButton>
        </div>
      ) : null}
    </div>
  );
}
