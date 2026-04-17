'use client';

import { useState } from 'react';
import type { CompetitorRowDTO } from '@/lib/seo/dto';
import { StudioBadge, StudioButton } from '@/components/studio/ui/primitives';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeoCompetitiveAnalysisProps {
  competitors: CompetitorRowDTO[];
  websiteId: string;
}

type SortKey = 'avgPosition' | 'trafficShare';
type SortDir = 'asc' | 'desc';

interface KeywordGapRow {
  keyword: string;
  volume: string;
  posComp: number;
  intent: 'Commercial' | 'Informational';
  priority: 'P1' | 'P2' | 'P3';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXAMPLE_KEYWORD_GAP: KeywordGapRow[] = [
  { keyword: 'tours cartagena todo incluido', volume: '2,400', posComp: 3, intent: 'Commercial', priority: 'P1' },
  { keyword: 'hotel boutique cartagena', volume: '1,900', posComp: 5, intent: 'Commercial', priority: 'P1' },
  { keyword: 'plan cartagena 4 días', volume: '1,200', posComp: 8, intent: 'Commercial', priority: 'P2' },
  { keyword: 'cartagena islas del rosario', volume: '3,100', posComp: 2, intent: 'Informational', priority: 'P2' },
  { keyword: 'qué hacer en cartagena', volume: '8,900', posComp: 6, intent: 'Informational', priority: 'P3' },
];

const ANCHOR_DISTRIBUTION = [
  { label: 'Brand', pct: 35, color: 'bg-green-500' },
  { label: 'Generic', pct: 28, color: 'bg-blue-500' },
  { label: 'Partial-match', pct: 20, color: 'bg-yellow-500' },
  { label: 'Naked URL', pct: 12, color: 'bg-gray-400' },
  { label: 'Exact-match', pct: 5, color: 'bg-red-500' },
];

const LINK_VELOCITY_MONTHS = [
  { month: 'Ene 2026', gained: '—', lost: '—', net: '—' },
  { month: 'Feb 2026', gained: '—', lost: '—', net: '—' },
  { month: 'Mar 2026', gained: '—', lost: '—', net: '—' },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="relative group inline-flex items-center gap-1">
      {children}
      <span
        className="
          absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10
          hidden group-hover:block
          w-56 rounded px-2 py-1.5
          bg-[var(--studio-text)] text-[var(--studio-bg)] text-xs leading-snug
          pointer-events-none whitespace-normal text-center shadow-md
        "
      >
        {text}
      </span>
    </span>
  );
}

function InfoIcon() {
  return (
    <span
      className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border border-[var(--studio-text-muted)] text-[var(--studio-text-muted)] text-[10px] font-bold cursor-default select-none"
      aria-label="Información"
    >
      i
    </span>
  );
}

function IntentBadge({ intent }: { intent: KeywordGapRow['intent'] }) {
  // Commercial = MOFU, Informational = TOFU
  if (intent === 'Commercial') {
    return <StudioBadge tone="info">MOFU</StudioBadge>;
  }
  return <StudioBadge tone="neutral">TOFU</StudioBadge>;
}

function PriorityBadge({ priority }: { priority: KeywordGapRow['priority'] }) {
  const tone =
    priority === 'P1' ? 'danger' : priority === 'P2' ? 'warning' : 'neutral';
  return <StudioBadge tone={tone}>{priority}</StudioBadge>;
}

// ─── Section A: Competitor Table ──────────────────────────────────────────────

