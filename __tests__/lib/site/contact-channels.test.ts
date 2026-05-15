import { resolveWebsiteContactChannels, sanitizePhoneDigits, normalizeEmail } from '@/lib/site/contact-channels';
import type { WebsiteData } from '@/lib/supabase/get-website';

function makeWebsite(overrides: Partial<WebsiteData> = {}): WebsiteData {
  return {
    id: 'website-1',
    account_id: 'account-1',
    subdomain: 'colombiatours',
    custom_domain: 'colombiatours.travel',
    status: 'published',
    theme: null,
    analytics: {},
    default_locale: 'es-CO',
    supported_locales: ['es-CO', 'en-US'],
    sections: [],
    navigation: [],
    site_parts: {},
    content: {
      siteName: 'ColombiaTours.Travel',
      locale: 'es-CO',
      account: {
        name: 'ColombiaTours.Travel',
        email: 'hola@example.com',
        phone: '+57 300 000 0000',
      },
      contact: {},
      social: { whatsapp: '+57 311 111 1111' },
    },
    ...overrides,
  } as WebsiteData;
}

describe('contact-channels', () => {
  it('sanitizes phone digits for wa.me links', () => {
    expect(sanitizePhoneDigits('+57 (300) 000-0000')).toBe('573000000000');
    expect(sanitizePhoneDigits('not a number')).toBeNull();
  });

  it('omits invalid email values', () => {
    expect(normalizeEmail('hola@example.com')).toBe('hola@example.com');
    expect(normalizeEmail('undefined')).toBeNull();
  });

  it('prefers structured website WhatsApp over account/contact/social fallback', () => {
    const website = makeWebsite({ contact_whatsapp: '+57 322 222 2222' } as Partial<WebsiteData>);

    const channels = resolveWebsiteContactChannels(website);

    expect(channels.email).toBe('hola@example.com');
    expect(channels.phone).toBe('+57 300 000 0000');
    expect(channels.whatsappRaw).toBe('+57 322 222 2222');
    expect(channels.whatsappDigits).toBe('573222222222');
    expect(channels.whatsappHref).toBe('https://wa.me/573222222222');
    expect(channels.hasWhatsapp).toBe(true);
  });

  it('falls back through account, contact, and social channels without malformed links', () => {
    const website = makeWebsite({
      content: {
        siteName: 'ColombiaTours.Travel',
        account: { name: 'ColombiaTours.Travel', email: 'bad-email', phone: null },
        contact: { email: 'contact@example.com', phone: '+57 333 333 3333' },
        social: {},
      },
    } as Partial<WebsiteData>);

    const channels = resolveWebsiteContactChannels(website);

    expect(channels.email).toBe('contact@example.com');
    expect(channels.whatsappDigits).toBe('573333333333');
    expect(channels.whatsappHref).toBe('https://wa.me/573333333333');
  });
});
