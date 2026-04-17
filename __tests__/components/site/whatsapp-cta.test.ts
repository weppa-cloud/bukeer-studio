import { buildWhatsAppUrl } from '@/components/site/whatsapp-url';

describe('buildWhatsAppUrl', () => {
  it('returns null when phone is missing', () => {
    expect(buildWhatsAppUrl({ phone: '' })).toBeNull();
    expect(buildWhatsAppUrl({ phone: null })).toBeNull();
  });

  it('encodes special characters safely in dynamic fields', () => {
    const url = buildWhatsAppUrl({
      phone: '+57 (300) 123-4567',
      productName: 'Tour & Barco #1 "VIP" 🚤',
      location: "San Andrés & 'Johnny Cay'",
      ref: 'PKG-#A&B',
    });

    expect(url).not.toBeNull();
    expect(url).toContain('https://wa.me/573001234567?text=');

    const textParam = new URL(url!).searchParams.get('text');
    expect(textParam).toBeTruthy();
    expect(textParam).toContain('Tour & Barco #1 "VIP" 🚤');
    expect(textParam).toContain("San Andrés & 'Johnny Cay'");
    expect(textParam).toContain('(Ref: PKG-#A&B)');
  });
});
