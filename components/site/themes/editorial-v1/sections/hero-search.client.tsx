'use client';

/**
 * Hero search — client leaf for the editorial-v1 hero.
 *
 * Collects three editorial "pseudo-fields" (destino / fechas / viajeros) and
 * submits to `/buscar?q=…&from=…&to=…&pax=…`. The designer prototype used
 * three pill buttons that open a future picker — we keep the pill visuals but
 * wrap them in an actual `<form>` so the user can type + submit with Enter.
 *
 * This is intentionally lightweight: no date picker, no pax stepper. It exists
 * to forward to the site search/filter page with friendly defaults. If a
 * tenant disables the search (`content.search.enabled = false`), the parent
 * skips this component entirely — there is no client-only fallback.
 */

import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState, type FormEvent } from 'react';
import { Icons } from '../primitives/icons';
import { getPublicUiExtraTextGetter } from '@/lib/site/public-ui-extra-text';

export interface HeroSearchPlaceholders {
  destino?: string;
  fechas?: string;
  viajeros?: string;
  cta?: string;
}

export interface HeroSearchProps {
  placeholders?: HeroSearchPlaceholders;
  /** Optional base path — e.g. `/site/colombiatours`. */
  basePath?: string;
  /** Where to send the user. Defaults to `/buscar`. */
  actionPath?: string;
  /** UI locale (e.g. `en-US`) for labels/placeholders fallback. */
  locale?: string | null;
}

export function HeroSearch({
  placeholders,
  basePath = '',
  actionPath = '/buscar',
  locale,
}: HeroSearchProps) {
  const editorialText = getPublicUiExtraTextGetter(locale ?? 'es-CO');
  const resolved = useMemo<Required<HeroSearchPlaceholders>>(
    () => ({
      destino: editorialText('editorialSearchPlaceholderDestino'),
      fechas: editorialText('editorialSearchPlaceholderFechas'),
      viajeros: editorialText('editorialSearchPlaceholderViajeros'),
      cta: editorialText('editorialSearchSubmit'),
      ...(placeholders || {}),
    }),
    [placeholders, editorialText],
  );

  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [pax, setPax] = useState('');
  const router = useRouter();

  const onSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (pax) params.set('pax', pax);
      const target = `${basePath}${actionPath}${
        params.size ? `?${params.toString()}` : ''
      }`;
      router.push(target);
    },
    [q, from, to, pax, basePath, actionPath, router],
  );

  return (
    <form className="hero-search" role="search" onSubmit={onSubmit}>
      <label className="field">
        <small>{editorialText('editorialSearchDestinoLabel')}</small>
        <input
          type="text"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={resolved.destino}
          aria-label={editorialText('editorialSearchDestinoLabel')}
        />
      </label>
      <label className="field">
        <small>{editorialText('editorialSearchWhenLabel')}</small>
        <input
          type="text"
          name="from"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          placeholder={resolved.fechas}
          aria-label={editorialText('editorialSearchFechasAria')}
        />
      </label>
      <label className="field">
        <small>{editorialText('editorialSearchViajerosLabel')}</small>
        <input
          type="text"
          name="pax"
          value={pax || to}
          onChange={(e) => {
            setPax(e.target.value);
            // keep `to` in sync only if we want a second-date picker later
            setTo(to);
          }}
          placeholder={resolved.viajeros}
          aria-label={editorialText('editorialSearchViajerosLabel')}
        />
      </label>
      <button type="submit" className="go" aria-label={resolved.cta}>
        <Icons.search size={16} /> {resolved.cta}
      </button>
    </form>
  );
}
