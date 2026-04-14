'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  StudioPage,
  StudioSectionHeader,
  StudioButton,
  StudioBadge,
} from '@/components/studio/ui/primitives';
import { calculateClickDepth } from '@/lib/seo/click-depth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TopicCluster {
  pillar: string;
  icon: string;
  subtopics: string[];
}

interface SiteNode {
  id: string;
  label: string;
  icon: string;
  pages: string;
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const TOPIC_CLUSTERS: TopicCluster[] = [
  {
    pillar: 'Tours Colombia',
    icon: '🏔️',
    subtopics: [
      'tours bogotá',
      'tours cartagena',
      'tours medellin',
      'tours coffee region',
      'tours amazonas',
    ],
  },
  {
    pillar: 'Paquetes Ecoturismo',
    icon: '🌿',
    subtopics: [
      'ecoturismo sierra nevada',
      'ecoturismo amazonas',
      'avistamiento aves',
      'turismo naturaleza',
    ],
  },
  {
    pillar: 'Hoteles Colombia',
    icon: '🏨',
    subtopics: [
      'hoteles cartagena amurallada',
      'hoteles boutique bogotá',
      'hoteles ecológicos',
      'glamping colombia',
    ],
  },
];

const SITE_NODES: SiteNode[] = [
  { id: 'hotels', label: 'Hoteles', icon: '🏨', pages: '0 páginas' },
  { id: 'activities', label: 'Actividades', icon: '🎯', pages: '0 páginas' },
  { id: 'packages', label: 'Paquetes', icon: '📦', pages: '0 páginas' },
  { id: 'destinations', label: 'Destinos', icon: '📍', pages: '0 páginas' },
];

const DEPTH_ROWS = [
  { label: '1 click', depth: 1 },
  { label: '2 clicks', depth: 2 },
  { label: '3 clicks', depth: 3 },
  { label: '4+ clicks', depth: 4 },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ClusterCard({ cluster }: { cluster: TopicCluster }) {
  return (
    <div className="studio-card p-5 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{cluster.icon}</span>
          <span className="text-sm font-semibold text-[var(--studio-text)]">
            {cluster.pillar}
          </span>
        </div>
        <StudioBadge tone="info">{cluster.subtopics.length} subtopics</StudioBadge>
      </div>

      {/* Subtopics */}
      <div className="flex flex-wrap gap-1.5">
        {cluster.subtopics.map((topic) => (
          <span
            key={topic}
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-xs',
              'bg-[var(--studio-surface)] text-[var(--studio-text-muted)]',
              'border border-[var(--studio-border)]'
            )}
          >
            {topic}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-[var(--studio-border)]">
        <StudioBadge tone="neutral">N/A enlaces internos</StudioBadge>
        <button
          disabled
          title="Próximamente"
          className={cn(
            'text-xs px-3 py-1 rounded border',
            'border-[var(--studio-border)] text-[var(--studio-text-muted)]',
            'opacity-50 cursor-not-allowed'
          )}
        >
          Ver análisis →
        </button>
      </div>
    </div>
  );
}

function ClickDepthTable() {
  // Use calculateClickDepth with empty/mock data to verify the function works
  const result = useMemo(
    () =>
      calculateClickDepth(
        [],
        [],
        [],
        new Map<string, string[]>(),
      ),
    [],
  );

  // Build depth counts from result (will be all empty with mock data)
  const depthCounts = useMemo(() => {
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    for (const [, d] of result.depths) {
      const bucket = d >= 4 ? 4 : d;
      counts[bucket] = (counts[bucket] ?? 0) + 1;
    }
    return counts;
  }, [result]);

  const total = useMemo(
    () => Object.values(depthCounts).reduce((sum, v) => sum + v, 0),
    [depthCounts],
  );

  return (
    <div className="studio-card p-5 space-y-4">
      <h3 className="text-sm font-semibold text-[var(--studio-text)]">
        Profundidad de Clicks
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[var(--studio-border)]">
              <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium">
                Profundidad
              </th>
              <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium">
                # Páginas
              </th>
              <th className="py-2 text-[var(--studio-text-muted)] font-medium">
                % del sitio
              </th>
            </tr>
          </thead>
          <tbody>
            {DEPTH_ROWS.map(({ label, depth }) => {
              const count = depthCounts[depth] ?? 0;
              const pct = total > 0 ? `${((count / total) * 100).toFixed(1)}%` : '—';
              return (
                <tr
                  key={depth}
                  className="border-b border-[var(--studio-border)]/50"
                >
                  <td className="py-2 pr-4 text-[var(--studio-text)]">{label}</td>
                  <td className="py-2 pr-4 text-[var(--studio-text)]">
                    {count === 0 ? 'N/A' : count}
                  </td>
                  <td className="py-2 text-[var(--studio-text)]">{pct}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--studio-text-muted)] bg-[var(--studio-surface)] border border-[var(--studio-border)] rounded px-3 py-2">
        💡 Google recomienda que las páginas importantes estén a máximo 3 clicks del home
      </p>
    </div>
  );
}

function InternalLinkTree() {
  return (
    <div className="studio-card p-5 space-y-4">
      <h3 className="text-sm font-semibold text-[var(--studio-text)]">
        Grafo de Enlaces Internos
      </h3>
      <p className="text-xs text-[var(--studio-text-muted)]">
        Estructura de navegación — conectividad desde el Home
      </p>

      {/* Tree visualization using Tailwind flex */}
      <div className="flex flex-col items-center gap-6 py-4">
        {/* Home node */}
        <div
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg',
            'bg-[var(--studio-accent,#3b82f6)] text-white',
            'text-sm font-semibold shadow-sm'
          )}
        >
          <span>🏠</span>
          <span>Home</span>
          <StudioBadge tone="neutral">0 páginas</StudioBadge>
        </div>

        {/* Connector line */}
        <div className="w-px h-4 bg-[var(--studio-border)]" />

        {/* Children row */}
        <div className="relative flex items-start gap-4 w-full max-w-2xl">
          {/* Horizontal connector */}
          <div
            className={cn(
              'absolute top-0 left-[12.5%] right-[12.5%] h-px',
              'bg-[var(--studio-border)]'
            )}
          />

          {SITE_NODES.map((node) => (
            <div key={node.id} className="flex-1 flex flex-col items-center gap-2">
              {/* Vertical line from horizontal bar */}
              <div className="w-px h-4 bg-[var(--studio-border)]" />

              {/* Node card */}
              <div
                className={cn(
                  'w-full flex flex-col items-center gap-1 px-2 py-3 rounded-lg text-center',
                  'border border-[var(--studio-border)]',
                  'bg-[var(--studio-card)] text-[var(--studio-text)]',
                  'text-xs shadow-sm'
                )}
              >
                <span className="text-lg">{node.icon}</span>
                <span className="font-medium">{node.label}</span>
                <StudioBadge tone="neutral">{node.pages}</StudioBadge>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-[var(--studio-text-muted)]">
        Conecta tus páginas de destinos, hoteles, paquetes y actividades para mejorar la distribución de autoridad.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SeoArchitecturePage() {
  const { websiteId } = useParams<{ websiteId: string }>();

  return (
    <StudioPage className="max-w-5xl">
      <StudioSectionHeader
        title="Arquitectura de Contenido"
        subtitle="Topic clusters, profundidad de clicks y enlaces internos"
        actions={
          <Link href={`/dashboard/${websiteId}/analytics?tab=keywords`}>
            <StudioButton variant="outline" size="sm">
              ← Volver a Keywords
            </StudioButton>
          </Link>
        }
      />

      {/* Section A: Topic Clusters */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[var(--studio-text)]">
            Topic Clusters
          </h2>
          <StudioBadge tone="info">{TOPIC_CLUSTERS.length} clusters</StudioBadge>
        </div>
        <p className="text-xs text-[var(--studio-text-muted)]">
          Agrupa keywords relacionadas alrededor de un tema principal (pillar) para construir autoridad temática.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {TOPIC_CLUSTERS.map((cluster) => (
            <ClusterCard key={cluster.pillar} cluster={cluster} />
          ))}
        </div>
      </section>

      {/* Section B: Click Depth Analysis */}
      <section className="space-y-3 mt-8">
        <h2 className="text-sm font-semibold text-[var(--studio-text)]">
          Análisis de Profundidad de Clicks
        </h2>
        <p className="text-xs text-[var(--studio-text-muted)]">
          Cuántos clicks necesita un usuario para llegar a cada página desde el Home.
        </p>
        <ClickDepthTable />
      </section>

      {/* Section C: Internal Link Graph */}
      <section className="space-y-3 mt-8">
        <h2 className="text-sm font-semibold text-[var(--studio-text)]">
          Grafo de Enlaces Internos
        </h2>
        <p className="text-xs text-[var(--studio-text-muted)]">
          Visualización de la estructura de enlazado interno del sitio.
        </p>
        <InternalLinkTree />
      </section>
    </StudioPage>
  );
}
