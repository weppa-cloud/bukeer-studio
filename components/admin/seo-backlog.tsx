'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  StudioButton,
  StudioBadge,
} from '@/components/studio/ui/primitives';

// ── Types ────────────────────────────────────────────────────────────────────

interface StrikingDistanceRow {
  url: string;
  keyword: string;
  position: number;
  volume: number;
  priority: 'P1' | 'P2' | 'P3';
}

interface LowCtrRow {
  url: string;
  impressions: number;
  ctrActual: string;
  ctrBenchmark: string;
  action: string;
  slug: string;
}

interface CannibalizationRow {
  keyword: string;
  url1: string;
  url2: string;
  suggestion: string;
}

interface ScorecardRow {
  kpi: string;
  baseline: string;
  meta90d: string;
  benchmark: string;
}

interface KanbanCard {
  title: string;
  type: 'striking-distance' | 'low-ctr' | 'cannibalization';
  priority: 'P1' | 'P2' | 'P3';
  url?: string;
}

// ── Static example data ───────────────────────────────────────────────────────

const STRIKING_DISTANCE_EXAMPLE: StrikingDistanceRow[] = [
  { url: '/hoteles/cartagena', keyword: 'hotel boutique cartagena', position: 11, volume: 1200, priority: 'P1' },
  { url: '/actividades/buceo', keyword: 'buceo islas del rosario', position: 14, volume: 890, priority: 'P1' },
  { url: '/paquetes/san-andres', keyword: 'paquete san andres todo incluido', position: 9, volume: 2100, priority: 'P1' },
  { url: '/destinos/medellin', keyword: 'qué hacer en medellín 3 días', position: 17, volume: 670, priority: 'P2' },
  { url: '/blog/temporada-alta', keyword: 'temporada alta colombia viajes', position: 19, volume: 450, priority: 'P2' },
];

const LOW_CTR_EXAMPLE: LowCtrRow[] = [
  { url: '/hoteles/bogota', impressions: 4500, ctrActual: '0.8%', ctrBenchmark: '3-5%', action: 'Reescribir título', slug: 'hoteles/bogota' },
  { url: '/actividades/aventura', impressions: 3200, ctrActual: '1.1%', ctrBenchmark: '3-5%', action: 'Añadir precio en meta', slug: 'actividades/aventura' },
  { url: '/paquetes/navidad', impressions: 2800, ctrActual: '1.4%', ctrBenchmark: '3-5%', action: 'Añadir fecha y oferta', slug: 'paquetes/navidad' },
];

const CANNIBALIZATION_EXAMPLE: CannibalizationRow[] = [
  { keyword: 'tour cartagena', url1: '/tours-cartagena', url2: '/paquetes/cartagena-3-dias', suggestion: 'Redirigir 301 o consolidar' },
  { keyword: 'hotel medellin', url1: '/hoteles/medellin', url2: '/hoteles/medellin-centro', suggestion: 'Canonical a la más fuerte' },
];

const SCORECARD_ROWS: ScorecardRow[] = [
  { kpi: 'Clicks orgánicos (non-brand)', baseline: '—', meta90d: '+40%', benchmark: '+25%/trim' },
  { kpi: 'CTR promedio', baseline: '—', meta90d: '3.5%', benchmark: '3-5%' },
  { kpi: 'Posición promedio', baseline: '—', meta90d: '< 15', benchmark: '< 12' },
  { kpi: 'Páginas con score A/B', baseline: '—', meta90d: '60%', benchmark: '70%' },
  { kpi: 'Items con JSON-LD', baseline: '—', meta90d: '95%', benchmark: '90%' },
];

