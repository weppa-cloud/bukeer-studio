'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  StudioPage,
  StudioSectionHeader,
  StudioButton,
  StudioBadge,
  StudioCard,
} from '@/components/studio/ui/primitives';

type ArchitectureCategoryKey =
  | 'pages'
  | 'blogs'
  | 'destinations'
  | 'hotels'
  | 'activities'
  | 'transfers'
  | 'packages'
  | 'listings';

type ArchitectureItemType =
  | 'page'
  | 'blog'
  | 'destination'
  | 'hotel'
  | 'activity'
  | 'transfer'
  | 'package'
  | 'blog-index'
  | 'destination-index';

interface ArchitectureCategorySummary {
  key: ArchitectureCategoryKey;
  label: string;
  count: number;
  linkedCount: number;
  orphanCount: number;
}

interface ArchitectureClickDepthRow {
  id: string;
  type: ArchitectureItemType;
  category: ArchitectureCategoryKey;
  name: string;
  slug: string;
  path: string;
  depth: number | null;
  inboundCount: number;
  isOrphan: boolean;
}

interface ArchitectureClickDepthBucket {
  depth: 1 | 2 | 3 | 4 | 'unreachable';
  label: string;
  count: number;
  percentage: number;
}

interface ArchitectureResponse {
  fetchedAt: string;
  website: {
    id: string;
    accountId: string | null;
    accountName: string;
    subdomain: string;
    customDomain: string | null;
    siteName: string;
    baseUrl: string;
  };
  summary: {
    totalNodes: number;
    linkedNodes: number;
    orphanPages: number;
    navLinks: number;
    homepageFeatured: number;
    destinationEdges: number;
    maxDepth: number;
  };
  categories: ArchitectureCategorySummary[];
  clickDepthBuckets: ArchitectureClickDepthBucket[];
  clickDepthRows: ArchitectureClickDepthRow[];
  orphanPages: ArchitectureClickDepthRow[];
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(1)}%`;
}

function typeLabel(type: ArchitectureItemType): string {
  const labels: Record<ArchitectureItemType, string> = {
    page: 'Página',
    blog: 'Blog',
    destination: 'Destino',
    hotel: 'Hotel',
    activity: 'Actividad',
    transfer: 'Traslado',
    package: 'Paquete',
    'blog-index': 'Listado blog',
    'destination-index': 'Listado destinos',
  };

  return labels[type];
}

function categoryTone(category: ArchitectureCategoryKey): 'info' | 'success' | 'warning' | 'danger' | 'neutral' {
  switch (category) {
    case 'pages':
      return 'info';
    case 'blogs':
      return 'success';
    case 'destinations':
      return 'warning';
    case 'listings':
      return 'neutral';
    default:
      return 'info';
  }
}

function depthTone(depth: number | null): 'success' | 'warning' | 'danger' | 'info' | 'neutral' {
  if (depth == null) return 'danger';
  if (depth <= 1) return 'success';
  if (depth === 2) return 'info';
  if (depth === 3) return 'warning';
  return 'danger';
}

function depthLabel(depth: number | null): string {
  if (depth == null) return 'Sin enlace';
  if (depth >= 4) return '4+ clicks';
  return `${depth} click${depth === 1 ? '' : 's'}`;
}

function detailHref(websiteId: string, row: ArchitectureClickDepthRow): string | null {
  if (row.type === 'blog-index' || row.type === 'destination-index') return null;
  return `/dashboard/${websiteId}/seo/${row.type}/${row.id}`;
}

function StatCard({ label, value, hint, tone = 'neutral' }: { label: string; value: string | number; hint?: string; tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger' }) {
  return (
    <StudioCard className="p-4 space-y-2">
      <p className="text-xs text-[var(--studio-text-muted)]">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <p className="text-2xl font-semibold text-[var(--studio-text)]">{value}</p>
        <StudioBadge tone={tone}>{label}</StudioBadge>
      </div>
      {hint ? <p className="text-xs text-[var(--studio-text-muted)]">{hint}</p> : null}
    </StudioCard>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        {[...Array(5)].map((_, index) => (
          <div key={index} className="studio-card p-4 animate-pulse">
            <div className="h-3 w-24 rounded bg-[var(--studio-border)]/60 mb-3" />
            <div className="h-7 w-20 rounded bg-[var(--studio-border)]/50" />
          </div>
        ))}
      </div>
      <div className="studio-card p-6 animate-pulse">
        <div className="h-4 w-40 rounded bg-[var(--studio-border)]/60 mb-4" />
        <div className="space-y-3">
          {[...Array(4)].map((_, index) => (
            <div key={index} className="h-10 rounded bg-[var(--studio-border)]/40" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SeoArchitecturePage() {
  const params = useParams<{ websiteId: string }>();
  const websiteId = params?.websiteId ?? '';
  const [data, setData] = useState<ArchitectureResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadArchitecture = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      if (!websiteId) {
        setLoading(false);
        setRefreshing(false);
        setError('websiteId no disponible');
        return;
      }

      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);

      try {
        const response = await fetch(`/api/seo/architecture?websiteId=${websiteId}`, { cache: 'no-store' });
        const body = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(body.error || body.message || 'No se pudo cargar la arquitectura');
        }

        setData(body as ArchitectureResponse);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido al cargar la arquitectura');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [websiteId]
  );

  useEffect(() => {
    void loadArchitecture('initial');
  }, [loadArchitecture]);

  const categoryRows = data?.categories ?? [];
  const depthRows = data?.clickDepthRows ?? [];
  const orphanRows = data?.orphanPages ?? [];
  const bucketRows = data?.clickDepthBuckets ?? [];
  const categoryCount = categoryRows.length;
  const totalNodes = data?.summary.totalNodes ?? 0;
  const linkedNodes = data?.summary.linkedNodes ?? 0;
  const orphanCount = data?.summary.orphanPages ?? 0;
  const lastFetchedAt = data?.fetchedAt ?? null;

  const topOrphans = orphanRows.slice(0, 12);

  return (
    <StudioPage className="max-w-6xl">
      <StudioSectionHeader
        title="Arquitectura de Contenido"
        subtitle="Datos reales desde Supabase + grafo interno + click depth calculado"
        actions={(
          <div className="flex items-center gap-2">
            {lastFetchedAt && (
              <StudioBadge tone="neutral">{formatDateTime(lastFetchedAt)}</StudioBadge>
            )}
            <StudioButton
              variant="outline"
              size="sm"
              onClick={() => loadArchitecture('refresh')}
              disabled={loading || refreshing}
            >
              {refreshing ? 'Recalculando...' : 'Recalcular'}
            </StudioButton>
            <Link href={`/dashboard/${websiteId}/analytics?tab=keywords`}>
              <StudioButton variant="outline" size="sm">
                ← Volver a Keywords
              </StudioButton>
            </Link>
          </div>
        )}
      />

      {error && (
        <div className="studio-panel mb-4 border border-[var(--studio-danger)]/40 text-[var(--studio-danger)] p-3 text-sm rounded-lg">
          {error}
        </div>
      )}

      {loading && !data ? (
        <LoadingSkeleton />
      ) : (
        <div className="space-y-6">
          <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
            <StatCard
              label="Nodos totales"
              value={totalNodes}
              hint="Páginas, posts, destinos y productos"
              tone="info"
            />
            <StatCard
              label="Enlazados"
              value={linkedNodes}
              hint="Con al menos un enlace interno"
              tone="success"
            />
            <StatCard
              label="Orphans"
              value={orphanCount}
              hint="Sin enlaces internos entrantes"
              tone="danger"
            />
            <StatCard
              label="Homepage links"
              value={data?.summary.homepageFeatured ?? 0}
              hint="Elementos destacados en portada"
              tone="warning"
            />
            <StatCard
              label="Profundidad máx."
              value={data?.summary.maxDepth ?? 0}
              hint="Mayor distancia detectada desde home/nav"
              tone="neutral"
            />
          </section>

          <section className="studio-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold text-[var(--studio-text)]">Resumen por categoría</h2>
                <p className="text-xs text-[var(--studio-text-muted)]">
                  {data?.website.siteName} · {data?.website.baseUrl}
                </p>
              </div>
              <StudioBadge tone="info">{categoryCount} categorías</StudioBadge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {categoryRows.map((category) => (
                <div key={category.key} className="studio-panel p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[var(--studio-text)]">{category.label}</h3>
                    <StudioBadge tone={categoryTone(category.key)}>{category.count}</StudioBadge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[var(--studio-text-muted)]">
                    <span>Enlazados: {category.linkedCount}</span>
                    <span>Orphans: {category.orphanCount}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <StudioCard className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--studio-text)]">Click depth buckets</h2>
                  <p className="text-xs text-[var(--studio-text-muted)]">Distribución real de profundidad calculada desde el grafo</p>
                </div>
                <StudioBadge tone="neutral">{depthRows.length} nodos</StudioBadge>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-[var(--studio-border)]">
                      <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium">Bucket</th>
                      <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium"># Nodos</th>
                      <th className="py-2 text-[var(--studio-text-muted)] font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bucketRows.map((bucket) => (
                      <tr key={bucket.label} className="border-b border-[var(--studio-border)]/50">
                        <td className="py-2 pr-4 text-[var(--studio-text)]">{bucket.label}</td>
                        <td className="py-2 pr-4 text-[var(--studio-text)]">{bucket.count}</td>
                        <td className="py-2 text-[var(--studio-text)]">{formatPercent(bucket.percentage)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </StudioCard>

            <StudioCard className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-[var(--studio-text)]">Orphan pages</h2>
                  <p className="text-xs text-[var(--studio-text-muted)]">Items sin enlaces entrantes internos</p>
                </div>
                <StudioBadge tone="danger">{orphanRows.length}</StudioBadge>
              </div>

              {topOrphans.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[var(--studio-border)] p-4 text-sm text-[var(--studio-text-muted)]">
                  No hay orphan pages detectadas.
                </div>
              ) : (
                <div className="space-y-2">
                  {topOrphans.map((row) => (
                    <div key={row.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--studio-border)]/70 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--studio-text)] truncate">{row.name}</p>
                        <p className="text-xs text-[var(--studio-text-muted)] truncate">{row.path}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StudioBadge tone={depthTone(row.depth)}>{depthLabel(row.depth)}</StudioBadge>
                        {detailHref(websiteId, row) ? (
                          <Link href={detailHref(websiteId, row)!}>
                            <StudioButton variant="outline" size="sm">
                              Abrir
                            </StudioButton>
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </StudioCard>
          </section>

          <section className="studio-card p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-[var(--studio-text)]">Click depth table</h2>
                <p className="text-xs text-[var(--studio-text-muted)]">Listado completo generado desde el grafo real del sitio</p>
              </div>
              <StudioBadge tone="neutral">{depthRows.length} filas</StudioBadge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-[var(--studio-border)]">
                    <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium">Nodo</th>
                    <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium">Categoría</th>
                    <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium">Ruta</th>
                    <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium">Depth</th>
                    <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium">Entrantes</th>
                    <th className="py-2 text-[var(--studio-text-muted)] font-medium">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {depthRows.map((row) => (
                    <tr key={row.id} className="border-b border-[var(--studio-border)]/50">
                      <td className="py-2 pr-4">
                        <div className="min-w-0">
                          <p className="text-[var(--studio-text)] font-medium truncate">{row.name}</p>
                          <p className="text-xs text-[var(--studio-text-muted)] truncate">{typeLabel(row.type)}</p>
                        </div>
                      </td>
                      <td className="py-2 pr-4">
                        <StudioBadge tone={categoryTone(row.category)}>{row.category}</StudioBadge>
                      </td>
                      <td className="py-2 pr-4 text-[var(--studio-text)]">
                        <code className="rounded bg-[var(--studio-border)]/40 px-2 py-1 text-xs">{row.path}</code>
                      </td>
                      <td className="py-2 pr-4">
                        <StudioBadge tone={depthTone(row.depth)}>{depthLabel(row.depth)}</StudioBadge>
                      </td>
                      <td className="py-2 pr-4 text-[var(--studio-text)]">{row.inboundCount}</td>
                      <td className="py-2 text-[var(--studio-text)]">
                        {row.isOrphan ? (
                          <StudioBadge tone="danger">Orphan</StudioBadge>
                        ) : (
                          <StudioBadge tone="success">Linked</StudioBadge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {depthRows.length === 0 && (
                <div className="py-6 text-sm text-[var(--studio-text-muted)]">
                  No se pudieron construir nodos reales para la arquitectura.
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </StudioPage>
  );
}
