'use client';

import { useMemo, useState } from 'react';
import { StudioBadge, StudioButton, StudioInput, StudioSelect } from '@/components/studio/ui/primitives';
import { SeoTrustState } from '@/components/admin/seo-trust-state';

interface SeoKeywordResearchProps {
  websiteId: string;
}

type Candidate = {
  id: string;
  keyword: string;
  intent: 'informational' | 'navigational' | 'commercial' | 'transactional' | 'mixed';
  recommendationAction: 'create' | 'update' | 'merge' | 'prune';
  difficulty: number | null;
  searchVolume: number | null;
  serpTopCompetitors: Array<{
    url: string;
    rank: number;
    wordCount: number;
  }>;
  seasonalityStatus: 'available' | 'unavailable';
  priorityScore: number;
  source: string;
  fetchedAt: string;
  confidence: 'live' | 'partial' | 'exploratory';
};

const CONTENT_TYPE_OPTIONS = [
  { value: 'blog', label: 'Blog' },
  { value: 'destination', label: 'Destination' },
  { value: 'package', label: 'Package' },
  { value: 'activity', label: 'Activity' },
  { value: 'page', label: 'Page' },
];

function intentTone(intent: Candidate['intent']): 'info' | 'warning' | 'success' | 'neutral' {
  if (intent === 'transactional') return 'success';
  if (intent === 'commercial') return 'warning';
  if (intent === 'informational') return 'info';
  return 'neutral';
}

export function SeoKeywordResearch({ websiteId }: SeoKeywordResearchProps) {
  const [contentType, setContentType] = useState('destination');
  const [country, setCountry] = useState('Colombia');
  const [language, setLanguage] = useState('es');
  const [locale, setLocale] = useState('es-CO');
  const [seedsInput, setSeedsInput] = useState('');
  const [decisionGradeOnly, setDecisionGradeOnly] = useState(true);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<{ code: string; message: string; details?: unknown } | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [sourceMeta, setSourceMeta] = useState<{ source?: string; fetchedAt?: string; confidence?: 'live' | 'partial' | 'exploratory' } | null>(null);

  const ordered = useMemo(() => [...candidates].sort((a, b) => b.priorityScore - a.priorityScore), [candidates]);

  async function handleResearch() {
    const seeds = seedsInput
      .split(/[\n,]+/)
      .map((seed) => seed.trim())
      .filter(Boolean);

    if (!seeds.length) {
      setError('Debes ingresar al menos una semilla.');
      return;
    }

    setLoading(true);
    setError(null);
    setBlocked(null);
    try {
      const response = await fetch('/api/seo/content-intelligence/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          contentType,
          country,
          language,
          locale,
          seeds,
          decisionGradeOnly,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        if (body?.error?.code) {
          setBlocked({
            code: body.error.code,
            message: body.error.message || 'Decision-grade research blocked',
            details: body.error.details,
          });
          setCandidates([]);
          setSourceMeta(null);
          return;
        }
        throw new Error(body?.error?.message || 'No se pudo completar el research');
      }
      const payload = body.data as {
        candidates: Candidate[];
        sourceMeta?: { source: string; fetchedAt: string; confidence: 'live' | 'partial' | 'exploratory' };
      };
      setCandidates(payload.candidates ?? []);
      setSourceMeta(payload.sourceMeta ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el research');
    } finally {
      setLoading(false);
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
        <h3 className="text-sm font-semibold text-[var(--studio-text)]">Keyword Research (locale-native)</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-[var(--studio-text-muted)] mb-1">Content type</label>
            <StudioSelect value={contentType} onChange={(event) => setContentType(event.target.value)} options={CONTENT_TYPE_OPTIONS} />
          </div>
          <div>
            <label className="block text-xs text-[var(--studio-text-muted)] mb-1">Country</label>
            <StudioInput value={country} onChange={(event) => setCountry(event.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-[var(--studio-text-muted)] mb-1">Language</label>
            <StudioInput value={language} onChange={(event) => setLanguage(event.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-[var(--studio-text-muted)] mb-1">Locale</label>
            <StudioInput value={locale} onChange={(event) => setLocale(event.target.value)} />
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
        <div>
          <label className="block text-xs text-[var(--studio-text-muted)] mb-1">Multi-seed keywords</label>
          <textarea
            value={seedsInput}
            onChange={(event) => setSeedsInput(event.target.value)}
            rows={4}
            placeholder="cartagena tours, caribbean travel guide, best time cartagena"
            className="w-full rounded border border-[var(--studio-border)] bg-[var(--studio-surface)] text-[var(--studio-text)] px-3 py-2 text-sm"
          />
        </div>
        <div className="flex gap-2">
          <StudioButton onClick={handleResearch} disabled={loading}>
            {loading ? 'Running research...' : 'Run Research'}
          </StudioButton>
        </div>
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
              <StudioButton size="sm" variant="outline" onClick={handleResearch} disabled={loading}>
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
        {error ? <p className="text-xs text-[var(--studio-danger)]">{error}</p> : null}
      </div>

      <div className="studio-card p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-[var(--studio-border)]">
              <th className="py-2">Keyword</th>
              <th className="py-2">Intent</th>
              <th className="py-2">Action</th>
              <th className="py-2">Difficulty</th>
              <th className="py-2">Volume</th>
              <th className="py-2">SERP top5</th>
              <th className="py-2">Seasonality</th>
              <th className="py-2">Priority</th>
              <th className="py-2">Source</th>
            </tr>
          </thead>
          <tbody>
            {ordered.map((row) => (
              <tr key={row.id} className="border-b border-[var(--studio-border)]/50">
                <td className="py-2">{row.keyword}</td>
                <td className="py-2">
                  <StudioBadge tone={intentTone(row.intent)}>{row.intent}</StudioBadge>
                </td>
                <td className="py-2">{row.recommendationAction}</td>
                <td className="py-2">{row.difficulty ?? 'N/A'}</td>
                <td className="py-2">{row.searchVolume ?? 'N/A'}</td>
                <td className="py-2">{row.serpTopCompetitors.length}</td>
                <td className="py-2">{row.seasonalityStatus}</td>
                <td className="py-2">{row.priorityScore.toFixed(2)}</td>
                <td className="py-2 text-xs text-[var(--studio-text-muted)]">
                  {row.source}
                  <br />
                  {new Date(row.fetchedAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {ordered.length === 0 ? (
          <p className="text-sm text-[var(--studio-text-muted)] py-3">No candidates yet. Run research with seeds.</p>
        ) : null}
      </div>
    </div>
  );
}
