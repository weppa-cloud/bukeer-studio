/**
 * editorial-v1 WAFlow — message builder + validation unit tests.
 *
 * Pure helpers; no React/DOM. Covers:
 *   - buildWaflowMessage per variant (A/B/D)
 *   - buildQuickSkipMessage per variant
 *   - makeWaflowRef shape (prefix + date + rand)
 *   - buildWaflowUrl encoding
 *   - validateWaflowPhone length check
 */

import {
  buildQuickSkipMessage,
  buildWaflowMessage,
  buildWaflowUrl,
  makeWaflowRef,
  resolveRefPrefix,
  validateWaflowPhone,
} from '@/components/site/themes/editorial-v1/waflow/message';
import { WAFLOW_COUNTRIES } from '@/components/site/themes/editorial-v1/waflow/types';

const CO = WAFLOW_COUNTRIES[0];

describe('buildWaflowMessage', () => {
  it('builds the Variant A template with all context lines', () => {
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
      ref: 'HOME-1203-AB12',
    });
    expect(msg).toContain('¡Hola! Quiero planear un viaje por Colombia');
    expect(msg).toContain('📍 Destino: Cartagena');
    expect(msg).toContain('📅 Cuándo: En 2–3 meses');
    expect(msg).toContain('👥 Viajeros: 2 adultos + 1 niño');
    expect(msg).toContain('✨ Intereses: Relax, Gastronomía');
    expect(msg).toContain('— Juan Pérez');
    expect(msg).toContain('#ref: HOME-1203-AB12');
  });

  it('falls back to "por definir" when variant A has no destination', () => {
    const msg = buildWaflowMessage({
      variant: 'A',
      name: 'Ana',
      country: CO,
      phone: '3001234567',
      when: 'Flexible',
      adults: 1,
      children: 0,
      interests: [],
      ref: 'HOME-0101-ZZZZ',
    });
    expect(msg).toContain('📍 Destino: por definir');
    expect(msg).not.toContain('✨ Intereses');
  });

  it('builds the Variant B template with destination name', () => {
    const msg = buildWaflowMessage({
      variant: 'B',
      name: 'Carolina',
      country: CO,
      phone: '3001234567',
      destFull: 'San Andrés',
      when: 'Fin de año',
      adults: 2,
      children: 0,
      interests: ['Playa'],
      ref: 'DEST-1001-QQQQ',
    });
    expect(msg).toContain('¡Hola! Quiero planear un viaje a San Andrés');
    expect(msg).toContain('📍 Destino: San Andrés');
    expect(msg).toContain('✨ Me interesa: Playa');
  });

  it('builds the Variant D template with package metadata', () => {
    const msg = buildWaflowMessage({
      variant: 'D',
      name: 'Diego',
      country: CO,
      phone: '3001234567',
      when: 'Flexible',
      adults: 2,
      children: 0,
      interests: [],
      adjust: ['Agregar días', 'Cambiar hotel'],
      pkgTitle: 'Café y paisaje',
      pkgDays: 5,
      pkgNights: 4,
      ref: 'CAFE-0803-WWWW',
    });
    expect(msg).toContain('¡Hola! Me interesa el paquete "Café y paisaje"');
    expect(msg).toContain('📦 Paquete: Café y paisaje · 5D/4N');
    expect(msg).toContain('🛠️ Ajustes: Agregar días, Cambiar hotel');
  });
});

describe('buildQuickSkipMessage', () => {
  it('uses the Variant A skip template', () => {
    const msg = buildQuickSkipMessage({ variant: 'A' }, 'HOME-0101-XXXX');
    expect(msg).toContain('¡Hola! Quiero planear un viaje por Colombia');
    expect(msg).toContain('#ref: HOME-0101-XXXX');
  });
  it('uses the Variant B skip template with destination', () => {
    const msg = buildQuickSkipMessage(
      { variant: 'B', destination: { slug: 'cartagena', name: 'Cartagena' } },
      'CART-0101-XXXX',
    );
    expect(msg).toContain('Quiero planear un viaje a Cartagena');
  });
  it('uses the Variant D skip template with package title', () => {
    const msg = buildQuickSkipMessage(
      { variant: 'D', pkg: { slug: 'cafe', title: 'Café y paisaje' } },
      'CAFE-0101-XXXX',
    );
    expect(msg).toContain('Me interesa el paquete "Café y paisaje"');
  });
});

describe('makeWaflowRef', () => {
  it('prefixes with the given token + date + 4 chars', () => {
    const ref = makeWaflowRef('HOME');
    expect(ref).toMatch(/^HOME-\d{4}-[A-Z0-9]{4}$/);
  });
  it('truncates long prefixes to 6 chars and uppercases', () => {
    const ref = makeWaflowRef('cartagena-riviera');
    expect(ref).toMatch(/^CARTAG-\d{4}-[A-Z0-9]{4}$/);
  });
  it('falls back to HOME for empty prefix', () => {
    const ref = makeWaflowRef('');
    expect(ref).toMatch(/^HOME-\d{4}-[A-Z0-9]{4}$/);
  });
});

describe('validateWaflowPhone', () => {
  it('accepts exact length per country', () => {
    expect(validateWaflowPhone('3001234567', CO)).toBe(true);
    expect(validateWaflowPhone('300 123 4567', CO)).toBe(true);
  });
  it('rejects too-short numbers', () => {
    expect(validateWaflowPhone('30012345', CO)).toBe(false);
  });
  it('rejects too-long numbers', () => {
    expect(validateWaflowPhone('300123456789', CO)).toBe(false);
  });
});

describe('buildWaflowUrl', () => {
  it('strips non-digits from business number and URL-encodes message', () => {
    const url = buildWaflowUrl('+57 300 123 4567', 'Hola 👋');
    expect(url.startsWith('https://wa.me/573001234567?text=')).toBe(true);
    expect(url).toContain(encodeURIComponent('Hola 👋'));
  });
});

describe('resolveRefPrefix', () => {
  it('uses HOME for variant A', () => {
    expect(resolveRefPrefix({ variant: 'A' })).toBe('HOME');
  });
  it('uses destination slug (truncated, uppercase) for variant B', () => {
    expect(
      resolveRefPrefix({
        variant: 'B',
        destination: { slug: 'cartagena', name: 'Cartagena' },
      }),
    ).toBe('CARTAG');
  });
  it('falls back when destination missing', () => {
    expect(resolveRefPrefix({ variant: 'B' })).toBe('DEST');
  });
  it('uses package slug (truncated, uppercase) for variant D', () => {
    expect(
      resolveRefPrefix({
        variant: 'D',
        pkg: { slug: 'aventura-caribe', title: 'Aventura Caribe' },
      }),
    ).toBe('AVENTU');
  });
});