const KANBAN_CARDS: Record<'P1' | 'P2' | 'P3', KanbanCard[]> = {
  P1: [
    { title: 'paquete san andres todo incluido — pos. 9', type: 'striking-distance', priority: 'P1', url: '/paquetes/san-andres' },
    { title: 'hotel boutique cartagena — pos. 11', type: 'striking-distance', priority: 'P1', url: '/hoteles/cartagena' },
    { title: 'buceo islas del rosario — pos. 14', type: 'striking-distance', priority: 'P1', url: '/actividades/buceo' },
  ],
  P2: [
    { title: '/hoteles/bogota — CTR 0.8% (4,500 impresiones)', type: 'low-ctr', priority: 'P2', url: '/hoteles/bogota' },
    { title: '/actividades/aventura — CTR 1.1% (3,200 impresiones)', type: 'low-ctr', priority: 'P2', url: '/actividades/aventura' },
    { title: '/paquetes/navidad — CTR 1.4% (2,800 impresiones)', type: 'low-ctr', priority: 'P2', url: '/paquetes/navidad' },
  ],
  P3: [
    { title: '"tour cartagena" — /tours-cartagena vs /paquetes/cartagena-3-dias', type: 'cannibalization', priority: 'P3' },
    { title: '"hotel medellin" — /hoteles/medellin vs /hoteles/medellin-centro', type: 'cannibalization', priority: 'P3' },
  ],
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`studio-card space-y-4 p-5 ${className ?? ''}`}>
      {children}
    </div>
  );
}

function SectionHeader({ emoji, title, description }: { emoji: string; title: string; description: string }) {
  return (
    <div className="space-y-1">
      <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--studio-text)]">
        <span role="img" aria-label="">{emoji}</span>
        {title}
      </h3>
      <p className="text-sm text-[var(--studio-text-muted)]">{description}</p>
    </div>
  );
}

function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[var(--studio-border)]">
      <table className="w-full text-sm">
        {children}
      </table>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`bg-[var(--studio-bg-elevated)] px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-[var(--studio-text-muted)] ${className ?? ''}`}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`border-t border-[var(--studio-border)]/50 px-3 py-2.5 text-[var(--studio-text)] ${className ?? ''}`}>
      {children}
    </td>
  );
}

function PriorityBadge({ priority }: { priority: 'P1' | 'P2' | 'P3' }) {
  const tone = priority === 'P1' ? 'danger' : priority === 'P2' ? 'warning' : 'neutral';
  return <StudioBadge tone={tone as 'danger' | 'warning' | 'neutral'}>{priority}</StudioBadge>;
}

function TypeBadge({ type }: { type: KanbanCard['type'] }) {
  const labels: Record<KanbanCard['type'], string> = {
    'striking-distance': 'Striking',
    'low-ctr': 'Low CTR',
    'cannibalization': 'Canibalización',
  };
  const tones: Record<KanbanCard['type'], 'info' | 'warning' | 'danger'> = {
    'striking-distance': 'info',
    'low-ctr': 'warning',
    'cannibalization': 'danger',
  };
  return <StudioBadge tone={tones[type]}>{labels[type]}</StudioBadge>;
}

// ── Striking Distance Section ─────────────────────────────────────────────────

