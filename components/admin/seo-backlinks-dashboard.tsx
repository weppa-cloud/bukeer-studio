'use client';

import { useState } from 'react';
import { StudioButton } from '@/components/studio/ui/primitives';
import { cn } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeoBacklinksDashboardProps {
  websiteId: string;
}

interface BacklinksSummary {
  referringDomains: number | null;
  totalBacklinks: number | null;
  drEstimated: number | null;
  newLast30d: number | null;
  lostLast30d: number | null;
  source?: string;
  fetchedAt?: string;
  note?: string;
}

interface ReferringDomainRow {
  domain: string;
  dr: number;
  links: number;
  context: string;
  action: string;
}

interface IntersectionRow {
  domain: string;
  dr: number;
  linksTo: string;
  action: string;
}

interface VelocityRow {
  month: string;
  gained: string;
  lost: string;
  net: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ANCHOR_DISTRIBUTION = [
  { label: 'Brand', pct: 35, color: 'bg-green-500' },
  { label: 'Generic', pct: 28, color: 'bg-blue-500' },
  { label: 'Partial-match', pct: 20, color: 'bg-yellow-500' },
  { label: 'Naked URL', pct: 12, color: 'bg-gray-400' },
  { label: 'Exact-match', pct: 5, color: 'bg-red-500' },
];

const EXAMPLE_REFERRING_DOMAINS: ReferringDomainRow[] = [
  { domain: 'tripadvisor.com', dr: 93, links: 12, context: 'Listados', action: 'Monitorear' },
  { domain: 'despegar.com', dr: 88, links: 8, context: 'Comparador', action: 'Monitorear' },
  { domain: 'colombia.travel', dr: 76, links: 5, context: 'Turismo oficial', action: 'Nutrir' },
];

const EXAMPLE_INTERSECTION: IntersectionRow[] = [
  { domain: 'colombia.co', dr: 71, linksTo: 'viajemos.com, despegar.com', action: 'Email outreach' },
  { domain: 'turismo.gov.co', dr: 68, linksTo: 'aviatur.com', action: 'Solicitud institucional' },
  { domain: 'lonelyplanet.com', dr: 91, linksTo: 'airbnb.com', action: 'Guest post' },
];

const VELOCITY_MONTHS: VelocityRow[] = [
  { month: 'Nov 2025', gained: '—', lost: '—', net: '—' },
  { month: 'Dic 2025', gained: '—', lost: '—', net: '—' },
  { month: 'Ene 2026', gained: '—', lost: '—', net: '—' },
  { month: 'Feb 2026', gained: '—', lost: '—', net: '—' },
  { month: 'Mar 2026', gained: '—', lost: '—', net: '—' },
  { month: 'Abr 2026', gained: '—', lost: '—', net: '—' },
];

type BacklinksSummaryResponse = BacklinksSummary;
type IntersectionResponse = {
  rows?: IntersectionRow[];
  source?: string;
  fetchedAt?: string;
};

// ─── Tooltip ──────────────────────────────────────────────────────────────────

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <span className="relative group inline-flex items-center gap-1">
      {children}
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-10 hidden group-hover:block w-56 rounded px-2 py-1.5 text-xs text-white bg-gray-800 shadow-lg">
        {text}
      </span>
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: string;
  tooltip: string;
}) {
  return (
    <div className="studio-card p-4">
      <Tooltip text={tooltip}>
        <p className="text-xs text-[var(--studio-text-muted)] cursor-help underline decoration-dotted">
          {label}
        </p>
      </Tooltip>
      <p className="text-2xl font-semibold text-[var(--studio-text)] mt-1">{value}</p>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function SeoBacklinksDashboard({ websiteId }: SeoBacklinksDashboardProps) {
  const [summary, setSummary] = useState<BacklinksSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summaryMeta, setSummaryMeta] = useState<{ source?: string; fetchedAt?: string } | null>(null);

  const [intersectionRows, setIntersectionRows] = useState<IntersectionRow[]>(EXAMPLE_INTERSECTION);
  const [intersectionLoading, setIntersectionLoading] = useState(false);
  const [intersectionFetched, setIntersectionFetched] = useState(false);
  const [intersectionMeta, setIntersectionMeta] = useState<{ source?: string; fetchedAt?: string } | null>(null);

  async function handleAnalyzeBacklinks() {
    setSummaryLoading(true);
    setSummaryError(null);
    try {
      const response = await fetch(`/api/seo/backlinks/summary?websiteId=${websiteId}`, {
        method: 'POST',
      });
      if (!response.ok) {
        setSummaryError('DataForSEO backlinks API no configurada');
        return;
      }
      const data = (await response.json()) as BacklinksSummaryResponse;
      setSummary(data);
      setSummaryMeta({ source: data.source, fetchedAt: data.fetchedAt });
    } catch {
      setSummaryError('DataForSEO backlinks API no configurada');
    } finally {
      setSummaryLoading(false);
    }
  }

  async function handleFindIntersection() {
    setIntersectionLoading(true);
    try {
      const response = await fetch('/api/seo/backlinks/intersection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId }),
      });
      if (!response.ok) {
        setIntersectionRows(EXAMPLE_INTERSECTION);
      } else {
        const data = (await response.json()) as IntersectionResponse;
        setIntersectionRows(data.rows ?? []);
        setIntersectionMeta({ source: data.source, fetchedAt: data.fetchedAt });
      }
    } catch {
      setIntersectionRows(EXAMPLE_INTERSECTION);
    } finally {
      setIntersectionLoading(false);
      setIntersectionFetched(true);
    }
  }

  const exactMatchPct = ANCHOR_DISTRIBUTION.find((a) => a.label === 'Exact-match')?.pct ?? 0;

  return (
    <div className="space-y-6">
      {/* ── A) KPI Cards ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--studio-text)]">Resumen de Backlinks</h3>
          <StudioButton size="sm" onClick={handleAnalyzeBacklinks} disabled={summaryLoading}>
            {summaryLoading ? 'Analizando...' : 'Analizar Backlinks'}
          </StudioButton>
        </div>

        {summaryError && (
          <div className="rounded-lg p-3 mb-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs">
            {summaryError}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="Referring Domains"
            value={summary?.referringDomains != null ? String(summary.referringDomains) : '—'}
            tooltip="Dominios únicos que enlazan a tu sitio. Requiere DataForSEO backlinks_summary."
          />
          <KpiCard
            label="Total Backlinks"
            value={summary?.totalBacklinks != null ? String(summary.totalBacklinks) : '—'}
            tooltip="Total de enlaces entrantes. Requiere DataForSEO backlinks_summary."
          />
          <KpiCard
            label="DR Estimado"
            value={summary?.drEstimated != null ? String(summary.drEstimated) : '—'}
            tooltip="Domain Rating estimado (0-100). Requiere DataForSEO backlinks_summary."
          />
          <KpiCard
            label="Nuevos/Perdidos 30D"
            value={
              summary?.newLast30d != null && summary?.lostLast30d != null
                ? `+${summary.newLast30d} / -${summary.lostLast30d}`
                : '—'
            }
            tooltip="Links ganados y perdidos en los últimos 30 días. Requiere DataForSEO backlinks_summary."
          />
        </div>

        {summaryMeta && (
          <p className="mt-2 text-xs text-[var(--studio-text-muted)]">
            Fuente: {summaryMeta.source ?? 'desconocida'}
            {summaryMeta.fetchedAt ? ` · ${new Date(summaryMeta.fetchedAt).toLocaleString()}` : ''}
          </p>
        )}
        {summary?.note && (
          <p className="mt-1 text-xs text-[var(--studio-text-muted)]">{summary.note}</p>
        )}
      </div>

      {/* ── B) Anchor Distribution ── */}
      <div className="studio-card p-4">
        <h3 className="text-sm font-semibold text-[var(--studio-text)] mb-1">
          Distribución de Anchors
        </h3>

        {exactMatchPct > 15 && (
          <div className="rounded-lg p-3 mb-3 bg-red-50 border border-red-200 text-red-800 text-xs">
            ⚠️ Exact-match anchors elevados — riesgo de penalización
          </div>
        )}

        <div className="space-y-2 mt-3">
          {ANCHOR_DISTRIBUTION.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="w-24 text-xs text-[var(--studio-text-muted)] shrink-0">
                {item.label}
              </span>
              <div className="flex-1 h-3 rounded-full bg-[var(--studio-surface)] overflow-hidden">
                <div
                  className={cn('h-full rounded-full', item.color)}
                  style={{ width: `${item.pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs font-medium text-[var(--studio-text)]">
                {item.pct}%
              </span>
            </div>
          ))}
        </div>

        <p className="text-xs text-[var(--studio-text-muted)] mt-3">
          Datos de ejemplo. Conecta DataForSEO para análisis real.
        </p>
      </div>

      {/* ── C) Top Referring Domains ── */}
      <div className="studio-card p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-[var(--studio-text)] mb-3">
          Top Referring Domains
        </h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[var(--studio-border)]">
              <th className="py-2 font-medium text-[var(--studio-text-muted)]">Dominio</th>
              <th className="py-2 font-medium text-[var(--studio-text-muted)]">DR</th>
              <th className="py-2 font-medium text-[var(--studio-text-muted)]">Links</th>
              <th className="py-2 font-medium text-[var(--studio-text-muted)]">Contexto</th>
              <th className="py-2 font-medium text-[var(--studio-text-muted)]">Acción</th>
            </tr>
          </thead>
          <tbody>
            {EXAMPLE_REFERRING_DOMAINS.map((row) => (
              <tr key={row.domain} className="border-b border-[var(--studio-border)]/50">
                <td className="py-2 text-[var(--studio-text)]">{row.domain}</td>
                <td className="py-2 text-[var(--studio-text)]">{row.dr}</td>
                <td className="py-2 text-[var(--studio-text)]">{row.links}</td>
                <td className="py-2 text-[var(--studio-text-muted)]">{row.context}</td>
                <td className="py-2">
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-blue-50 text-blue-700 border border-blue-200">
                    {row.action}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-[var(--studio-text-muted)] mt-2">
          Datos de ejemplo. Conecta DataForSEO para datos reales.
        </p>
      </div>

      {/* ── D) Domain Intersection ── */}
      <div className="studio-card p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--studio-text)]">
              Backlinks Domain Intersection
            </h3>
            <p className="text-xs text-[var(--studio-text-muted)] mt-0.5">
              Dominios que enlazan a tus competidores pero NO a ti
            </p>
          </div>
          <StudioButton size="sm" onClick={handleFindIntersection} disabled={intersectionLoading}>
            {intersectionLoading ? 'Buscando...' : 'Encontrar oportunidades'}
          </StudioButton>
        </div>

        {intersectionFetched && intersectionRows.length === 0 && (
          <div className="rounded-lg p-3 mb-3 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs">
            No hay intersecciones persistidas todavía. El endpoint respondió correctamente con un payload vacío.
          </div>
        )}

        {intersectionRows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--studio-border)] p-4 text-sm text-[var(--studio-text-muted)]">
            Sin oportunidades de intersección por ahora.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-[var(--studio-border)]">
                <th className="py-2 font-medium text-[var(--studio-text-muted)]">Dominio</th>
                <th className="py-2 font-medium text-[var(--studio-text-muted)]">DR</th>
                <th className="py-2 font-medium text-[var(--studio-text-muted)]">Enlaza a comp.</th>
                <th className="py-2 font-medium text-[var(--studio-text-muted)]">Acción</th>
              </tr>
            </thead>
            <tbody>
              {intersectionRows.map((row) => (
                <tr key={row.domain} className="border-b border-[var(--studio-border)]/50">
                  <td className="py-2 text-[var(--studio-text)]">{row.domain}</td>
                  <td className="py-2 text-[var(--studio-text)]">{row.dr}</td>
                  <td className="py-2 text-[var(--studio-text-muted)] max-w-[200px] truncate">
                    {row.linksTo}
                  </td>
                  <td className="py-2">
                    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs bg-green-50 text-green-700 border border-green-200">
                      {row.action}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {intersectionMeta && (
          <p className="mt-2 text-xs text-[var(--studio-text-muted)]">
            Fuente: {intersectionMeta.source ?? 'desconocida'}
            {intersectionMeta.fetchedAt ? ` · ${new Date(intersectionMeta.fetchedAt).toLocaleString()}` : ''}
          </p>
        )}
      </div>

      {/* ── E) Link Velocity ── */}
      <div className="studio-card p-4 overflow-x-auto">
        <h3 className="text-sm font-semibold text-[var(--studio-text)] mb-1">
          Velocidad de Adquisición vs Competidores
        </h3>
        <p className="text-xs text-[var(--studio-text-muted)] mb-3">
          Últimos 6 meses
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[var(--studio-border)]">
              <th className="py-2 font-medium text-[var(--studio-text-muted)]">Mes</th>
              <th className="py-2 font-medium text-[var(--studio-text-muted)]">Links ganados</th>
              <th className="py-2 font-medium text-[var(--studio-text-muted)]">Links perdidos</th>
              <th className="py-2 font-medium text-[var(--studio-text-muted)]">Neto</th>
            </tr>
          </thead>
          <tbody>
            {VELOCITY_MONTHS.map((row) => (
              <tr key={row.month} className="border-b border-[var(--studio-border)]/50">
                <td className="py-2 text-[var(--studio-text)]">{row.month}</td>
                <td className="py-2 text-[var(--studio-text-muted)]">{row.gained}</td>
                <td className="py-2 text-[var(--studio-text-muted)]">{row.lost}</td>
                <td className="py-2 text-[var(--studio-text-muted)]">{row.net}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-[var(--studio-text-muted)] mt-2">
          Activa DataForSEO backlinks_timeseries para datos reales.
        </p>
      </div>
    </div>
  );
}
