import type { WebsiteData } from '@/lib/supabase/get-website';

export interface ResolvedWebsiteContactChannels {
  email: string | null;
  phone: string | null;
  whatsappRaw: string | null;
  whatsappDigits: string | null;
  whatsappHref: string | null;
  hasEmail: boolean;
  hasPhone: boolean;
  hasWhatsapp: boolean;
}

type WebsiteWithContactColumns = WebsiteData & {
  contact_whatsapp?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
};

type LooseContactFields = {
  email?: unknown;
  phone?: unknown;
  whatsapp?: unknown;
};

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const cleaned = cleanString(value);
    if (cleaned) return cleaned;
  }
  return null;
}

export function sanitizePhoneDigits(value: string | null | undefined): string | null {
  const digits = (value ?? '').replace(/[^0-9]/g, '');
  return digits.length > 0 ? digits : null;
}

export function normalizeEmail(value: string | null | undefined): string | null {
  const email = cleanString(value);
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function resolveWebsiteContactChannels(
  website: WebsiteData,
): ResolvedWebsiteContactChannels {
  const record = website as WebsiteWithContactColumns;
  const content = website.content ?? {};
  const account = (content.account ?? {}) as LooseContactFields;
  const contact = (content.contact ?? {}) as LooseContactFields;
  const social = (content.social ?? {}) as LooseContactFields;

  const whatsappRaw = firstString(
    record.contact_whatsapp,
    account.whatsapp,
    contact.whatsapp,
    social.whatsapp,
    account.phone,
    contact.phone,
    record.contact_phone,
  );
  const whatsappDigits = sanitizePhoneDigits(whatsappRaw);
  const email =
    normalizeEmail(firstString(record.contact_email, account.email)) ??
    normalizeEmail(firstString(contact.email));
  const phone = firstString(record.contact_phone, account.phone, contact.phone);

  return {
    email,
    phone,
    whatsappRaw,
    whatsappDigits,
    whatsappHref: whatsappDigits ? `https://wa.me/${whatsappDigits}` : null,
    hasEmail: Boolean(email),
    hasPhone: Boolean(phone),
    hasWhatsapp: Boolean(whatsappDigits),
  };
}
