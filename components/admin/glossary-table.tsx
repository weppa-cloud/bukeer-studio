'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  StudioBadge,
  StudioButton,
  StudioInput,
  StudioSelect,
  StudioEmptyState,
} from '@/components/studio/ui/primitives';
import { GlossaryForm } from '@/components/admin/glossary-form';
import { GlossaryCsvImport } from '@/components/admin/glossary-csv-import';
import { GlossaryDeleteConfirm } from '@/components/admin/glossary-delete-confirm';
import type { GlossaryPageFilters } from '@/app/dashboard/[websiteId]/translations/glossary/page';

/**
 * Shape returned by GET /api/seo/glossary. Superset of the Zod contract — the
 * backend surface is still evolving (Agent F), so we stay tolerant here.
 */
export interface GlossaryItemRow {
  id: string;
  websiteId: string;
  locale: string;
  term: string;
  translation: string | null;
  isBrand: boolean;
  isDestinationName: boolean;
  caseSensitive: boolean;
  notes: string | null;
  updatedAt?: string;
}

interface GlossaryTableProps {
  websiteId: string;
  filters: GlossaryPageFilters;
  supportedLocales: ReadonlyArray<{ value: string; label: string }>;
}

type FetchState =
  | { kind: 'loading' }
  | { kind: 'ready'; rows: GlossaryItemRow[] }
  | { kind: 'endpoint-missing' }
  | { kind: 'error'; message: string };

const TYPE_OPTIONS: ReadonlyArray<{ value: GlossaryPageFilters['type']; label: string }> = [
  { value: 'all', label: 'Tipo: todos' },
  { value: 'brand', label: 'Marcas' },
  { value: 'destination', label: 'Destinos' },
  { value: 'generic', label: 'Genéricos' },
];

function classifyItem(row: GlossaryItemRow): GlossaryPageFilters['type'] {
  if (row.isBrand) return 'brand';
  if (row.isDestinationName) return 'destination';
  return 'generic';
}

function typeLabel(type: GlossaryPageFilters['type']): string {
  if (type === 'brand') return 'Marca';
  if (type === 'destination') return 'Destino';
  return 'Genérico';
}

function typeTone(type: GlossaryPageFilters['type']): 'info' | 'success' | 'neutral' {
  if (type === 'brand') return 'info';
  if (type === 'destination') return 'success';
  return 'neutral';
}

/** Map raw API payload (envelope `data.rows`) into our VM. Tolerant of shape. */
function mapRows(raw: unknown): GlossaryItemRow[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { rows?: unknown }).rows)
      ? ((raw as { rows: unknown[] }).rows)
      : [];

  return list
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const item = entry as Record<string, unknown>;
      const id = typeof item.id === 'string' ? item.id : '';
      const websiteId =
        typeof item.websiteId === 'string'
          ? item.websiteId
          : typeof item.website_id === 'string'
            ? item.website_id
            : '';
      const locale = typeof item.locale === 'string' ? item.locale : '';
      const term = typeof item.term === 'string' ? item.term : '';
      const translationRaw = item.translation;
      const translation =
        typeof translationRaw === 'string' && translationRaw.length > 0 ? translationRaw : null;
      const isBrand =
        item.isBrand === true ||
        item.is_brand === true ||
        String(item.isBrand ?? item.is_brand ?? '').toLowerCase() === 'true';
      const isDestinationName =
        item.isDestinationName === true ||
        item.is_destination_name === true ||
        String(item.isDestinationName ?? item.is_destination_name ?? '').toLowerCase() === 'true';
      const caseSensitive =
        item.caseSensitive === true ||
        item.case_sensitive === true ||
        String(item.caseSensitive ?? item.case_sensitive ?? '').toLowerCase() === 'true';
      const notesRaw = item.notes;
      const notes = typeof notesRaw === 'string' && notesRaw.length > 0 ? notesRaw : null;
      const updatedAt =
        typeof item.updatedAt === 'string'
          ? item.updatedAt
          : typeof item.updated_at === 'string'
            ? (item.updated_at as string)
            : undefined;

      if (!id || !term || !locale) return null;
      return {
        id,
        websiteId,
        locale,
        term,
        translation,
        isBrand,
        isDestinationName,
        caseSensitive,
        notes,
        updatedAt,
      } satisfies GlossaryItemRow;
    })
    .filter((row): row is GlossaryItemRow => row !== null);
}

