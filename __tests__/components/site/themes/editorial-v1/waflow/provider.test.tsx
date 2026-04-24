/**
 * editorial-v1 WAFlow Provider — unit tests.
 *
 * Exercises the pure helpers behind the provider (initialStateFor,
 * storage key factory) plus a server-rendered smoke test that the
 * provider mounts without error and exposes the FAB (variant A launcher).
 *
 * This suite runs in node (no jsdom) to avoid a new dependency; hook /
 * localStorage behaviour is validated through the isolated helpers.
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

// SSR of client components that read localStorage needs a guard — the
// provider checks `typeof window !== 'undefined'` before touching it, but
// the FAB uses useEffect only so SSR renders inert markup. That's exactly
// what renderToStaticMarkup exercises.
import {
  WaflowProvider,
  initialStateFor,
  waflowStorageKey,
  cryptoUuid,
} from '@/components/site/themes/editorial-v1/waflow/provider';
import { WAFLOW_STORAGE_PREFIX } from '@/components/site/themes/editorial-v1/waflow/types';

describe('initialStateFor', () => {
  it('starts variant A on the "contact" step', () => {
    const s = initialStateFor('A');
    expect(s.variant).toBe('A');
    expect(s.step).toBe('contact');
    expect(s.adults).toBe(2);
    expect(s.children).toBe(0);
    expect(s.when).toBe('Flexible');
    expect(s.countryCode).toBe('CO');
    expect(s.interests).toEqual([]);
    expect(typeof s.sessionKey).toBe('string');
    expect(s.sessionKey.length).toBeGreaterThan(4);
  });

  it('starts variants B and D on the "contact" step', () => {
    expect(initialStateFor('B').step).toBe('contact');
    expect(initialStateFor('D').step).toBe('contact');
  });
});

describe('waflowStorageKey', () => {
  it('scopes the key per variant with a versioned prefix', () => {
    expect(waflowStorageKey('A')).toBe(`${WAFLOW_STORAGE_PREFIX}A`);
    expect(waflowStorageKey('B')).toBe(`${WAFLOW_STORAGE_PREFIX}B`);
    expect(waflowStorageKey('D')).toBe(`${WAFLOW_STORAGE_PREFIX}D`);
  });
});

describe('cryptoUuid', () => {
  it('returns a non-empty string', () => {
    const id = cryptoUuid();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(6);
  });
  it('returns distinct values on consecutive calls', () => {
    const a = cryptoUuid();
    const b = cryptoUuid();
    expect(a).not.toBe(b);
  });
});

describe('<WaflowProvider/> SSR', () => {
  it('renders without throwing and mounts the FAB shell', () => {
    const markup = renderToStaticMarkup(
      <WaflowProvider businessNumber="573001234567" subdomain="colombiatours">
        <main data-testid="child">body</main>
      </WaflowProvider>,
    );
    expect(markup).toContain('data-testid="child"');
    // FAB wraps a <button aria-label="Chat por WhatsApp con un planner">
    expect(markup).toContain('aria-label="Chat por WhatsApp con un planner"');
    // Drawer is not rendered until a variant is opened.
    expect(markup).not.toContain('role="dialog"');
  });

  it('omits the FAB when showFab=false', () => {
    const markup = renderToStaticMarkup(
      <WaflowProvider businessNumber="573001234567" showFab={false}>
        <main>body</main>
      </WaflowProvider>,
    );
    expect(markup).not.toContain('wa-fab-f1');
  });
});
