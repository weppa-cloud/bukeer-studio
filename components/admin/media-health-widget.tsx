'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser-client';

interface MediaHealthWidgetProps {
  websiteId: string;
}

interface MediaHealthSnapshot {
  brokenCount: number;
  missingFeaturedAltCount: number;
  totalMediaAssets: number;
  lastJob: {
    id: string;
    status: string;
    processed: number;
    failed: number;
    brokenUrls: string[];
    updatedAt: string;
  } | null;
}

interface BatchAltResponse {
  success?: boolean;
  data?: {
    jobId: string;
    status: string;
    processed: number;
    failed: number;
    brokenUrls: string[];
  };
  error?: {
    message?: string;
  };
}

export function MediaHealthWidget({ websiteId }: MediaHealthWidgetProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<MediaHealthSnapshot>({
    brokenCount: 0,
    missingFeaturedAltCount: 0,
    totalMediaAssets: 0,
    lastJob: null,
  });

  const loadSnapshot = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [brokenRes, totalRes, missingAltRes, jobRes] = await Promise.all([
        supabase
          .from('media_assets')
          .select('id', { count: 'exact', head: true })
          .eq('website_id', websiteId)
          .neq('http_status', 200),
        supabase
          .from('media_assets')
          .select('id', { count: 'exact', head: true })
          .eq('website_id', websiteId),
        supabase
          .from('website_blog_posts')
          .select('id', { count: 'exact', head: true })
          .eq('website_id', websiteId)
          .not('featured_image', 'is', null)
          .or('featured_alt.is.null,featured_alt.eq.'),
        supabase
          .from('media_alt_jobs')
          .select('id, status, processed, failed, broken_urls, updated_at')
          .eq('website_id', websiteId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (brokenRes.error) throw new Error(brokenRes.error.message);
      if (totalRes.error) throw new Error(totalRes.error.message);
      if (missingAltRes.error) throw new Error(missingAltRes.error.message);
      if (jobRes.error) throw new Error(jobRes.error.message);

      setSnapshot({
        brokenCount: brokenRes.count ?? 0,
        totalMediaAssets: totalRes.count ?? 0,
        missingFeaturedAltCount: missingAltRes.count ?? 0,
        lastJob: jobRes.data
          ? {
              id: jobRes.data.id,
              status: jobRes.data.status,
              processed: jobRes.data.processed ?? 0,
              failed: jobRes.data.failed ?? 0,
              brokenUrls: Array.isArray(jobRes.data.broken_urls) ? (jobRes.data.broken_urls as string[]) : [],
              updatedAt: jobRes.data.updated_at,
            }
          : null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar salud media');
    } finally {
      setLoading(false);
    }
  }, [supabase, websiteId]);

  useEffect(() => {
    loadSnapshot().catch(() => undefined);
  }, [loadSnapshot]);

  const runBatch = useCallback(async (dryRun: boolean) => {
    setRunning(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch('/api/media/batch-alt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          websiteId,
          entityType: 'all',
          dryRun,
          limit: 50,
          locales: ['es'],
        }),
      });

      const payload = (await response.json().catch(() => null)) as BatchAltResponse | null;
      if (!response.ok || !payload?.success || !payload.data) {
        throw new Error(payload?.error?.message || 'Batch failed');
      }

      setNotice(
        dryRun
          ? `Dry run listo: ${payload.data.processed} procesados, ${payload.data.failed} con error`
          : `Batch completado: ${payload.data.processed} procesados, ${payload.data.failed} con error`,
      );

      await loadSnapshot();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error ejecutando batch');
    } finally {
      setRunning(false);
    }
  }, [loadSnapshot, websiteId]);

  const healthTone = snapshot.brokenCount > 0 || snapshot.missingFeaturedAltCount > 0 ? 'text-[var(--studio-warning)]' : 'text-[var(--studio-success)]';

  return (
    <section className="studio-card p-4 mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-[var(--studio-text)]">Salud de Media</h3>
          <p className={`text-sm mt-1 ${healthTone}`}>
            {loading ? 'Cargando métricas...' : `Broken: ${snapshot.brokenCount} · Missing featured_alt: ${snapshot.missingFeaturedAltCount}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => runBatch(true)}
            disabled={running || loading}
            className="px-3 py-1.5 rounded-md text-xs border border-[var(--studio-border)] hover:border-[var(--studio-primary)]"
          >
            Dry run batch alt
          </button>
          <button
            type="button"
            onClick={() => runBatch(false)}
            disabled={running || loading}
            className="px-3 py-1.5 rounded-md text-xs text-white bg-[var(--studio-primary)] hover:opacity-90"
          >
            Ejecutar batch alt
          </button>
          <button
            type="button"
            onClick={() => loadSnapshot()}
            disabled={running}
            className="px-3 py-1.5 rounded-md text-xs border border-[var(--studio-border)]"
          >
            Refrescar
          </button>
        </div>
      </div>

      {!loading && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
          <div className="rounded-md border border-[var(--studio-border)] p-2">
            <p className="text-[var(--studio-text-muted)]">Total media_assets</p>
            <p className="font-semibold text-[var(--studio-text)]">{snapshot.totalMediaAssets}</p>
          </div>
          <div className="rounded-md border border-[var(--studio-border)] p-2">
            <p className="text-[var(--studio-text-muted)]">Broken URLs</p>
            <p className="font-semibold text-[var(--studio-text)]">{snapshot.brokenCount}</p>
          </div>
          <div className="rounded-md border border-[var(--studio-border)] p-2">
            <p className="text-[var(--studio-text-muted)]">Posts sin featured_alt</p>
            <p className="font-semibold text-[var(--studio-text)]">{snapshot.missingFeaturedAltCount}</p>
          </div>
        </div>
      )}

      {snapshot.lastJob && (
        <div className="mt-3 text-xs text-[var(--studio-text-muted)]">
          Último job: {snapshot.lastJob.id.slice(0, 8)} · {snapshot.lastJob.status} · procesados {snapshot.lastJob.processed} · fallidos {snapshot.lastJob.failed}
        </div>
      )}

      {snapshot.lastJob?.brokenUrls?.length ? (
        <div className="mt-2 text-xs text-[var(--studio-warning)]">
          URLs rotas recientes: {snapshot.lastJob.brokenUrls.slice(0, 3).join(' · ')}
        </div>
      ) : null}

      {notice ? <p className="mt-2 text-xs text-[var(--studio-success)]">{notice}</p> : null}
      {error ? <p className="mt-2 text-xs text-[var(--studio-danger)]">{error}</p> : null}
    </section>
  );
}