function CompetitorTable({ competitors }: { competitors: CompetitorRowDTO[] }) {
  const [sortKey, setSortKey] = useState<SortKey>('avgPosition');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = [...competitors].sort((a, b) => {
    const aVal = a[sortKey] ?? Infinity;
    const bVal = b[sortKey] ?? Infinity;
    if (aVal === bVal) return 0;
    const cmp = aVal < bVal ? -1 : 1;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function SortIndicator({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="opacity-30 ml-1">↕</span>;
    return <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <div className="studio-card p-4 overflow-x-auto">
      <h3 className="text-sm font-semibold text-[var(--studio-text)] mb-3">
        Competidores detectados
      </h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left border-b border-[var(--studio-border)]">
            <th className="py-2 pr-3 text-[var(--studio-text-muted)] font-medium">Domain</th>
            <th
              className="py-2 pr-3 text-[var(--studio-text-muted)] font-medium cursor-pointer select-none hover:text-[var(--studio-text)]"
              onClick={() => handleSort('avgPosition')}
            >
              Posición Promedio
              <SortIndicator col="avgPosition" />
            </th>
            <th
              className="py-2 pr-3 text-[var(--studio-text-muted)] font-medium cursor-pointer select-none hover:text-[var(--studio-text)]"
              onClick={() => handleSort('trafficShare')}
            >
              Traffic Share
              <SortIndicator col="trafficShare" />
            </th>
            <th className="py-2 pr-3 text-[var(--studio-text-muted)] font-medium">
              <Tooltip text="Requiere DataForSEO domain_rank_overview para datos reales">
                Keywords Est. <InfoIcon />
              </Tooltip>
            </th>
            <th className="py-2 pr-3 text-[var(--studio-text-muted)] font-medium">
              <Tooltip text="Requiere DataForSEO backlinks_summary para datos reales">
                DR Est. <InfoIcon />
              </Tooltip>
            </th>
            <th className="py-2 text-[var(--studio-text-muted)] font-medium">Snapshot</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((row) => (
            <tr key={row.id} className="border-b border-[var(--studio-border)]/50">
              <td className="py-2 pr-3 font-medium text-[var(--studio-text)]">{row.domain}</td>
              <td className="py-2 pr-3 text-[var(--studio-text)]">{row.avgPosition ?? '—'}</td>
              <td className="py-2 pr-3 text-[var(--studio-text)]">
                {row.trafficShare != null
                  ? `${(row.trafficShare * 100).toFixed(1)}%`
                  : '—'}
              </td>
              <td className="py-2 pr-3 text-[var(--studio-text-muted)]">—</td>
              <td className="py-2 pr-3 text-[var(--studio-text-muted)]">—</td>
              <td className="py-2 text-[var(--studio-text-muted)] text-xs">{row.snapshotDate}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Section B: Keyword Gap ───────────────────────────────────────────────────

function KeywordGap({
  competitors,
  websiteId,
}: {
  competitors: CompetitorRowDTO[];
  websiteId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<KeywordGapRow[] | null>(null);
  const [showExample, setShowExample] = useState(true);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const competitor = competitors[0]?.domain ?? '';
      const res = await fetch(
        `/api/seo/competitors/keyword-gap?websiteId=${encodeURIComponent(websiteId)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ competitor }),
        }
      );
      if (!res.ok) {
        // Endpoint may not exist yet — show example data
        setShowExample(true);
        return;
      }
      const body = (await res.json()) as { rows?: KeywordGapRow[] };
      if (body.rows && body.rows.length > 0) {
        setRows(body.rows);
        setShowExample(false);
      } else {
        setShowExample(true);
      }
    } catch {
      setShowExample(true);
    } finally {
      setLoading(false);
    }
  }

  const displayRows = rows ?? (showExample ? EXAMPLE_KEYWORD_GAP : []);

  return (
    <div className="studio-card p-4">
      <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-[var(--studio-text)]">
          Keyword Gap
        </h3>
        <StudioButton size="sm" onClick={handleAnalyze} disabled={loading}>
          {loading ? 'Analizando...' : 'Analizar gap'}
        </StudioButton>
      </div>
      <p className="text-xs text-[var(--studio-text-muted)] mb-4">
        Keywords donde tu competidor rankea y tú no
      </p>

      {error && (
        <p className="text-xs text-[var(--studio-danger)] mb-3">{error}</p>
      )}

      {showExample && (
        <div className="mb-3 px-3 py-2 rounded bg-[var(--studio-warning)]/10 border border-[var(--studio-warning)]/30 text-xs text-[var(--studio-warning)]">
          Datos de ejemplo. Activa DataForSEO para análisis real.
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[var(--studio-border)]">
              <th className="py-2 pr-3 text-[var(--studio-text-muted)] font-medium">Keyword</th>
              <th className="py-2 pr-3 text-[var(--studio-text-muted)] font-medium">Vol.</th>
              <th className="py-2 pr-3 text-[var(--studio-text-muted)] font-medium">Pos. Comp</th>
              <th className="py-2 pr-3 text-[var(--studio-text-muted)] font-medium">Intención</th>
              <th className="py-2 text-[var(--studio-text-muted)] font-medium">Prioridad</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row) => (
              <tr key={row.keyword} className="border-b border-[var(--studio-border)]/50">
                <td className="py-2 pr-3 text-[var(--studio-text)]">{row.keyword}</td>
                <td className="py-2 pr-3 text-[var(--studio-text-muted)]">{row.volume}</td>
                <td className="py-2 pr-3 text-[var(--studio-text)]">{row.posComp}</td>
                <td className="py-2 pr-3">
                  <IntentBadge intent={row.intent} />
                </td>
                <td className="py-2">
                  <PriorityBadge priority={row.priority} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Section C: Backlinks Summary KPI cards ───────────────────────────────────

function BacklinksSummary() {
  const kpis = [
    { label: 'Dominios referentes', value: '—' },
    { label: 'Total Backlinks', value: '—' },
    { label: 'DR Estimado', value: '—' },
    { label: 'Nuevos/Perdidos 30D', value: '—' },
  ];

  return (
    <div className="studio-card p-4">
      <h3 className="text-sm font-semibold text-[var(--studio-text)] mb-4">
        Backlinks Summary
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="studio-panel p-3 text-center">
            <p className="text-xl font-semibold text-[var(--studio-text-muted)]">{kpi.value}</p>
            <p className="text-xs text-[var(--studio-text-muted)] mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-xs text-[var(--studio-text-muted)]">
          Requiere DataForSEO backlinks API
        </p>
        <a
          href={`?tab=backlinks`}
          className="text-xs text-[var(--studio-accent)] hover:underline"
        >
          Ver análisis completo →
        </a>
      </div>
    </div>
  );
}

// ─── Section D: Anchor Distribution Chart ────────────────────────────────────

function AnchorDistribution() {
  const exactMatch = ANCHOR_DISTRIBUTION.find((a) => a.label === 'Exact-match');
  const showAlert = (exactMatch?.pct ?? 0) > 15;

  return (
    <div className="studio-card p-4">
      <h3 className="text-sm font-semibold text-[var(--studio-text)] mb-4">
        Anchor Distribution
      </h3>

      {showAlert && (
        <div className="mb-3 px-3 py-2 rounded bg-[var(--studio-danger)]/10 border border-[var(--studio-danger)]/30 text-xs text-[var(--studio-danger)]">
          Exact-match anchors elevados — riesgo de penalización
        </div>
      )}

      <div className="space-y-2.5">
        {ANCHOR_DISTRIBUTION.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <span className="w-24 text-xs text-[var(--studio-text-muted)] shrink-0 text-right">
              {item.label}
            </span>
            <div className="flex-1 h-4 bg-[var(--studio-border)]/40 rounded overflow-hidden">
              <div
                className={cn('h-full rounded transition-all', item.color)}
                style={{ width: `${item.pct}%` }}
              />
            </div>
            <span className="w-8 text-xs text-[var(--studio-text-muted)] shrink-0">
              {item.pct}%
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-[var(--studio-text-muted)] mt-3">
        Datos de ejemplo — conecta DataForSEO backlinks API para análisis real.
      </p>
    </div>
  );
}

// ─── Section E: Link Velocity ─────────────────────────────────────────────────

function LinkVelocity() {
  return (
    <div className="studio-card p-4">
      <h3 className="text-sm font-semibold text-[var(--studio-text)] mb-1">
        Link Velocity
      </h3>
      <p className="text-xs text-[var(--studio-text-muted)] mb-4">
        Velocidad de adquisición de links vs competidores
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[var(--studio-border)]">
              <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium">Mes</th>
              <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium">Links ganados</th>
              <th className="py-2 pr-4 text-[var(--studio-text-muted)] font-medium">Links perdidos</th>
              <th className="py-2 text-[var(--studio-text-muted)] font-medium">Neto</th>
            </tr>
          </thead>
          <tbody>
            {LINK_VELOCITY_MONTHS.map((row) => (
              <tr key={row.month} className="border-b border-[var(--studio-border)]/50">
                <td className="py-2 pr-4 text-[var(--studio-text)]">{row.month}</td>
                <td className="py-2 pr-4 text-[var(--studio-text-muted)]">{row.gained}</td>
                <td className="py-2 pr-4 text-[var(--studio-text-muted)]">{row.lost}</td>
                <td className="py-2 text-[var(--studio-text-muted)]">{row.net}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-[var(--studio-text-muted)] mt-3">
        Activa DataForSEO backlinks_timeseries para datos reales.
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SeoCompetitiveAnalysis({ competitors, websiteId }: SeoCompetitiveAnalysisProps) {
  if (competitors.length === 0) {
    return (
      <div className="studio-card p-6 text-center">
        <p className="text-sm text-[var(--studio-text-muted)]">
          Ejecuta una sincronización para detectar competidores.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 mt-4">
      {/* A: Expanded competitor table */}
      <CompetitorTable competitors={competitors} />

      {/* B: Keyword gap */}
      <KeywordGap competitors={competitors} websiteId={websiteId} />

      {/* C + D: Two-column layout for backlinks summary and anchor distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BacklinksSummary />
        <AnchorDistribution />
      </div>

      {/* E: Link velocity */}
      <LinkVelocity />
    </div>
  );
}
