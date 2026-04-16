'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useWebsite } from '@/lib/admin/website-context';
import { useAutosave } from '@/lib/hooks/use-autosave';
import type {
  AnalyticsOverviewDTO,
  CompetitorRowDTO,
  HealthAuditDTO,
  IntegrationStatusDTO,
  KeywordRowDTO,
} from '@/lib/seo/dto';
import {
  StudioPage,
  StudioSectionHeader,
  StudioTabs,
  StudioButton,
  StudioInput,
  StudioBadge,
  StudioSelect,
} from '@/components/studio/ui/primitives';
import { SeoBaseline28D } from '@/components/admin/seo-baseline-28d';
import { SeoTechnicalAudit } from '@/components/admin/seo-technical-audit';
import { SeoKeywordResearch } from '@/components/admin/seo-keyword-research';
import { SeoBacklinksDashboard } from '@/components/admin/seo-backlinks-dashboard';
import { SeoAiVisibility } from '@/components/admin/seo-ai-visibility';
import { SeoOkrCycle } from '@/components/admin/seo-okr-cycle';
import { SeoRevenueAttribution } from '@/components/admin/seo-revenue-attribution';
import { SeoSchemaManager } from '@/components/admin/seo-schema-manager';
import { SeoSetupBanner } from '@/components/admin/seo-setup-banner';
import { SeoLocaleSettings } from '@/components/admin/seo-locale-settings';
import { SeoContentIntelligencePanel } from '@/components/admin/seo-content-intelligence-panel';
import { SeoClustersBoard } from '@/components/admin/seo-clusters-board';

type AnalyticsTab =
  | 'overview'
  | 'content-intelligence'
  | 'keywords'
  | 'clusters'
  | 'competitors'
  | 'health'
  | 'ai-visibility'
  | 'backlinks'
  | 'config';

type GoogleIntegrationOption = {
  value: string;
  label: string;
  meta?: string;
};

const TAB_OPTIONS: ReadonlyArray<{ id: AnalyticsTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'content-intelligence', label: 'Content Intelligence' },
  { id: 'keywords', label: 'Keywords' },
  { id: 'clusters', label: 'Clusters' },
  { id: 'competitors', label: 'Competitors' },
  { id: 'health', label: 'Health' },
  { id: 'ai-visibility', label: 'AI Visibility' },
  { id: 'backlinks', label: 'Backlinks' },
  { id: 'config', label: 'Config' },
];

function parseAnalyticsTab(value: string | null): AnalyticsTab | null {
  if (!value) return null;
  return TAB_OPTIONS.some((tab) => tab.id === value) ? (value as AnalyticsTab) : null;
}

function pct(value: number | null | undefined) {
  if (value == null) return '-';
  return `${(value * 100).toFixed(1)}%`;
}

