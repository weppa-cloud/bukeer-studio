'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { TranslationJobItem } from '@bukeer/website-contract';
import {
  StudioButton,
  StudioInput,
  StudioSelect,
  StudioBadge,
} from '@/components/studio/ui/primitives';
import { TranslationRow } from '@/components/admin/translation-row';
import { TranslationBulkBar } from '@/components/admin/translation-bulk-bar';
import { DriftBanner } from '@/components/admin/drift-banner';
import { TopicalAuthorityCard } from '@/components/admin/topical-authority-card';

export interface TranslationsFilterValues {
  sourceLocale: string;
  targetLocale: string;
  pageType: string;
  status: string;
  search: string;
  drift: boolean;
}

export interface TranslationRowVM {
  job: TranslationJobItem;
  qaFindingCount: number;
  drift: boolean;
}

interface TranslationsDashboardProps {
  websiteId: string;
  rows: TranslationRowVM[];
  kpis: {
    total: number;
    translated: number;
    inDraft: number;
    inReview: number;
    pending: number;
  };
  driftCount: number;
  filters: TranslationsFilterValues;
}

const PAGE_TYPE_OPTIONS = [
  { value: '', label: 'Tipo: todos' },
  { value: 'blog', label: 'Blog' },
  { value: 'page', label: 'Página' },
  { value: 'destination', label: 'Destino' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'activity', label: 'Actividad' },
  { value: 'package', label: 'Paquete' },
  { value: 'transfer', label: 'Traslado' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Estado: todos' },
  { value: 'draft', label: 'Draft' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'applied', label: 'Applied' },
  { value: 'published', label: 'Published' },
];

function KpiCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number | string;
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
}) {
  return (
    <div className="studio-card p-4 space-y-2">
      <p className="text-xs text-[var(--studio-text-muted)] uppercase tracking-wide">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold text-[var(--studio-text)]">{value}</p>
        <StudioBadge tone={tone}>{label}</StudioBadge>
      </div>
    </div>
  );
}

