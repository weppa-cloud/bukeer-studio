'use client';

import { useMemo, useState } from 'react';
import { StudioBadge, StudioButton, StudioSelect } from '@/components/studio/ui/primitives';
import { SeoTrustState } from '@/components/admin/seo-trust-state';

type AuditRow = {
  id: string;
  pageType: string;
  publicUrl: string;
  findingType: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  decaySignal: string;
  priorityScore: number;
  source: string;
  fetchedAt: string;
  confidence: 'live' | 'partial' | 'exploratory';
};

interface SeoContentIntelligencePanelProps {
  websiteId: string;
}

const CONTENT_TYPE_OPTIONS = [
  { value: 'all', label: 'All types' },
  { value: 'blog', label: 'Blog' },
  { value: 'destination', label: 'Destination' },
  { value: 'package', label: 'Package' },
  { value: 'activity', label: 'Activity' },
  { value: 'page', label: 'Page' },
];

function severityTone(severity: AuditRow['severity']): 'danger' | 'warning' | 'info' {
  if (severity === 'critical') return 'danger';
  if (severity === 'warning') return 'warning';
  return 'info';
}

export function SeoContentIntelligencePanel({ websiteId }: SeoContentIntelligencePanelProps) {
  const [locale, setLocale] = useState('es-CO');
  const [contentType, setContentType] = useState('all');
  const [decisionGradeOnly, setDecisionGradeOnly] = useState(true);
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [running, setRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<{ code: string; message: string; details?: unknown } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [sourceMeta, setSourceMeta] = useState<{ source?: string; fetchedAt?: string; confidence?: 'live' | 'partial' | 'exploratory' } | null>(null);

  const sortedRows = useMemo(() => [...rows].sort((a, b) => b.priorityScore - a.priorityScore), [rows]);

  async function loadFindings() {
    setLoading(true);
    setError(null);
    setBlocked(null);
    try {
      const params = new URLSearchParams({
        websiteId,
        locale,
        decisionGradeOnly: decisionGradeOnly ? 'true' : 'false',
        limit: '100',
      });
      if (contentType !== 'all') params.set('contentType', contentType);
      const response = await fetch(`/api/seo/content-intelligence/audit?${params.toString()}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        if (body?.error?.code) {
          setBlocked({
            code: body.error.code,
            message: body.error.message || 'Decision-grade audit blocked',
            details: body.error.details,
          });
          setRows([]);
          setSourceMeta(null);
          return;
        }
        throw new Error(body?.error?.message || 'Failed to load content intelligence findings');
      }
      const payload = body.data as {
        rows: AuditRow[];
        sourceMeta?: { source: string; fetchedAt: string; confidence: 'live' | 'partial' | 'exploratory' };
      };
      setRows(payload.rows ?? []);
      setSourceMeta(payload.sourceMeta ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load findings');
    } finally {
      setLoading(false);
    }
  }

  async function handleRunAudit() {
    setRunning(true);
    setError(null);
    setBlocked(null);
    try {
      const response = await fetch('/api/seo/content-intelligence/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          locale,
          contentTypes: contentType === 'all' ? [] : [contentType],
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        throw new Error(body?.error?.message || 'Audit run failed');
      }
      const payload = body.data as {
        sourceMeta?: { source: string; fetchedAt: string; confidence: 'live' | 'partial' | 'exploratory' };
      };
      setSourceMeta(payload.sourceMeta ?? null);
      await loadFindings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Audit run failed');
    } finally {
      setRunning(false);
    }
  }

  async function handleSyncNow() {
    setSyncing(true);
    setError(null);
    try {
      const response = await fetch('/api/seo/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          includeDataForSeo: true,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body?.error?.message || body?.error || 'Unable to queue sync');
      }
      setBlocked({
        code: 'SYNC_QUEUED',
        message: body?.requestId ? `Sync requested (${body.requestId})` : 'Sync requested',
        details: body ?? null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to queue sync');
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="studio-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--studio-text)]">Content Intelligence</h3>
        <p className="text-xs text-[var(--studio-text-muted)]">
          Rendered audit por locale con findings priorizados (severity + freshness + priority score).
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-[var(--studio-text-muted)] mb-1">Locale</label>
            <input
              className="studio-input"
              value={locale}
              onChange={(event) => setLocale(event.target.value)}
              placeholder="es-CO"
            />
          </div>
          <div>
            <label className="block text-xs text-[var(--studio-text-muted)] mb-1">Content type</label>
            <StudioSelect value={contentType} onChange={(event) => setContentType(event.target.value)} options={CONTENT_TYPE_OPTIONS} />
          </div>
          <div className="flex items-end gap-2">
            <StudioButton onClick={handleRunAudit} disabled={running}>
              {running ? 'Running audit...' : 'Run Audit'}
            </StudioButton>
            <StudioButton variant="outline" onClick={() => void loadFindings()} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </StudioButton>
          </div>
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-[var(--studio-text-muted)]">
          <input
            type="checkbox"
            checked={decisionGradeOnly}
            onChange={(event) => setDecisionGradeOnly(event.target.checked)}
          />
          Decision-grade only (live + authoritative)
        </label>
        {sourceMeta ? (
          <SeoTrustState source={sourceMeta.source} fetchedAt={sourceMeta.fetchedAt} confidence={sourceMeta.confidence} />
        ) : null}
        {blocked ? (
          <div className="text-xs text-[var(--studio-warning)] border border-[var(--studio-warning)]/30 rounded p-2 space-y-2">
            <p>{blocked.code}: {blocked.message}</p>
            <div className="flex gap-2">
              <StudioButton size="sm" variant="outline" onClick={() => void handleSyncNow()} disabled={syncing}>
                {syncing ? 'Queueing sync...' : 'Sync now'}
              </StudioButton>
              <StudioButton size="sm" variant="outline" onClick={() => void loadFindings()} disabled={loading}>
                Retry
              </StudioButton>
            </div>
            {blocked.details ? (
              <pre className="text-[10px] bg-slate-950 text-slate-100 rounded p-2 overflow-x-auto">
                {JSON.stringify(blocked.details, null, 2)}
              </pre>
            ) : null}
          </div>
        ) : null}
        {error ? (
          <p className="text-xs text-[var(--studio-danger)]">{error}</p>
        ) : null}
      </div>

      <div className="studio-card p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[var(--studio-border)]">
              <th className="py-2">Severity</th>
              <th className="py-2">Type</th>
              <th className="py-2">Finding</th>
              <th className="py-2">Page</th>
              <th className="py-2">Decay</th>
              <th className="py-2">Priority</th>
              <th className="py-2">Freshness</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.id} className="border-b border-[var(--studio-border)]/50">
                <td className="py-2">
                  <StudioBadge tone={severityTone(row.severity)}>{row.severity}</StudioBadge>
                </td>
                <td className="py-2">{row.pageType}</td>
                <td className="py-2">
                  <p className="text-[var(--studio-text)]">{row.title}</p>
                  <p className="text-xs text-[var(--studio-text-muted)]">{row.findingType}</p>
                </td>
                <td className="py-2">
                  <a className="text-[var(--studio-primary)] underline" href={row.publicUrl} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </td>
                <td className="py-2">{row.decaySignal}</td>
                <td className="py-2">{row.priorityScore.toFixed(2)}</td>
                <td className="py-2">{new Date(row.fetchedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {sortedRows.length === 0 ? (
          <p className="text-sm text-[var(--studio-text-muted)] py-3">No decision-grade findings yet.</p>
        ) : null}
      </div>
    </div>
  );
}
