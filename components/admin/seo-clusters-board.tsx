'use client';

import { useMemo, useState } from 'react';
import { StudioButton, StudioInput, StudioSelect } from '@/components/studio/ui/primitives';
import { SeoTrustState } from '@/components/admin/seo-trust-state';

type ClusterRow = {
  id: string;
  locale: string;
  contentType: string;
  name: string;
  primaryTopic: string;
  targetCountry: string;
  targetLanguage: string;
  status: 'planned' | 'active' | 'completed' | 'paused';
  keywordCount: number;
  pageCount: number;
  source: string;
  fetchedAt: string;
  confidence: 'live' | 'partial' | 'exploratory';
};

interface SeoClustersBoardProps {
  websiteId: string;
}

const STATUS_COLUMNS: Array<ClusterRow['status']> = ['planned', 'active', 'completed', 'paused'];
const CONTENT_TYPES = [
  { value: 'blog', label: 'Blog' },
  { value: 'destination', label: 'Destination' },
  { value: 'package', label: 'Package' },
  { value: 'activity', label: 'Activity' },
  { value: 'page', label: 'Page' },
];

export function SeoClustersBoard({ websiteId }: SeoClustersBoardProps) {
  const [rows, setRows] = useState<ClusterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sourceMeta, setSourceMeta] = useState<{ source?: string; fetchedAt?: string; confidence?: 'live' | 'partial' | 'exploratory' } | null>(null);

  const [locale, setLocale] = useState('es-CO');
  const [contentType, setContentType] = useState('destination');
  const [name, setName] = useState('');
  const [primaryTopic, setPrimaryTopic] = useState('');
  const [country, setCountry] = useState('Colombia');
  const [language, setLanguage] = useState('es');

  const grouped = useMemo(() => {
    return STATUS_COLUMNS.reduce<Record<string, ClusterRow[]>>((acc, status) => {
      acc[status] = rows.filter((row) => row.status === status);
      return acc;
    }, {});
  }, [rows]);

  async function loadClusters() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ websiteId });
      const response = await fetch(`/api/seo/content-intelligence/clusters?${params.toString()}`, { cache: 'no-store' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        throw new Error(body?.error?.message || 'Failed to load clusters');
      }
      const payload = body.data as {
        rows: ClusterRow[];
        sourceMeta?: { source: string; fetchedAt: string; confidence: 'live' | 'partial' | 'exploratory' };
      };
      setRows(payload.rows ?? []);
      setSourceMeta(payload.sourceMeta ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load clusters');
    } finally {
      setLoading(false);
    }
  }

  async function createCluster() {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch('/api/seo/content-intelligence/clusters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          websiteId,
          locale,
          contentType,
          name,
          primaryTopic,
          targetCountry: country,
          targetLanguage: language,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        throw new Error(body?.error?.message || 'Failed to create cluster');
      }
      setName('');
      setPrimaryTopic('');
      await loadClusters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create cluster');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="studio-card p-4 space-y-3">
        <h3 className="text-sm font-semibold text-[var(--studio-text)]">Clusters planner</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <StudioInput value={locale} onChange={(event) => setLocale(event.target.value)} placeholder="Locale (es-CO)" />
          <StudioSelect value={contentType} onChange={(event) => setContentType(event.target.value)} options={CONTENT_TYPES} />
          <StudioInput value={country} onChange={(event) => setCountry(event.target.value)} placeholder="Country" />
          <StudioInput value={language} onChange={(event) => setLanguage(event.target.value)} placeholder="Language" />
          <StudioInput value={name} onChange={(event) => setName(event.target.value)} placeholder="Cluster name" />
          <StudioInput value={primaryTopic} onChange={(event) => setPrimaryTopic(event.target.value)} placeholder="Primary topic" />
        </div>
        <div className="flex gap-2">
          <StudioButton disabled={creating || !name || !primaryTopic} onClick={createCluster}>
            {creating ? 'Creating...' : 'Create cluster'}
          </StudioButton>
          <StudioButton variant="outline" disabled={loading} onClick={() => void loadClusters()}>
            {loading ? 'Loading...' : 'Refresh'}
          </StudioButton>
        </div>
        {sourceMeta ? (
          <SeoTrustState source={sourceMeta.source} fetchedAt={sourceMeta.fetchedAt} confidence={sourceMeta.confidence} />
        ) : null}
        {error ? <p className="text-xs text-[var(--studio-danger)]">{error}</p> : null}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        {STATUS_COLUMNS.map((status) => (
          <div key={status} className="studio-card p-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--studio-text-muted)] mb-2">{status}</h4>
            <div className="space-y-2">
              {grouped[status]?.map((cluster) => (
                <div key={cluster.id} className="rounded border border-[var(--studio-border)] p-2">
                  <p className="text-sm font-medium text-[var(--studio-text)]">{cluster.name}</p>
                  <p className="text-xs text-[var(--studio-text-muted)]">
                    {cluster.contentType} · {cluster.locale}
                  </p>
                  <p className="text-xs text-[var(--studio-text-muted)]">KWs {cluster.keywordCount} · Pages {cluster.pageCount}</p>
                </div>
              ))}
              {(grouped[status]?.length ?? 0) === 0 ? (
                <p className="text-xs text-[var(--studio-text-muted)]">No clusters</p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