export function TranslationsDashboard({
  websiteId,
  rows,
  kpis,
  driftCount,
  filters,
}: TranslationsDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState(filters.search);

  const updateSearchParams = useCallback(
    (updates: Partial<TranslationsFilterValues>) => {
      const next = new URLSearchParams(searchParams?.toString() ?? '');

      const merged: TranslationsFilterValues = { ...filters, ...updates };

      const setOrDelete = (key: keyof TranslationsFilterValues, raw: string | boolean) => {
        const value = typeof raw === 'boolean' ? (raw ? 'true' : '') : raw.trim();
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
      };

      setOrDelete('sourceLocale', merged.sourceLocale);
      setOrDelete('targetLocale', merged.targetLocale);
      setOrDelete('pageType', merged.pageType);
      setOrDelete('status', merged.status);
      setOrDelete('search', merged.search);
      setOrDelete('drift', merged.drift);

      const queryString = next.toString();
      startTransition(() => {
        router.replace(queryString ? `?${queryString}` : '?', { scroll: false });
      });
    },
    [filters, router, searchParams],
  );

  const handleSubmitSearch = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      updateSearchParams({ search });
    },
    [search, updateSearchParams],
  );

  const handleToggleDrift = useCallback(() => {
    updateSearchParams({ drift: !filters.drift });
  }, [filters.drift, updateSearchParams]);

  const pendingRows = useMemo(
    () => rows.filter((row) => row.job.status === 'draft'),
    [rows],
  );
  const activeRows = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.job.status === 'reviewed' ||
          row.job.status === 'applied' ||
          row.job.status === 'published',
      ),
    [rows],
  );

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleMany = useCallback((ids: string[], checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // Topical authority card reads the first known targetLocale — fallback to 'en-US'.
  const topicalLocale = filters.targetLocale || 'en-US';

  return (
    <div className="space-y-5">
      {/* Filter bar */}
      <form
        onSubmit={handleSubmitSearch}
        className="grid grid-cols-1 md:grid-cols-6 gap-2"
        aria-label="Filtros de traducciones"
      >
        <StudioInput
          value={filters.sourceLocale}
          onChange={(event) =>
            updateSearchParams({ sourceLocale: event.target.value })
          }
          placeholder="Source locale (es-CO)"
          aria-label="Source locale"
        />
        <StudioInput
          value={filters.targetLocale}
          onChange={(event) =>
            updateSearchParams({ targetLocale: event.target.value })
          }
          placeholder="Target locale (en-US)"
          aria-label="Target locale"
        />
        <StudioSelect
          value={filters.pageType}
          onChange={(event) => updateSearchParams({ pageType: event.target.value })}
          options={PAGE_TYPE_OPTIONS}
          aria-label="Page type"
        />
        <StudioSelect
          value={filters.status}
          onChange={(event) => updateSearchParams({ status: event.target.value })}
          options={STATUS_OPTIONS}
          aria-label="Status"
        />
        <StudioInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar keyword / id"
          aria-label="Buscar"
        />
        <div className="flex items-center gap-2">
          <StudioButton type="submit" size="sm" disabled={isPending}>
            Aplicar
          </StudioButton>
          <StudioButton
            type="button"
            size="sm"
            variant="ghost"
            onClick={handleToggleDrift}
            aria-pressed={filters.drift}
          >
            {filters.drift ? 'Drift: on' : 'Drift: off'}
          </StudioButton>
        </div>
      </form>

      {/* KPI cards */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard label="Total" value={kpis.total} tone="info" />
        <KpiCard label="Traducidos" value={kpis.translated} tone="success" />
        <KpiCard label="In Draft" value={kpis.inDraft} tone="warning" />
        <KpiCard label="In Review" value={kpis.inReview} tone="info" />
        <KpiCard label="Pending" value={kpis.pending} tone="danger" />
      </section>

      {/* Widgets row */}
      <section className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <DriftBanner
          count={driftCount}
          active={filters.drift}
          onToggle={handleToggleDrift}
        />
        <div className="xl:col-span-2">
          <TopicalAuthorityCard websiteId={websiteId} locale={topicalLocale} />
        </div>
      </section>

      {/* Pending table */}
      <TableSection
        websiteId={websiteId}
        title="Pendientes"
        subtitle="Jobs en draft — listos para crear borrador o editar transcreación."
        rows={pendingRows}
        emptyCopy="No hay traducciones pendientes con los filtros actuales."
        selected={selected}
        onToggleOne={toggleOne}
        onToggleMany={toggleMany}
        primaryLabel="Crear borrador"
      />

      {/* Active jobs table */}
      <TableSection
        websiteId={websiteId}
        title="Jobs activos"
        subtitle="Revisión y aplicación de jobs ya procesados."
        rows={activeRows}
        emptyCopy="Aún no hay jobs en review / applied / published."
        selected={selected}
        onToggleOne={toggleOne}
        onToggleMany={toggleMany}
        primaryLabel="Review"
        secondaryLabel="Apply"
      />

      {/* Bulk action bar */}
      {selected.size > 0 ? (
        <TranslationBulkBar
          count={selected.size}
          onClear={clearSelection}
        />
      ) : null}
    </div>
  );
}

interface TableSectionProps {
  websiteId: string;
  title: string;
  subtitle: string;
  rows: TranslationRowVM[];
  emptyCopy: string;
  selected: Set<string>;
  onToggleOne: (id: string) => void;
  onToggleMany: (ids: string[], checked: boolean) => void;
  primaryLabel: string;
  secondaryLabel?: string;
}

function TableSection({
  websiteId,
  title,
  subtitle,
  rows,
  emptyCopy,
  selected,
  onToggleOne,
  onToggleMany,
  primaryLabel,
  secondaryLabel,
}: TableSectionProps) {
  const allIds = rows.map((row) => row.job.id);
  const allSelected = rows.length > 0 && allIds.every((id) => selected.has(id));
  const headerCheckbox = (
    <input
      type="checkbox"
      checked={allSelected}
      onChange={(event) => onToggleMany(allIds, event.target.checked)}
      aria-label={`Seleccionar todos — ${title}`}
    />
  );

  return (
    <section className="studio-card overflow-x-auto">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--studio-border)]">
        <div>
          <h2 className="text-sm font-semibold text-[var(--studio-text)]">{title}</h2>
          <p className="text-xs text-[var(--studio-text-muted)]">{subtitle}</p>
        </div>
        <StudioBadge tone="neutral">{rows.length}</StudioBadge>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-[var(--studio-border)]">
            <th className="py-2 px-3 w-[36px]">{headerCheckbox}</th>
            <th className="py-2 px-3">Keyword / ID</th>
            <th className="py-2 px-3">Tipo</th>
            <th className="py-2 px-3">Locale</th>
            <th className="py-2 px-3">Estado</th>
            <th className="py-2 px-3">QA</th>
            <th className="py-2 px-3">Actualizado</th>
            <th className="py-2 px-3 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                className="px-3 py-6 text-center text-[var(--studio-text-muted)]"
              >
                {emptyCopy}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <TranslationRow
                key={row.job.id}
                websiteId={websiteId}
                row={row}
                selected={selected.has(row.job.id)}
                onToggle={onToggleOne}
                primaryLabel={primaryLabel}
                secondaryLabel={secondaryLabel}
              />
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}
