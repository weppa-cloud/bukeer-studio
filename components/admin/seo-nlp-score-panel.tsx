'use client';

import { useEffect, useMemo, useState } from 'react';
import { StudioBadge } from '@/components/studio/ui/primitives';

type ScorePageType = 'blog' | 'page' | 'destination' | 'hotel' | 'activity' | 'package' | 'transfer';

type NlpScoreResponse = {
  entityCoverage: {
    matched: number;
    total: number;
    pct: number;
    missing: string[];
  };
  wordCountVs: {
    current: number;
    top10Avg: number;
    delta: number;
  };
  keywordDensity: {
    keyword: string;
    occurrences: number;
    pct: number;
  };
  readabilityScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  sourceMeta?: {
    source: string;
    fetchedAt: string;
    confidence: 'live' | 'partial' | 'exploratory';
  };
};

interface SeoNlpScorePanelProps {
  active: boolean;
  websiteId: string;
  itemType: string;
  locale: string;
  keyword: string;
  content: string;
}

function toScorePageType(itemType: string): ScorePageType | null {
  if (itemType === 'blog') return 'blog';
  if (itemType === 'page') return 'page';
  if (itemType === 'destination') return 'destination';
  if (itemType === 'hotel') return 'hotel';
  if (itemType === 'activity') return 'activity';
  if (itemType === 'package') return 'package';
  if (itemType === 'transfer') return 'transfer';
  return null;
}

function gradeTone(grade: NlpScoreResponse['grade']): 'success' | 'info' | 'warning' | 'danger' {
  if (grade === 'A') return 'success';
  if (grade === 'B') return 'info';
  if (grade === 'C') return 'warning';
  return 'danger';
}

export function SeoNlpScorePanel({
  active,
  websiteId,
  itemType,
  locale,
  keyword,
  content,
}: SeoNlpScorePanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NlpScoreResponse | null>(null);

  const pageType = useMemo(() => toScorePageType(itemType), [itemType]);
  const normalizedKeyword = keyword.trim();
  const normalizedContent = content.trim();
  const canScore = active && Boolean(pageType) && normalizedKeyword.length >= 2 && normalizedContent.length >= 50;

  useEffect(() => {
    if (!canScore || !pageType) {
      setLoading(false);
      setError(null);
      setResult(null);
      return;
    }

    setError(null);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/seo/content-intelligence/nlp-score', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            websiteId,
            locale,
            keyword: normalizedKeyword,
            content: normalizedContent,
            pageType,
          }),
          signal: controller.signal,
        });

        const body = (await response.json().catch(() => ({}))) as {
          success?: boolean;
          data?: NlpScoreResponse;
          error?: { message?: string };
        };

        if (!response.ok || !body.success || !body.data) {
          throw new Error(body?.error?.message || 'No se pudo calcular NLP score');
        }

        setResult(body.data);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setResult(null);
        setError(fetchError instanceof Error ? fetchError.message : 'No se pudo calcular NLP score');
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 800);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [canScore, locale, normalizedContent, normalizedKeyword, pageType, websiteId]);

  return (
    <div className="border border-[var(--studio-border)] rounded p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-[var(--studio-text)]">NLP Score (SERP Top10)</p>
          <p className="text-xs text-[var(--studio-text-muted)]">Auto-refresh con debounce (800ms)</p>
        </div>
        {result ? <StudioBadge tone={gradeTone(result.grade)}>Grade {result.grade}</StudioBadge> : null}
      </div>

      {!canScore ? (
        <p className="text-xs text-[var(--studio-text-muted)]">
          Agrega keyword (minimo 2 chars) y contenido SEO (minimo 50 chars) para habilitar el score.
        </p>
      ) : null}

      {loading ? (
        <p className="text-xs text-[var(--studio-text-muted)]">Calculando score NLP...</p>
      ) : null}

      {error ? (
        <p className="text-xs text-[var(--studio-danger)]">{error}</p>
      ) : null}

      {result ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
          <div className="border border-[var(--studio-border)] rounded p-2">
            <p className="text-[var(--studio-text-muted)]">Entity coverage</p>
            <p className="text-[var(--studio-text)] font-medium">
              {result.entityCoverage.matched}/{result.entityCoverage.total} ({result.entityCoverage.pct.toFixed(1)}%)
            </p>
          </div>
          <div className="border border-[var(--studio-border)] rounded p-2">
            <p className="text-[var(--studio-text-muted)]">Word count vs Top10</p>
            <p className="text-[var(--studio-text)] font-medium">
              {result.wordCountVs.current} vs {result.wordCountVs.top10Avg} (Δ {result.wordCountVs.delta})
            </p>
          </div>
          <div className="border border-[var(--studio-border)] rounded p-2">
            <p className="text-[var(--studio-text-muted)]">Keyword density</p>
            <p className="text-[var(--studio-text)] font-medium">
              {result.keywordDensity.occurrences} ocurrencias ({result.keywordDensity.pct.toFixed(2)}%)
            </p>
          </div>
          <div className="border border-[var(--studio-border)] rounded p-2">
            <p className="text-[var(--studio-text-muted)]">Readability</p>
            <p className="text-[var(--studio-text)] font-medium">{result.readabilityScore.toFixed(1)}/100</p>
          </div>

          {result.entityCoverage.missing.length > 0 ? (
            <div className="md:col-span-2 border border-[var(--studio-border)] rounded p-2">
              <p className="text-[var(--studio-text-muted)] mb-1">Entities faltantes</p>
              <p className="text-[var(--studio-text)]">
                {result.entityCoverage.missing.slice(0, 8).join(', ')}
                {result.entityCoverage.missing.length > 8 ? '…' : ''}
              </p>
            </div>
          ) : null}

          {result.sourceMeta ? (
            <div className="md:col-span-2 text-[10px] text-[var(--studio-text-muted)]">
              Source: {result.sourceMeta.source} · {new Date(result.sourceMeta.fetchedAt).toLocaleString()} · {result.sourceMeta.confidence}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