function shortDate(value: string | null | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function IntegrationPill({ connected, label }: { connected: boolean; label: string }) {
  return (
    <StudioBadge tone={connected ? 'success' : 'warning'}>
      {label}: {connected ? 'Connected' : 'Pending'}
    </StudioBadge>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const routeParams = useParams<{ websiteId: string }>();
  const websiteId = routeParams?.websiteId ?? '';
  const searchParams = useSearchParams();
  const { website, save } = useWebsite();

  const paramTab = parseAnalyticsTab(searchParams?.get('tab') ?? null);
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(
    paramTab ?? 'overview'
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const [integrationStatus, setIntegrationStatus] = useState<IntegrationStatusDTO | null>(null);
  const [overview, setOverview] = useState<AnalyticsOverviewDTO | null>(null);
  const [keywords, setKeywords] = useState<KeywordRowDTO[]>([]);
  const [competitors, setCompetitors] = useState<CompetitorRowDTO[]>([]);
  const [health, setHealth] = useState<HealthAuditDTO[]>([]);
  const [gscOptions, setGscOptions] = useState<GoogleIntegrationOption[]>([]);
  const [ga4Options, setGa4Options] = useState<GoogleIntegrationOption[]>([]);
  const [selectedGscSiteUrl, setSelectedGscSiteUrl] = useState('');
  const [selectedGa4PropertyId, setSelectedGa4PropertyId] = useState('');
  const [loadingOptions, setLoadingOptions] = useState<{ gsc: boolean; ga4: boolean }>({
    gsc: false,
    ga4: false,
  });
  const [savingIntegration, setSavingIntegration] = useState<{ gsc: boolean; ga4: boolean }>({
    gsc: false,
    ga4: false,
  });

  const analytics = (website?.analytics || {}) as Record<string, string | undefined>;
  const [gtmId, setGtmId] = useState(analytics.gtm_id || '');
  const [ga4Id, setGa4Id] = useState(analytics.ga4_id || '');
  const [pixelId, setPixelId] = useState(analytics.facebook_pixel_id || '');
  const [includeDataForSeo, setIncludeDataForSeo] = useState(false);
  const [syncing, setSyncing] = useState(false);

  function handleTabChange(nextTab: AnalyticsTab) {
    setActiveTab(nextTab);
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('tab', nextTab);
    const nextPath = pathname ?? `/dashboard/${websiteId}/analytics`;
    router.replace(`${nextPath}?${params.toString()}`, { scroll: false });
  }

  const autosavePayload = useMemo(() => ({ gtmId, ga4Id, pixelId }), [gtmId, ga4Id, pixelId]);
  const { status: autosaveStatus } = useAutosave({
    data: autosavePayload,
    onSave: async (payload) => {
      await save({
        analytics: {
          ...analytics,
          gtm_id: payload.gtmId || undefined,
          ga4_id: payload.ga4Id || undefined,
          facebook_pixel_id: payload.pixelId || undefined,
        },
      } as never);
    },
  });

  const gscNeedsSelection = Boolean(integrationStatus?.gsc.connected && !integrationStatus?.gsc.configurationComplete);
  const ga4NeedsSelection = Boolean(integrationStatus?.ga4.connected && !integrationStatus?.ga4.configurationComplete);
  const syncBlocked = gscNeedsSelection || ga4NeedsSelection;

  async function loadIntegrationStatus() {
    const response = await fetch(`/api/seo/integrations/status?websiteId=${websiteId}`, { cache: 'no-store' });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error || 'Failed to load integration status');
    }
    const data = (await response.json()) as IntegrationStatusDTO;
    setIntegrationStatus(data);
    setSelectedGscSiteUrl(data.gsc.siteUrl ?? '');
    setSelectedGa4PropertyId(data.ga4.propertyId ?? '');
  }

  async function loadTabData(tab: AnalyticsTab) {
    setError(null);
    setLoading(true);
    try {
      if (tab === 'overview') {
        const response = await fetch(`/api/seo/analytics/overview?websiteId=${websiteId}`, { cache: 'no-store' });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Failed to load overview');
        setOverview(body as AnalyticsOverviewDTO);
      }

      if (tab === 'keywords') {
        const response = await fetch(`/api/seo/analytics/keywords?websiteId=${websiteId}`, { cache: 'no-store' });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Failed to load keywords');
        setKeywords((body.rows || []) as KeywordRowDTO[]);
      }

      if (tab === 'competitors') {
        const response = await fetch(`/api/seo/analytics/competitors?websiteId=${websiteId}`, { cache: 'no-store' });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Failed to load competitors');
        setCompetitors((body.rows || []) as CompetitorRowDTO[]);
      }

      if (tab === 'health') {
        const response = await fetch(`/api/seo/analytics/health?websiteId=${websiteId}`, { cache: 'no-store' });
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Failed to load health');
        setHealth((body.rows || []) as HealthAuditDTO[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  async function handleConnect(provider: 'gsc' | 'ga4') {
    try {
      setError(null);
      const response = await fetch('/api/seo/integrations/google/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          provider,
          returnTo: `/dashboard/${websiteId}/analytics?tab=config`,
        }),
      });

      const body = await response.json();
      if (!response.ok) {
        throw new Error(body.error || 'Could not create OAuth URL');
      }

      if (!body.authUrl) {
        throw new Error('OAuth URL missing');
      }

      window.location.href = body.authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start connection');
    }
  }

  async function handleRefresh(provider: 'gsc' | 'ga4') {
    try {
      setError(null);
      const response = await fetch('/api/seo/integrations/google/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId, provider }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Refresh failed');
      await loadIntegrationStatus();
      setSyncMessage(`${provider.toUpperCase()} token refreshed`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    }
  }

  async function loadGoogleOptions(provider: 'gsc' | 'ga4') {
    try {
      setError(null);
      setLoadingOptions((prev) => ({ ...prev, [provider]: true }));
      const response = await fetch(
        `/api/seo/integrations/google/options?websiteId=${websiteId}&provider=${provider}`,
        { cache: 'no-store' }
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Failed to load Google options');

      const options = (body.options || []) as GoogleIntegrationOption[];
      if (provider === 'gsc') {
        setGscOptions(options);
        if (!selectedGscSiteUrl && options[0]?.value) setSelectedGscSiteUrl(options[0].value);
      } else {
        setGa4Options(options);
        if (!selectedGa4PropertyId && options[0]?.value) setSelectedGa4PropertyId(options[0].value);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load options');
    } finally {
      setLoadingOptions((prev) => ({ ...prev, [provider]: false }));
    }
  }

  async function handleConfigureGoogle(provider: 'gsc' | 'ga4') {
    try {
      setError(null);
      setSavingIntegration((prev) => ({ ...prev, [provider]: true }));
      const payload =
        provider === 'gsc'
          ? { websiteId, provider, siteUrl: selectedGscSiteUrl }
          : { websiteId, provider, propertyId: selectedGa4PropertyId };
      const response = await fetch('/api/seo/integrations/google/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Failed to save integration configuration');
      setSyncMessage(
        provider === 'gsc'
          ? 'Search Console configured with selected site'
          : 'GA4 configured with selected property'
      );
      await loadIntegrationStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to configure integration');
    } finally {
      setSavingIntegration((prev) => ({ ...prev, [provider]: false }));
    }
  }

  async function handleSync() {
    try {
      setSyncing(true);
      setError(null);
      setSyncMessage(null);
      if (syncBlocked) {
        throw new Error('Complete Google configuration in Config (site URL + GA4 property) before syncing.');
      }
      const response = await fetch('/api/seo/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ websiteId, includeDataForSeo }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Sync failed');
      setSyncMessage(
        `Sync OK · GSC ${body.gscRows ?? 0} rows · GA4 ${body.ga4Rows ?? 0} rows · request ${body.requestId}`
      );
      await Promise.all([loadIntegrationStatus(), loadTabData(activeTab)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadIntegrationStatus().catch((err) => {
      setError(err instanceof Error ? err.message : 'Failed to load status');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [websiteId]);

  useEffect(() => {
    const nextTab = parseAnalyticsTab(searchParams?.get('tab') ?? null);
    if (nextTab && nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    if (['overview', 'keywords', 'competitors', 'health'].includes(activeTab)) {
      loadTabData(activeTab).catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, websiteId]);

  useEffect(() => {
    if (activeTab !== 'config') return;
    if (gscNeedsSelection && gscOptions.length === 0 && !loadingOptions.gsc) {
      loadGoogleOptions('gsc').catch(() => undefined);
    }
    if (ga4NeedsSelection && ga4Options.length === 0 && !loadingOptions.ga4) {
      loadGoogleOptions('ga4').catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, gscNeedsSelection, ga4NeedsSelection]);

  useEffect(() => {
    const success = searchParams?.get('integration_success');
    const provider = searchParams?.get('provider');
    const integrationConfig = searchParams?.get('integration_config');
    const integrationError = searchParams?.get('integration_error');

    if (success && provider) {
      const providerLabel = provider.toUpperCase();
      if (integrationConfig === 'required') {
        setSyncMessage(`Connection completed: ${providerLabel}. Select site/property in Config to finish setup.`);
      } else {
        setSyncMessage(`Connection completed: ${providerLabel}`);
      }
      loadIntegrationStatus().catch(() => undefined);
    }

    if (integrationError) {
      setError(`OAuth error: ${integrationError}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  if (!websiteId) {
    return (
      <StudioPage className="max-w-6xl">
        <div className="studio-panel border border-[var(--studio-warning)]/40 text-[var(--studio-warning)] p-3 text-sm">
          Missing website context. Reload from dashboard.
        </div>
      </StudioPage>
    );
  }

  return (
    <StudioPage className="max-w-6xl">
      <StudioSectionHeader
        title="Analytics"
        subtitle="SEO + Analytics unificados (GSC, GA4 y sync server-side)."
        actions={(
          <div className="flex items-center gap-2">
            <IntegrationPill connected={Boolean(integrationStatus?.gsc.connected)} label="GSC" />
            <IntegrationPill connected={Boolean(integrationStatus?.ga4.connected)} label="GA4" />
            <StudioButton size="sm" onClick={handleSync} disabled={syncing || syncBlocked}>
              {syncing ? 'Syncing...' : 'Sync now'}
            </StudioButton>
          </div>
        )}
      />

      <SeoSetupBanner websiteId={websiteId} gscConnected={integrationStatus?.gsc.connected} />

      <StudioTabs value={activeTab} onChange={handleTabChange} options={TAB_OPTIONS} className="mb-6" />

      {error && (
        <div className="studio-panel mb-4 border border-[var(--studio-danger)]/40 text-[var(--studio-danger)] p-3 text-sm">
          {error}
        </div>
      )}

      {syncMessage && (
        <div className="studio-panel mb-4 border border-[var(--studio-success)]/40 text-[var(--studio-success)] p-3 text-sm">
          {syncMessage}
        </div>
      )}

      {syncBlocked && (
        <div className="studio-panel mb-4 border border-[var(--studio-warning)]/40 text-[var(--studio-warning)] p-3 text-sm">
          Google integration connected but pending configuration. Open Config and select the Search Console site plus GA4 property.
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="studio-card p-4">
              <p className="text-xs text-[var(--studio-text-muted)]">Sessions</p>
              <p className="text-2xl font-semibold text-[var(--studio-text)]">{overview?.sessions ?? 0}</p>
            </div>
            <div className="studio-card p-4">
              <p className="text-xs text-[var(--studio-text-muted)]">Users</p>
              <p className="text-2xl font-semibold text-[var(--studio-text)]">{overview?.users ?? 0}</p>
            </div>
            <div className="studio-card p-4">
              <p className="text-xs text-[var(--studio-text-muted)]">Pageviews</p>
              <p className="text-2xl font-semibold text-[var(--studio-text)]">{overview?.pageviews ?? 0}</p>
            </div>
            <div className="studio-card p-4">
              <p className="text-xs text-[var(--studio-text-muted)]">Conversions</p>
              <p className="text-2xl font-semibold text-[var(--studio-text)]">{overview?.conversions ?? 0}</p>
            </div>
          </div>

          <div className="studio-card p-4 overflow-x-auto">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-[var(--studio-text)]">Top pages</h3>
              <p className="text-xs text-[var(--studio-text-muted)]">{overview?.from} → {overview?.to}</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--studio-border)]">
                  <th className="py-2">Page</th>
                  <th className="py-2">Sessions</th>
                  <th className="py-2">Users</th>
                  <th className="py-2">Pageviews</th>
                  <th className="py-2">Conversions</th>
                </tr>
              </thead>
              <tbody>
                {(overview?.topPages || []).map((page) => (
                  <tr key={page.pagePath} className="border-b border-[var(--studio-border)]/50">
                    <td className="py-2">{page.pagePath}</td>
                    <td className="py-2">{page.sessions}</td>
                    <td className="py-2">{page.users}</td>
                    <td className="py-2">{page.pageviews}</td>
                    <td className="py-2">{page.conversions}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && (overview?.topPages?.length || 0) === 0 && (
              <p className="text-sm text-[var(--studio-text-muted)] py-3">No data yet. Run Sync in Config.</p>
            )}
          </div>

          <SeoBaseline28D overview={overview} websiteId={websiteId} />

          <SeoOkrCycle websiteId={websiteId} overview={overview} />

          <hr className="border-[var(--studio-border)]" />

          <SeoRevenueAttribution websiteId={websiteId} />
        </div>
      )}

      {activeTab === 'keywords' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[var(--studio-text-muted)]">
              Palabras clave rastreadas desde Google Search Console
            </p>
            <a href={`/dashboard/${websiteId}/seo/architecture`}>
              <StudioButton variant="outline" size="sm">
                Ver Arquitectura →
              </StudioButton>
            </a>
          </div>
          <div className="studio-card p-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[var(--studio-border)]">
                  <th className="py-2">Keyword</th>
                  <th className="py-2">Locale</th>
                  <th className="py-2">Latest position</th>
                  <th className="py-2">Search volume</th>
                  <th className="py-2">Snapshot</th>
                </tr>
              </thead>
              <tbody>
                {keywords.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--studio-border)]/50">
                    <td className="py-2">{row.keyword}</td>
                    <td className="py-2">{row.locale}</td>
                    <td className="py-2">{row.latestPosition ?? '-'}</td>
                    <td className="py-2">{row.latestSearchVolume ?? '-'}</td>
                    <td className="py-2">{row.latestSnapshotDate ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!loading && keywords.length === 0 && (
              <p className="text-sm text-[var(--studio-text-muted)] py-3">No keyword snapshots yet.</p>
            )}
          </div>
          <SeoKeywordResearch websiteId={websiteId} />
        </div>
      )}

      {activeTab === 'content-intelligence' && (
        <SeoContentIntelligencePanel websiteId={websiteId} />
      )}

      {activeTab === 'clusters' && (
        <SeoClustersBoard websiteId={websiteId} />
      )}

      {activeTab === 'competitors' && (
        <div className="studio-card p-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-[var(--studio-border)]">
                <th className="py-2">Domain</th>
                <th className="py-2">Snapshot date</th>
                <th className="py-2">Avg. position</th>
                <th className="py-2">Traffic share</th>
                <th className="py-2">Source</th>
              </tr>
            </thead>
            <tbody>
              {competitors.map((row) => (
                <tr key={row.id} className="border-b border-[var(--studio-border)]/50">
                  <td className="py-2">{row.domain}</td>
                  <td className="py-2">{row.snapshotDate}</td>
                  <td className="py-2">{row.avgPosition ?? '-'}</td>
                  <td className="py-2">{row.trafficShare ?? '-'}</td>
                  <td className="py-2">{row.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && competitors.length === 0 && (
            <p className="text-sm text-[var(--studio-text-muted)] py-3">No competitor snapshots yet.</p>
          )}
        </div>
      )}

      {activeTab === 'health' && (
        <div className="space-y-4">
          <SeoTechnicalAudit
            health={health}
            websiteId={websiteId}
            integrationStatus={integrationStatus}
            onHealthRefresh={() => loadTabData('health')}
          />
          <SeoSchemaManager websiteId={websiteId} />
        </div>
      )}

      {activeTab === 'ai-visibility' && (
        <SeoAiVisibility websiteId={websiteId} />
      )}

      {activeTab === 'backlinks' && (
        <SeoBacklinksDashboard websiteId={websiteId} />
      )}

      {activeTab === 'config' && (
        <div className="space-y-4">
          <div className="studio-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-[var(--studio-text)]">Google Integrations</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="studio-panel p-3">
                <p className="text-sm font-medium text-[var(--studio-text)]">Search Console</p>
                <p className="text-xs text-[var(--studio-text-muted)] mt-1">Status: {integrationStatus?.gsc.connected ? 'Connected' : 'Not connected'}</p>
                <p className="text-xs text-[var(--studio-text-muted)]">
                  Configuration: {integrationStatus?.gsc.configurationComplete ? 'Complete' : 'Pending'}
                </p>
                <p className="text-xs text-[var(--studio-text-muted)]">Site URL: {integrationStatus?.gsc.siteUrl || '-'}</p>
                <p className="text-xs text-[var(--studio-text-muted)]">Token expiry: {shortDate(integrationStatus?.gsc.tokenExpiry)}</p>
                <div className="flex gap-2 mt-3">
                  <StudioButton size="sm" onClick={() => handleConnect('gsc')}>
                    {integrationStatus?.gsc.connected ? 'Reconnect' : 'Connect'}
                  </StudioButton>
                  <StudioButton size="sm" variant="outline" onClick={() => handleRefresh('gsc')} disabled={!integrationStatus?.gsc.connected}>
                    Refresh token
                  </StudioButton>
                </div>
                {gscNeedsSelection && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-[var(--studio-text-muted)]">
                      Select the Search Console site to finish integration.
                    </p>
                    <StudioSelect
                      value={selectedGscSiteUrl}
                      onChange={(event) => setSelectedGscSiteUrl(event.target.value)}
                      options={[
                        { value: '', label: 'Select site URL' },
                        ...gscOptions.map((option) => ({ value: option.value, label: option.label })),
                      ]}
                    />
                    <div className="flex gap-2">
                      <StudioButton
                        size="sm"
                        variant="outline"
                        onClick={() => loadGoogleOptions('gsc')}
                        disabled={loadingOptions.gsc}
                      >
                        {loadingOptions.gsc ? 'Loading...' : 'Load sites'}
                      </StudioButton>
                      <StudioButton
                        size="sm"
                        onClick={() => handleConfigureGoogle('gsc')}
                        disabled={!selectedGscSiteUrl || savingIntegration.gsc}
                      >
                        {savingIntegration.gsc ? 'Saving...' : 'Save site'}
                      </StudioButton>
                    </div>
                  </div>
                )}
              </div>

              <div className="studio-panel p-3">
                <p className="text-sm font-medium text-[var(--studio-text)]">Google Analytics 4</p>
                <p className="text-xs text-[var(--studio-text-muted)] mt-1">Status: {integrationStatus?.ga4.connected ? 'Connected' : 'Not connected'}</p>
                <p className="text-xs text-[var(--studio-text-muted)]">
                  Configuration: {integrationStatus?.ga4.configurationComplete ? 'Complete' : 'Pending'}
                </p>
                <p className="text-xs text-[var(--studio-text-muted)]">Property ID: {integrationStatus?.ga4.propertyId || '-'}</p>
                <p className="text-xs text-[var(--studio-text-muted)]">Token expiry: {shortDate(integrationStatus?.ga4.tokenExpiry)}</p>
                <div className="flex gap-2 mt-3">
                  <StudioButton size="sm" onClick={() => handleConnect('ga4')}>
                    {integrationStatus?.ga4.connected ? 'Reconnect' : 'Connect'}
                  </StudioButton>
                  <StudioButton size="sm" variant="outline" onClick={() => handleRefresh('ga4')} disabled={!integrationStatus?.ga4.connected}>
                    Refresh token
                  </StudioButton>
                </div>
                {ga4NeedsSelection && (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-[var(--studio-text-muted)]">
                      Select the GA4 property to finish integration.
                    </p>
                    <StudioSelect
                      value={selectedGa4PropertyId}
                      onChange={(event) => setSelectedGa4PropertyId(event.target.value)}
                      options={[
                        { value: '', label: 'Select GA4 property' },
                        ...ga4Options.map((option) => ({ value: option.value, label: option.label })),
                      ]}
                    />
                    <div className="flex gap-2">
                      <StudioButton
                        size="sm"
                        variant="outline"
                        onClick={() => loadGoogleOptions('ga4')}
                        disabled={loadingOptions.ga4}
                      >
                        {loadingOptions.ga4 ? 'Loading...' : 'Load properties'}
                      </StudioButton>
                      <StudioButton
                        size="sm"
                        onClick={() => handleConfigureGoogle('ga4')}
                        disabled={!selectedGa4PropertyId || savingIntegration.ga4}
                      >
                        {savingIntegration.ga4 ? 'Saving...' : 'Save property'}
                      </StudioButton>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-[var(--studio-text)]">
              <input
                type="checkbox"
                checked={includeDataForSeo}
                onChange={(e) => setIncludeDataForSeo(e.target.checked)}
              />
              Include DataForSEO on sync (optional)
            </label>
          </div>

          <div className="studio-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--studio-text)]">Tracking IDs</h3>
              <p className="text-xs text-[var(--studio-text-muted)]">Autosave: {autosaveStatus}</p>
            </div>
            <div>
              <label className="block text-xs text-[var(--studio-text-muted)] mb-1">Google Tag Manager</label>
              <StudioInput value={gtmId} onChange={(e) => setGtmId(e.target.value)} placeholder="GTM-XXXXXXX" />
            </div>
            <div>
              <label className="block text-xs text-[var(--studio-text-muted)] mb-1">Google Analytics 4 ID</label>
              <StudioInput value={ga4Id} onChange={(e) => setGa4Id(e.target.value)} placeholder="G-XXXXXXXXXX" />
            </div>
            <div>
              <label className="block text-xs text-[var(--studio-text-muted)] mb-1">Facebook Pixel ID</label>
              <StudioInput value={pixelId} onChange={(e) => setPixelId(e.target.value)} placeholder="1234567890" />
            </div>
          </div>

          <div className="studio-card p-4">
            <h3 className="text-sm font-semibold text-[var(--studio-text)] mb-2">Connection Snapshot</h3>
            <div className="text-xs text-[var(--studio-text-muted)] space-y-1">
              <p>GSC connected: {integrationStatus?.gsc.connected ? 'yes' : 'no'}</p>
              <p>GSC configured: {integrationStatus?.gsc.configurationComplete ? 'yes' : 'no'}</p>
              <p>GA4 connected: {integrationStatus?.ga4.connected ? 'yes' : 'no'}</p>
              <p>GA4 configured: {integrationStatus?.ga4.configurationComplete ? 'yes' : 'no'}</p>
              <p>DataForSEO enabled: {integrationStatus?.dataforseo.enabled ? 'yes' : 'no'}</p>
              <p>DataForSEO credentials: {integrationStatus?.dataforseo.connected ? 'yes' : 'no'}</p>
              <p>GA4 average bounce rate: {pct(overview?.avgBounceRate)}</p>
            </div>
          </div>

          <SeoLocaleSettings websiteId={websiteId} />
        </div>
      )}
    </StudioPage>
  );
}
