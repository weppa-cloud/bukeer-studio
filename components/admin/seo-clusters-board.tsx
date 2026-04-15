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

type ClusterStatus = ClusterRow['status'];

const STATUS_COLUMNS: ClusterStatus[] = ['planned', 'active', 'completed', 'paused'];
const CONTENT_TYPES = [
  { value: 'blog', label: 'Blog' },
  { value: 'destination', label: 'Destination' },
  { value: 'package', label: 'Package' },
  { value: 'activity', label: 'Activity' },
  { value: 'page', label: 'Page' },
];
const INTENT_OPTIONS = [
  { value: 'informational', label: 'Informational' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'navigational', label: 'Navigational' },
  { value: 'mixed', label: 'Mixed' },
];
const PAGE_TYPE_OPTIONS = CONTENT_TYPES;
const PAGE_ROLE_OPTIONS = [
  { value: 'hub', label: 'Hub' },
  { value: 'spoke', label: 'Spoke' },
  { value: 'support', label: 'Support' },
];

export function SeoClustersBoard({ websiteId }: SeoClustersBoardProps) {
  const [rows, setRows] = useState<ClusterRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actingClusterId, setActingClusterId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [sourceMeta, setSourceMeta] = useState<{ source?: string; fetchedAt?: string; confidence?: 'live' | 'partial' | 'exploratory' } | null>(null);

  const [locale, setLocale] = useState('es-CO');
  const [contentType, setContentType] = useState('destination');
  const [name, setName] = useState('');
  const [primaryTopic, setPrimaryTopic] = useState('');
  const [country, setCountry] = useState('Colombia');
  const [language, setLanguage] = useState('es');
  const [statusByCluster, setStatusByCluster] = useState<Record<string, ClusterStatus>>({});
  const [keywordByCluster, setKeywordByCluster] = useState<Record<string, string>>({});
  const [intentByCluster, setIntentByCluster] = useState<Record<string, string>>({});
  const [pageIdByCluster, setPageIdByCluster] = useState<Record<string, string>>({});
  const [pageTypeByCluster, setPageTypeByCluster] = useState<Record<string, string>>({});
  const [pageRoleByCluster, setPageRoleByCluster] = useState<Record<string, string>>({});
  const [pageKeywordByCluster, setPageKeywordByCluster] = useState<Record<string, string>>({});

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
      const nextStatus = (payload.rows ?? []).reduce<Record<string, ClusterStatus>>((acc, row) => {
        acc[row.id] = row.status;
        return acc;
      }, {});
      setStatusByCluster(nextStatus);
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
      setActionMessage('Cluster created successfully.');
      await loadClusters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create cluster');
    } finally {
      setCreating(false);
    }
  }

  async function updateClusterStatus(clusterId: string) {
    const status = statusByCluster[clusterId];
    if (!status) return;
    setActingClusterId(clusterId);
    setError(null);
    setActionMessage(null);
    try {
      const response = await fetch('/api/seo/content-intelligence/clusters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update',
          websiteId,
          clusterId,
          status,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        throw new Error(body?.error?.message || 'Failed to update cluster');
      }
      setActionMessage('Cluster status updated.');
      await loadClusters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update cluster');
    } finally {
      setActingClusterId(null);
    }
  }

  async function assignKeyword(clusterId: string) {
    const keyword = keywordByCluster[clusterId]?.trim();
    if (!keyword) return;
    setActingClusterId(clusterId);
    setError(null);
    setActionMessage(null);
    try {
      const response = await fetch('/api/seo/content-intelligence/clusters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_keyword',
          websiteId,
          clusterId,
          keyword,
          intent: intentByCluster[clusterId] || 'informational',
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        throw new Error(body?.error?.message || 'Failed to assign keyword');
      }
      const conflictCount = Array.isArray(body?.data?.conflicts) ? body.data.conflicts.length : 0;
      setKeywordByCluster((prev) => ({ ...prev, [clusterId]: '' }));
      setActionMessage(
        conflictCount > 0
          ? `Keyword assigned with ${conflictCount} locale conflict(s).`
          : 'Keyword assigned.',
      );
      await loadClusters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign keyword');
    } finally {
      setActingClusterId(null);
    }
  }

  async function assignPage(clusterId: string) {
    const pageId = pageIdByCluster[clusterId]?.trim();
    const pageType = pageTypeByCluster[clusterId] || 'page';
    const role = pageRoleByCluster[clusterId] || 'spoke';
    if (!pageId) return;
    setActingClusterId(clusterId);
    setError(null);
    setActionMessage(null);
    try {
      const response = await fetch('/api/seo/content-intelligence/clusters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_page',
          websiteId,
          clusterId,
          pageType,
          pageId,
          role,
          targetKeyword: pageKeywordByCluster[clusterId]?.trim() || undefined,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.success) {
        throw new Error(body?.error?.message || 'Failed to assign page');
      }
      setPageIdByCluster((prev) => ({ ...prev, [clusterId]: '' }));
      setPageKeywordByCluster((prev) => ({ ...prev, [clusterId]: '' }));
      setActionMessage('Page assigned.');
      await loadClusters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign page');
    } finally {
      setActingClusterId(null);
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
        {actionMessage ? <p className="text-xs text-[var(--studio-success)]">{actionMessage}</p> : null}
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
                  <div className="mt-2 space-y-2">
                    <div className="flex gap-2">
                      <StudioSelect
                        value={statusByCluster[cluster.id] ?? cluster.status}
                        onChange={(event) =>
                          setStatusByCluster((prev) => ({ ...prev, [cluster.id]: event.target.value as ClusterStatus }))
                        }
                        options={STATUS_COLUMNS.map((value) => ({ value, label: value }))}
                      />
                      <StudioButton
                        size="sm"
                        variant="outline"
                        onClick={() => void updateClusterStatus(cluster.id)}
                        disabled={actingClusterId === cluster.id}
                      >
                        Update
                      </StudioButton>
                    </div>
                    <div className="space-y-1">
                      <StudioInput
                        value={keywordByCluster[cluster.id] ?? ''}
                        onChange={(event) =>
                          setKeywordByCluster((prev) => ({ ...prev, [cluster.id]: event.target.value }))
                        }
                        placeholder="Keyword to assign"
                      />
                      <div className="flex gap-2">
                        <StudioSelect
                          value={intentByCluster[cluster.id] ?? 'informational'}
                          onChange={(event) =>
                            setIntentByCluster((prev) => ({ ...prev, [cluster.id]: event.target.value }))
                          }
                          options={INTENT_OPTIONS}
                        />
                        <StudioButton
                          size="sm"
                          variant="outline"
                          onClick={() => void assignKeyword(cluster.id)}
                          disabled={actingClusterId === cluster.id || !(keywordByCluster[cluster.id] ?? '').trim()}
                        >
                          Assign KW
                        </StudioButton>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="grid grid-cols-2 gap-2">
                        <StudioSelect
                          value={pageTypeByCluster[cluster.id] ?? 'page'}
                          onChange={(event) =>
                            setPageTypeByCluster((prev) => ({ ...prev, [cluster.id]: event.target.value }))
                          }
                          options={PAGE_TYPE_OPTIONS}
                        />
                        <StudioSelect
                          value={pageRoleByCluster[cluster.id] ?? 'spoke'}
                          onChange={(event) =>
                            setPageRoleByCluster((prev) => ({ ...prev, [cluster.id]: event.target.value }))
                          }
                          options={PAGE_ROLE_OPTIONS}
                        />
                      </div>
                      <StudioInput
                        value={pageIdByCluster[cluster.id] ?? ''}
                        onChange={(event) =>
                          setPageIdByCluster((prev) => ({ ...prev, [cluster.id]: event.target.value }))
                        }
                        placeholder="Page ID (uuid)"
                      />
                      <StudioInput
                        value={pageKeywordByCluster[cluster.id] ?? ''}
                        onChange={(event) =>
                          setPageKeywordByCluster((prev) => ({ ...prev, [cluster.id]: event.target.value }))
                        }
                        placeholder="Target keyword (optional)"
                      />
                      <StudioButton
                        size="sm"
                        variant="outline"
                        onClick={() => void assignPage(cluster.id)}
                        disabled={actingClusterId === cluster.id || !(pageIdByCluster[cluster.id] ?? '').trim()}
                      >
                        Assign Page
                      </StudioButton>
                    </div>
                  </div>
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
