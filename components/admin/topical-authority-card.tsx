'use client';

import { useEffect, useState } from 'react';
import { StudioBadge } from '@/components/studio/ui/primitives';

interface TopicalAuthorityCardProps {
  websiteId: string;
  locale: string;
}

interface TopicalAuthorityData {
  score: number | null;
  coverage: Record<string, unknown> | null;
  opportunities: Array<{ label?: string; gapPct?: number }> | null;
}

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; data: TopicalAuthorityData }
  | { status: 'missing' } // endpoint 404 / not implemented yet
  | { status: 'error'; message: string };

/**
 * Topical authority card.
 *
 * The `/api/seo/analytics/topical-authority` endpoint may not exist yet —
 * when it 404s we render a "Analytics coming soon" placeholder instead of
 * crashing the dashboard.
 */
export function TopicalAuthorityCard({ websiteId, locale }: TopicalAuthorityCardProps) {
  const [state, setState] = useState<LoadState>({ status: 'idle' });

  useEffect(() => {
    if (!websiteId || !locale) return;
    let cancelled = false;
    setState({ status: 'loading' });

    const params = new URLSearchParams({ websiteId, locale });
    fetch(`/api/seo/analytics/topical-authority?${params.toString()}`, {
      cache: 'no-store',
    })
      .then(async (response) => {
        if (cancelled) return;
        if (response.status === 404) {
          setState({ status: 'missing' });
          return;
        }
        const body = (await response.json().catch(() => null)) as
          | { success?: boolean; data?: TopicalAuthorityData; error?: { message?: string } }
          | null;

        if (!response.ok || !body?.success || !body.data) {
          setState({
            status: 'error',
            message: body?.error?.message ?? 'No se pudo cargar topical authority.',
          });
          return;
        }
        setState({ status: 'ready', data: body.data });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Network error — treat as missing rather than crash.
        if (error instanceof Error && /fetch/i.test(error.message)) {
          setState({ status: 'missing' });
          return;
        }
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Error inesperado.',
        });
      });

    return () => {
      cancelled = true;
    };
  }, [websiteId, locale]);

  return (
    <div className="studio-card p-4 flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[var(--studio-text)]">Topical authority</p>
          <p className="text-xs text-[var(--studio-text-muted)]">
            Cobertura temática para <span className="font-mono">{locale}</span>
          </p>
        </div>
        <StudioBadge tone="info">authority</StudioBadge>
      </div>

      {state.status === 'loading' || state.status === 'idle' ? (
        <div className="space-y-2" aria-busy="true">
          <div className="h-3 w-24 rounded bg-[var(--studio-border)]/60 animate-pulse" />
          <div className="h-6 w-16 rounded bg-[var(--studio-border)]/60 animate-pulse" />
          <div className="h-3 w-40 rounded bg-[var(--studio-border)]/60 animate-pulse" />
        </div>
      ) : state.status === 'missing' ? (
        <p className="text-xs text-[var(--studio-text-muted)]">
          Analytics coming soon — el endpoint de topical authority aún no está disponible.
        </p>
      ) : state.status === 'error' ? (
        <p className="text-xs text-[var(--studio-danger)]">{state.message}</p>
      ) : (
        <div className="space-y-2">
          <p className="text-2xl font-semibold text-[var(--studio-text)]">
            {typeof state.data.score === 'number' ? `${state.data.score.toFixed(1)}` : '—'}
          </p>
          {state.data.opportunities && state.data.opportunities.length > 0 ? (
            <ul className="space-y-1">
              {state.data.opportunities.slice(0, 3).map((opp, index) => (
                <li
                  key={`${opp.label ?? 'opportunity'}-${index}`}
                  className="flex items-center justify-between text-xs text-[var(--studio-text-muted)]"
                >
                  <span className="truncate">{opp.label ?? 'Oportunidad'}</span>
                  {typeof opp.gapPct === 'number' ? (
                    <span className="font-medium text-[var(--studio-text)]">
                      {opp.gapPct.toFixed(0)}%
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[var(--studio-text-muted)]">
              Sin oportunidades destacadas.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
