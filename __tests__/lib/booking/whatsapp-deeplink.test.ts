import { buildBookingWhatsAppUrl } from '@/lib/booking/whatsapp-deeplink';
import type { LeadInput } from '@bukeer/website-contract';

const baseLead: LeadInput = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  phone: '+573001234567',
  product_id: '00000000-0000-4000-8000-000000000001',
  date: '2026-05-20',
  pax: 2,
  option_id: null,
  source: 'website_booking_form',
  locale: 'es-CO',
  consent_tos: true,
  consent_privacy: true,
};

describe('buildBookingWhatsAppUrl', () => {
  it('returns null when phone has no digits', () => {
    const url = buildBookingWhatsAppUrl({
      phone: 'not-a-number',
      productName: 'Tour X',
      lead: baseLead,
      leadId: 'abc',
    });
    expect(url).toBeNull();
  });

  it('includes date, pax, and lead ref', () => {
    const url = buildBookingWhatsAppUrl({
      phone: '+57 320 612 90 03',
      productName: 'Bar en lancha',
      lead: baseLead,
      leadId: 'lead-123',
    });
    expect(url).not.toBeNull();
    expect(url).toContain('https://wa.me/573206129003');
    const decoded = decodeURIComponent(url!.split('text=')[1]!);
    expect(decoded).toContain('Bar en lancha');
    expect(decoded).toContain('2026-05-20');
    expect(decoded).toContain('2 personas');
    expect(decoded).toContain('lead_lead-123');
  });

  it('singularizes "persona" when pax = 1', () => {
    const url = buildBookingWhatsAppUrl({
      phone: '+573206129003',
      productName: 'Tour',
      lead: { ...baseLead, pax: 1 },
      leadId: 'x',
    });
    const decoded = decodeURIComponent(url!.split('text=')[1]!);
    expect(decoded).toContain('1 persona');
    expect(decoded).not.toContain('1 personas');
  });

  it('includes option_id when present', () => {
    const url = buildBookingWhatsAppUrl({
      phone: '+573206129003',
      productName: 'Tour',
      lead: { ...baseLead, option_id: 'opt-42' },
      leadId: 'x',
    });
    const decoded = decodeURIComponent(url!.split('text=')[1]!);
    expect(decoded).toContain('Opción: opt-42');
  });
});
