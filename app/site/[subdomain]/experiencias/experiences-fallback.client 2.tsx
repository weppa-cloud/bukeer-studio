'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import type { ExperienceItem } from '@/components/site/themes/editorial-v1/pages/experiences-grid.client';

interface ExperiencesFallbackClientProps {
  activities: ExperienceItem[];
}

function normalise(value: string | null | undefined): string {
  return (value ?? '').toString().trim().toLowerCase();
}

export function ExperiencesFallbackClient({
  activities,
}: ExperiencesFallbackClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const q = searchParams?.get('q') ?? '';
  const [keywordInput, setKeywordInput] = useState(q);

  const filtered = useMemo(() => {
    const needle = normalise(q);
    if (!needle) return activities;

    return activities.filter((activity) => {
      const haystack = normalise(
        `${activity.name} ${activity.title ?? ''} ${activity.description ?? ''} ${activity.location ?? ''}`,
      );
      return haystack.includes(needle);
    });
  }, [activities, q]);

  const setKeywordParam = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      const next = value.trim();
      if (!next) params.delete('q');
      else params.set('q', next);
      const qs = params.toString();
      router.replace(qs ? `?${qs}` : '?', { scroll: false });
    },
    [router, searchParams],
  );

  useEffect(() => {
    setKeywordInput(q);
  }, [q]);

  useEffect(() => {
    const next = keywordInput.trim();
    const current = q.trim();
    if (next === current) return;
    const timer = setTimeout(() => {
      setKeywordParam(keywordInput);
    }, 180);
    return () => clearTimeout(timer);
  }, [keywordInput, q, setKeywordParam]);

  return (
    <>
      <div className="mb-5">
        <label htmlFor="experiences-keyword" className="mb-2 block text-sm font-medium">
          Buscar actividades
        </label>
        <input
          id="experiences-keyword"
          type="text"
          value={keywordInput}
          onChange={(event) => setKeywordInput(event.target.value)}
          className="w-full rounded-full border px-4 py-2 text-sm"
          placeholder="Buscar por palabra clave"
          aria-label="Buscar actividades"
        />
      </div>

      <div className="mb-6 text-sm text-muted-foreground">
        <b data-testid="experiences-count" className="text-foreground">{filtered.length}</b> de {activities.length} experiencias
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border p-6 text-sm" data-testid="experiences-empty">
          Nada con esos criterios.
        </div>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="experiences-grid">
          {filtered.map((activity) => (
            <li key={activity.id} className="rounded-lg border p-4">
              <h3 className="exp-title font-semibold">{activity.name}</h3>
              {activity.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{activity.description}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default ExperiencesFallbackClient;
