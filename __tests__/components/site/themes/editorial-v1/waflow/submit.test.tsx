/**
 * editorial-v1 WAFlow — Submission flow tests.
 *
 * Exercises the submission pipeline at the pure-helper level:
 *   - Given the user's filled state, buildWaflowMessage produces the
 *     designer-spec template lines.
 *   - buildWaflowUrl encodes the message correctly for wa.me.
 *   - The contact step component renders the expected submit button label
 *     per variant (SSR smoke test).
 *
 * A full click-driven RTL test will ship once `jest-environment-jsdom` is
 * added to devDependencies (tracked separately — keeping this suite
 * dependency-free for now).
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
}));

import { WaflowProvider } from '@/components/site/themes/editorial-v1/waflow/provider';
import { WaflowStepContact } from '@/components/site/themes/editorial-v1/waflow/steps/contact';
import {
  buildWaflowMessage,
  buildWaflowUrl,
} from '@/components/site/themes/editorial-v1/waflow/message';
import { WAFLOW_COUNTRIES } from '@/components/site/themes/editorial-v1/waflow/types';

const CO = WAFLOW_COUNTRIES[0];

describe('WAFlow submission — message + URL', () => {
  it('produces a wa.me URL whose text param matches the designer template', () => {
    const ref = 'HOME-1203-ABCD';
    const msg = buildWaflowMessage({
      variant: 'A',
      name: 'Juan Pérez',
      country: CO,
      phone: '3001234567',
      destinationChoice: 'Cartagena',
      when: 'En 2–3 meses',
      adults: 2,
      children: 1,
      interests: ['Relax', 'Gastronomía'],
      ref,
    });
    const url = buildWaflowUrl('573001234567', msg);
    expect(url.startsWith('https://wa.me/573001234567?text=')).toBe(true);
    const encoded = url.slice('https://wa.me/573001234567?text='.length);
    const decoded = decodeURIComponent(encoded);
    expect(decoded).toContain('¡Hola! Quiero planear un viaje por Colombia');
    expect(decoded).toContain('📍 Destino: Cartagena');
    expect(decoded).toContain('📅 Cuándo: En 2–3 meses');
    expect(decoded).toContain('👥 Viajeros: 2 adultos + 1 niño');
    expect(decoded).toContain('✨ Intereses: Relax, Gastronomía');
    expect(decoded).toContain('— Juan Pérez');
    expect(decoded).toContain(`#ref: ${ref}`);
  });

  it('produces a variant D URL with package metadata preserved', () => {
    const url = buildWaflowUrl(
      '573001234567',
      buildWaflowMessage({
        variant: 'D',
        name: 'Diego',
        country: CO,
        phone: '3001234567',
        when: 'Flexible',
        adults: 2,
        children: 0,
        interests: [],
        adjust: ['Agregar días'],
        pkgTitle: 'Café y paisaje',
        pkgDays: 5,
        pkgNights: 4,
        ref: 'CAFE-0101-AAAA',
      }),
    );
    const decoded = decodeURIComponent(
      url.slice('https://wa.me/573001234567?text='.length),
    );
    expect(decoded).toContain('Me interesa el paquete "Café y paisaje"');
    expect(decoded).toContain('📦 Paquete: Café y paisaje · 5D/4N');
    expect(decoded).toContain('🛠️ Ajustes: Agregar días');
  });
});

describe('WAFlow submission — UI label', () => {
  it('renders "Continuar en WhatsApp" for variant A', () => {
    const html = renderToStaticMarkup(
      <WaflowProvider businessNumber="573001234567" subdomain="colombiatours" showFab={false}>
        <WaflowStepContact variant="A" config={{ variant: 'A' }} subdomain="colombiatours" />
      </WaflowProvider>,
    );
    expect(html).toContain('Continuar en WhatsApp');
  });

  it('renders "Planear mi viaje a ..." for variant B', () => {
    const html = renderToStaticMarkup(
      <WaflowProvider businessNumber="573001234567" subdomain="colombiatours" showFab={false}>
        <WaflowStepContact
          variant="B"
          config={{ variant: 'B', destination: { slug: 'cartagena', name: 'Cartagena' } }}
          subdomain="colombiatours"
        />
      </WaflowProvider>,
    );
    expect(html).toContain('Planear mi viaje a Cartagena');
  });

  it('renders "Continuar con este paquete" for variant D', () => {
    const html = renderToStaticMarkup(
      <WaflowProvider businessNumber="573001234567" subdomain="colombiatours" showFab={false}>
        <WaflowStepContact
          variant="D"
          config={{ variant: 'D', pkg: { slug: 'cafe-paisaje', title: 'Café y paisaje' } }}
          subdomain="colombiatours"
        />
      </WaflowProvider>,
    );
    expect(html).toContain('Continuar con este paquete');
  });

  it('marks the privacy disclaimer', () => {
    const html = renderToStaticMarkup(
      <WaflowProvider businessNumber="573001234567" showFab={false}>
        <WaflowStepContact variant="A" config={{ variant: 'A' }} />
      </WaflowProvider>,
    );
    expect(html).toContain('Tu número se usa solo para este viaje');
  });
});