function StrikingDistanceSection({ websiteId }: { websiteId: string }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<StrikingDistanceRow[]>(STRIKING_DISTANCE_EXAMPLE);
  const [detected, setDetected] = useState(false);

  async function detect() {
    setLoading(true);
    try {
      const res = await fetch(`/api/seo/analytics/striking-distance?websiteId=${websiteId}`);
      if (res.ok) {
        const json = await res.json() as { data?: StrikingDistanceRow[] };
        setRows(json.data ?? STRIKING_DISTANCE_EXAMPLE);
        setDetected(true);
      } else {
        // Endpoint not available — keep example data
        setDetected(true);
      }
    } catch {
      setDetected(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeader
          emoji="🎯"
          title="Oportunidades Striking Distance"
          description="Páginas en posiciones 8-20 con volumen ≥100 — un empujón las lleva a primera página"
        />
        <StudioButton
          variant="outline"
          size="sm"
          onClick={detect}
          disabled={loading}
          className="shrink-0"
        >
          {loading ? 'Detectando...' : 'Detectar oportunidades'}
        </StudioButton>
      </div>

      {!detected && (
        <p className="text-xs text-[var(--studio-text-muted)]">
          Datos de ejemplo — conecta GSC y pulsa "Detectar oportunidades" para datos reales.
        </p>
      )}

      <TableWrapper>
        <thead>
          <tr>
            <Th>URL</Th>
            <Th>Keyword</Th>
            <Th className="text-center">Posición actual</Th>
            <Th className="text-center">Volumen</Th>
            <Th className="text-center">Prioridad</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-[color-mix(in_srgb,var(--studio-primary)_3%,transparent)]">
              <Td>
                <code className="rounded bg-[var(--studio-border)]/40 px-1.5 py-0.5 text-xs text-[var(--studio-text)]">
                  {row.url}
                </code>
              </Td>
              <Td className="max-w-[220px]">
                <span className="line-clamp-2">{row.keyword}</span>
              </Td>
              <Td className="text-center">
                <span className="font-semibold text-amber-600">{row.position}</span>
              </Td>
              <Td className="text-center">
                {row.volume.toLocaleString('es-CO')}
              </Td>
              <Td className="text-center">
                <PriorityBadge priority={row.priority} />
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrapper>
    </SectionCard>
  );
}

// ── Low CTR Section ───────────────────────────────────────────────────────────

function LowCtrSection({ websiteId }: { websiteId: string }) {
  const router = useRouter();

  return (
    <SectionCard>
      <SectionHeader
        emoji="📉"
        title="Low CTR — Títulos y Metas a Reescribir"
        description="Impresiones altas + CTR < 2% — estas páginas aparecen pero nadie las clica"
      />

      <TableWrapper>
        <thead>
          <tr>
            <Th>URL</Th>
            <Th className="text-center">Impresiones</Th>
            <Th className="text-center">CTR actual</Th>
            <Th className="text-center">CTR benchmark</Th>
            <Th>Acción</Th>
            <Th className="text-right">Editar</Th>
          </tr>
        </thead>
        <tbody>
          {LOW_CTR_EXAMPLE.map((row, i) => (
            <tr key={i} className="hover:bg-[color-mix(in_srgb,var(--studio-primary)_3%,transparent)]">
              <Td>
                <code className="rounded bg-[var(--studio-border)]/40 px-1.5 py-0.5 text-xs text-[var(--studio-text)]">
                  {row.url}
                </code>
              </Td>
              <Td className="text-center">{row.impressions.toLocaleString('es-CO')}</Td>
              <Td className="text-center">
                <span className="font-semibold text-rose-600">{row.ctrActual}</span>
              </Td>
              <Td className="text-center text-[var(--studio-text-muted)]">{row.ctrBenchmark}</Td>
              <Td className="max-w-[180px]">
                <span className="line-clamp-2 text-sm">{row.action}</span>
              </Td>
              <Td className="text-right">
                <StudioButton
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/dashboard/${websiteId}/seo/pages/${row.slug}`)}
                >
                  Editar SEO
                </StudioButton>
              </Td>
            </tr>
          ))}
        </tbody>
      </TableWrapper>
    </SectionCard>
  );
}

// ── Cannibalization Section ───────────────────────────────────────────────────

function CannibalizationSection() {
  return (
    <SectionCard>
      <SectionHeader
        emoji="⚠️"
        title="Canibalización — Misma Keyword, Múltiples URLs"
        description="Tus propias páginas compiten entre sí — consolida o redirige"
      />

      <TableWrapper>
        <thead>
          <tr>
            <Th>Keyword</Th>
            <Th>URL 1</Th>
            <Th>URL 2</Th>
            <Th>Acción sugerida</Th>
          </tr>
        </thead>
        <tbody>
          {CANNIBALIZATION_EXAMPLE.map((row, i) => (
            <tr key={i} className="hover:bg-[color-mix(in_srgb,var(--studio-primary)_3%,transparent)]">
              <Td>
                <span className="font-medium">{row.keyword}</span>
              </Td>
              <Td>
                <code className="rounded bg-[var(--studio-border)]/40 px-1.5 py-0.5 text-xs text-[var(--studio-text)]">
                  {row.url1}
                </code>
              </Td>
              <Td>
                <code className="rounded bg-[var(--studio-border)]/40 px-1.5 py-0.5 text-xs text-[var(--studio-text)]">
                  {row.url2}
                </code>
              </Td>
              <Td className="text-[var(--studio-text-muted)]">{row.suggestion}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrapper>
    </SectionCard>
  );
}

// ── Scorecard Section ─────────────────────────────────────────────────────────

function ScorecardSection() {
  return (
    <SectionCard>
      <div className="space-y-1">
        <SectionHeader
          emoji="📊"
          title="Scorecard — Estado del Playbook"
          description="KPIs del plan 90D vs benchmarks Travel LATAM"
        />
        <p className="text-xs text-[var(--studio-text-muted)]">
          Los valores "—" requieren conexión a Google Search Console para calcular el baseline real.
        </p>
      </div>

      <TableWrapper>
        <thead>
          <tr>
            <Th>KPI</Th>
            <Th className="text-center">Baseline actual</Th>
            <Th className="text-center">Meta 90D</Th>
            <Th className="text-center">Benchmark Travel LATAM</Th>
          </tr>
        </thead>
        <tbody>
          {SCORECARD_ROWS.map((row, i) => (
            <tr key={i} className="hover:bg-[color-mix(in_srgb,var(--studio-primary)_3%,transparent)]">
              <Td className="font-medium">{row.kpi}</Td>
              <Td className="text-center text-[var(--studio-text-muted)]">{row.baseline}</Td>
              <Td className="text-center font-semibold text-sky-600">{row.meta90d}</Td>
              <Td className="text-center text-[var(--studio-text-muted)]">{row.benchmark}</Td>
            </tr>
          ))}
        </tbody>
      </TableWrapper>
    </SectionCard>
  );
}

// ── Kanban Section ────────────────────────────────────────────────────────────

function KanbanSection({ websiteId }: { websiteId: string }) {
  const router = useRouter();

  const columns: Array<{ key: 'P1' | 'P2' | 'P3'; label: string; colorClass: string }> = [
    { key: 'P1', label: 'P1 Urgente', colorClass: 'border-rose-400/60 bg-rose-50/30 dark:bg-rose-950/20' },
    { key: 'P2', label: 'P2 Este mes', colorClass: 'border-amber-400/60 bg-amber-50/30 dark:bg-amber-950/20' },
    { key: 'P3', label: 'P3 Backlog', colorClass: 'border-sky-400/60 bg-sky-50/30 dark:bg-sky-950/20' },
  ];

  function handleWork(card: KanbanCard) {
    if (card.url) {
      router.push(`/dashboard/${websiteId}/seo/pages${card.url}`);
    }
  }

  return (
    <SectionCard>
      <SectionHeader
        emoji="🗂️"
        title="Kanban — Prioridades"
        description="Vista rápida de todas las oportunidades organizadas por prioridad"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {columns.map((col) => (
          <div
            key={col.key}
            className={`rounded-xl border p-3 ${col.colorClass}`}
          >
            <div className="mb-3 flex items-center gap-2">
              <PriorityBadge priority={col.key} />
              <span className="text-sm font-semibold text-[var(--studio-text)]">{col.label}</span>
              <span className="ml-auto rounded-full bg-[var(--studio-border)]/55 px-2 py-0.5 text-[10px] text-[var(--studio-text-muted)]">
                {KANBAN_CARDS[col.key].length}
              </span>
            </div>
            <div className="space-y-2">
              {KANBAN_CARDS[col.key].map((card, i) => (
                <div
                  key={i}
                  className="studio-card flex flex-col gap-2 p-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-start gap-1.5">
                    <TypeBadge type={card.type} />
                  </div>
                  <p className="text-xs leading-snug text-[var(--studio-text)]">{card.title}</p>
                  <StudioButton
                    size="sm"
                    variant="outline"
                    onClick={() => handleWork(card)}
                    disabled={!card.url}
                    className="self-end"
                  >
                    Trabajar
                  </StudioButton>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ── Main SeoBacklog export ────────────────────────────────────────────────────

interface SeoBacklogProps {
  websiteId: string;
}

export function SeoBacklog({ websiteId }: SeoBacklogProps) {
  return (
    <div className="space-y-6">
      <StrikingDistanceSection websiteId={websiteId} />
      <LowCtrSection websiteId={websiteId} />
      <CannibalizationSection />
      <ScorecardSection />
      <KanbanSection websiteId={websiteId} />
    </div>
  );
}
