import { getDefaultLegalContent } from '@/lib/legal-defaults';

describe('legal defaults locale-aware dates', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-21T12:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('formats default legal dates with the resolved locale', () => {
    const esContent = getDefaultLegalContent('terms', 'Acme Travel', 'es-CO');
    const enContent = getDefaultLegalContent('terms', 'Acme Travel', 'en-US');

    expect(esContent).toContain('abril');
    expect(enContent).toContain('April');
  });
});