export function GlossaryTable({ websiteId, filters, supportedLocales }: GlossaryTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [state, setState] = useState<FetchState>({ kind: 'loading' });
  const [search, setSearch] = useState(filters.q);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GlossaryItemRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [deleting, setDeleting] = useState<GlossaryItemRow | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  // Keep the local search input in sync if searchParams change externally.
  useEffect(() => {
    setSearch(filters.q);
  }, [filters.q]);

  // Load list — re-run when any filter or reloadTick changes.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState({ kind: 'loading' });
      const qs = new URLSearchParams({ websiteId });
      if (filters.locale) qs.set('locale', filters.locale);
      if (filters.type === 'brand') qs.set('isBrand', 'true');
      else if (filters.type === 'destination') qs.set('isDestinationName', 'true');
      if (filters.q) qs.set('search', filters.q);

      try {
        const response = await fetch(`/api/seo/glossary?${qs.toString()}`, { cache: 'no-store' });
        if (response.status === 404) {
          if (!cancelled) setState({ kind: 'endpoint-missing' });
          return;
        }
        const json = (await response.json().catch(() => null)) as
          | {
              success?: boolean;
              data?: unknown;
              error?: { message?: string };
            }
          | null;
        if (!response.ok || !json?.success) {
          if (!cancelled) {
            setState({
              kind: 'error',
              message: json?.error?.message ?? 'No se pudo cargar el glosario.',
            });
          }
          return;
        }
        const rows = mapRows(json.data);
        if (!cancelled) setState({ kind: 'ready', rows });
      } catch {
        if (!cancelled) {
          setState({ kind: 'endpoint-missing' });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [websiteId, filters.locale, filters.type, filters.q, reloadTick]);

  const updateSearchParams = useCallback(
    (updates: Partial<GlossaryPageFilters>) => {
      const next = new URLSearchParams(searchParams?.toString() ?? '');
      const merged: GlossaryPageFilters = { ...filters, ...updates };

      const setOrDelete = (key: keyof GlossaryPageFilters, value: string) => {
        if (value && value !== 'all') next.set(key, value);
        else next.delete(key);
      };
      setOrDelete('locale', merged.locale);
      setOrDelete('type', merged.type);
      setOrDelete('q', merged.q);

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
      updateSearchParams({ q: search });
    },
    [search, updateSearchParams],
  );

  const localeOptions = useMemo(
    () => [
      { value: '', label: 'Locale: todos' },
      ...supportedLocales.map((loc) => ({ value: loc.value, label: loc.label })),
    ],
    [supportedLocales],
  );

  const typeSelectOptions = useMemo(
    () => TYPE_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label })),
    [],
  );

  const handleCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const handleEdit = useCallback((row: GlossaryItemRow) => {
    setEditing(row);
    setFormOpen(true);
  }, []);

  const handleFormClose = useCallback(
    (saved: boolean) => {
      setFormOpen(false);
      setEditing(null);
      if (saved) setReloadTick((n) => n + 1);
    },
    [],
  );

  const handleImportClose = useCallback((didImport: boolean) => {
    setImportOpen(false);
    if (didImport) setReloadTick((n) => n + 1);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleting) return;
    setDeleteError(null);
    try {
      const response = await fetch(`/api/seo/glossary/${deleting.id}`, { method: 'DELETE' });
      if (response.status === 404) {
        setDeleteError('Endpoint pendiente — no se pudo eliminar.');
        return;
      }
      const json = (await response.json().catch(() => null)) as
        | { success?: boolean; error?: { message?: string } }
        | null;
      if (!response.ok || !json?.success) {
        setDeleteError(json?.error?.message ?? 'No se pudo eliminar el término.');
        return;
      }
      setDeleting(null);
      setReloadTick((n) => n + 1);
    } catch {
      setDeleteError('Error de red al eliminar.');
    }
  }, [deleting]);

  const rows = state.kind === 'ready' ? state.rows : [];

  return (
    <div className="space-y-4">
      {/* Filter + actions bar */}
      <form
        onSubmit={handleSubmitSearch}
        className="grid grid-cols-1 md:grid-cols-6 gap-2"
        aria-label="Filtros del glosario"
      >
        <StudioSelect
          value={filters.locale}
          onChange={(event) => updateSearchParams({ locale: event.target.value })}
          options={localeOptions}
          aria-label="Filtrar por locale"
        />
        <StudioSelect
          value={filters.type}
          onChange={(event) =>
            updateSearchParams({ type: event.target.value as GlossaryPageFilters['type'] })
          }
          options={typeSelectOptions}
          aria-label="Filtrar por tipo"
        />
        <StudioInput
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar término…"
          aria-label="Buscar término"
          className="md:col-span-2"
        />
        <div className="flex items-center gap-2 md:col-span-2 md:justify-end">
          <StudioButton type="submit" size="sm" variant="outline">
            Aplicar
          </StudioButton>
          <StudioButton
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setImportOpen(true)}
          >
            Importar CSV
          </StudioButton>
          <StudioButton type="button" size="sm" onClick={handleCreate}>
            Añadir término
          </StudioButton>
        </div>
      </form>

      {/* Error alert — aria-live for screen readers */}
      {state.kind === 'error' ? (
        <div
          role="alert"
          aria-live="polite"
          className="studio-panel border border-[var(--studio-danger)]/40 text-[var(--studio-danger)] p-3 text-sm rounded-lg"
        >
          {state.message}
        </div>
      ) : null}

      {/* Endpoint-missing graceful degradation */}
      {state.kind === 'endpoint-missing' ? (
        <StudioEmptyState
          title="Endpoints de glosario pendientes"
          description="Estamos esperando a que el backend habilite `/api/seo/glossary`. La UI ya está lista para listar, crear, editar y eliminar términos cuando el endpoint esté disponible."
          action={
            <StudioButton
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setReloadTick((n) => n + 1)}
            >
              Reintentar
            </StudioButton>
          }
        />
      ) : null}

      {/* Loading skeletons */}
      {state.kind === 'loading' ? (
        <div className="studio-card overflow-x-auto" aria-busy="true" aria-live="polite">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-[var(--studio-border)]">
                <th className="py-2 px-3">Término</th>
                <th className="py-2 px-3">Locale</th>
                <th className="py-2 px-3">Traducción</th>
                <th className="py-2 px-3">Tipo</th>
                <th className="py-2 px-3">Notas</th>
                <th className="py-2 px-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3].map((key) => (
                <tr key={key} className="border-b border-[var(--studio-border)] last:border-b-0">
                  {[0, 1, 2, 3, 4, 5].map((col) => (
                    <td key={col} className="py-3 px-3">
                      <div className="h-3 w-full rounded bg-[var(--studio-border)] animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {/* Ready table */}
      {state.kind === 'ready' ? (
        <div className="studio-card overflow-x-auto">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--studio-border)]">
            <div>
              <h2 className="text-sm font-semibold text-[var(--studio-text)]">Términos</h2>
              <p className="text-xs text-[var(--studio-text-muted)]">
                {rows.length === 0
                  ? 'Sin términos con los filtros actuales.'
                  : `${rows.length} término(s)`}
              </p>
            </div>
          </div>
          {rows.length === 0 ? (
            <div className="p-6 text-center text-sm text-[var(--studio-text-muted)]">
              Aún no hay términos. Usa <em>Añadir término</em> o <em>Importar CSV</em> para empezar.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--studio-border)]">
                  <th className="py-2 px-3">Término</th>
                  <th className="py-2 px-3">Locale</th>
                  <th className="py-2 px-3">Traducción</th>
                  <th className="py-2 px-3">Tipo</th>
                  <th className="py-2 px-3">Notas</th>
                  <th className="py-2 px-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const klass = classifyItem(row);
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-[var(--studio-border)] last:border-b-0"
                    >
                      <td className="py-2 px-3 font-medium text-[var(--studio-text)]">
                        {row.term}
                        {row.caseSensitive ? (
                          <span
                            className="ml-2 text-[10px] text-[var(--studio-text-muted)] uppercase"
                            title="Case-sensitive"
                          >
                            aA
                          </span>
                        ) : null}
                      </td>
                      <td className="py-2 px-3 text-[var(--studio-text-muted)]">{row.locale}</td>
                      <td className="py-2 px-3">
                        {row.translation ? (
                          <span className="text-[var(--studio-text)]">{row.translation}</span>
                        ) : (
                          <StudioBadge tone="warning">no traducir</StudioBadge>
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <StudioBadge tone={typeTone(klass)}>{typeLabel(klass)}</StudioBadge>
                      </td>
                      <td className="py-2 px-3 text-[var(--studio-text-muted)] max-w-[240px] truncate">
                        {row.notes ?? '—'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="inline-flex gap-2">
                          <StudioButton
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEdit(row)}
                            aria-label={`Editar ${row.term}`}
                          >
                            Editar
                          </StudioButton>
                          <StudioButton
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setDeleteError(null);
                              setDeleting(row);
                            }}
                            aria-label={`Eliminar ${row.term}`}
                          >
                            Eliminar
                          </StudioButton>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      ) : null}

      {/* Dialogs */}
      {formOpen ? (
        <GlossaryForm
          websiteId={websiteId}
          item={editing}
          supportedLocales={supportedLocales}
          onClose={handleFormClose}
        />
      ) : null}

      {importOpen ? (
        <GlossaryCsvImport websiteId={websiteId} onClose={handleImportClose} />
      ) : null}

      {deleting ? (
        <GlossaryDeleteConfirm
          term={deleting.term}
          error={deleteError}
          onCancel={() => {
            setDeleting(null);
            setDeleteError(null);
          }}
          onConfirm={handleDeleteConfirm}
        />
      ) : null}
    </div>
  );
}
