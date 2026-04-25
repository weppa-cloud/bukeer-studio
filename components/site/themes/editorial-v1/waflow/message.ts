/**
 * editorial-v1 WhatsApp Flow — Pure helpers.
 *
 * Port of `buildWAMessage`, `makeRef`, `validatePhone` from
 *   themes/references/claude design 1/project/waflow.jsx
 *
 * Kept as a standalone module (no React/DOM deps) so it can be imported by
 * server code (the /api/waflow/lead route) and unit-tested cheaply.
 */

import { parsePhoneNumberFromString } from 'libphonenumber-js/min';

import type {
  WaflowConfig,
  WaflowCountry,
  WaflowVariant,
} from './types';

export interface WaflowMessageInput {
  variant: WaflowVariant;
  name: string;
  country: WaflowCountry;
  phone: string;
  destinationChoice?: string;
  destFull?: string;
  when?: string;
  pkgTitle?: string;
  pkgDays?: number | null;
  pkgNights?: number | null;
  adults?: number | null;
  children?: number | null;
  notes?: string | null;
  sourceUrl?: string | null;
  ref: string;
}

/**
 * Build the pre-constructed WhatsApp message (one per variant).
 *
 * Keep this text plain: some WhatsApp preview clients render emojis as
 * replacement glyphs, and the customer's phone is already captured in the
 * lead record, so it does not need to be repeated in the outbound message.
 */
export function buildWaflowMessage(input: WaflowMessageInput): string {
  const {
    variant,
    name,
    destinationChoice,
    destFull,
    when,
    pkgTitle,
    pkgDays,
    pkgNights,
    adults,
    children,
    notes,
    sourceUrl,
    ref,
  } = input;

  const lines: Array<string | null> = [];

  if (variant === 'A') {
    lines.push('¡Hola! Quiero planear un viaje por Colombia.');
    lines.push('');
    lines.push(
      destinationChoice && destinationChoice.trim().length > 0
        ? `Destino: ${destinationChoice.trim()}`
        : 'Destino: por definir',
    );
    lines.push(`Cuándo: ${when || 'Flexible'}`);
  } else if (variant === 'B') {
    lines.push(`¡Hola! Quiero planear un viaje a ${destFull || 'Colombia'}.`);
    lines.push('');
    lines.push(`Destino: ${destFull || 'Colombia'}`);
    lines.push(`Cuándo: ${when || 'Flexible'}`);
  } else {
    // variant === 'D'
    lines.push(`¡Hola! Me interesa el paquete "${pkgTitle ?? ''}".`);
    lines.push('');
    const pkgMeta = [
      pkgTitle ?? '',
      pkgDays != null && pkgNights != null ? `${pkgDays}D/${pkgNights}N` : null,
    ]
      .filter((s): s is string => !!s && s.trim().length > 0)
      .join(' · ');
    lines.push(`Paquete: ${pkgMeta}`);
    lines.push(`Cuándo: ${when || 'Flexible'}`);
  }

  if (typeof adults === 'number' && adults > 0) {
    const kids = typeof children === 'number' && children > 0 ? ` + ${children} niños` : '';
    lines.push(`Viajeros: ${adults} adultos${kids}`);
  }
  if (notes && notes.trim().length > 0) {
    lines.push(`Nota: ${notes.trim()}`);
  }
  if (sourceUrl && sourceUrl.trim().length > 0) {
    lines.push(`Origen: ${sourceUrl.trim()}`);
  }
  lines.push('');
  lines.push(`— ${name.trim()}`);
  lines.push('');
  lines.push(`#ref: ${ref}`);

  return lines.filter((line): line is string => line !== null).join('\n');
}

/**
 * Quick-skip message template (used when the user bails out of the wizard
 * but still opens WhatsApp).
 */
export function buildQuickSkipMessage(config: WaflowConfig, ref: string): string {
  if (config.variant === 'A') {
    return `¡Hola! Quiero planear un viaje por Colombia.\n\n#ref: ${ref}`;
  }
  if (config.variant === 'B') {
    return `¡Hola! Quiero planear un viaje a ${config.destination?.name || ''}.\n\n#ref: ${ref}`;
  }
  return `¡Hola! Me interesa el paquete "${config.pkg?.title || ''}".\n\n#ref: ${ref}`;
}

/**
 * Generate a short tracking ref, e.g. `HOME-1205-A7F3`.
 * Accepts an override prefix per variant/context; falls back to "HOME".
 */
export function makeWaflowRef(prefix: string): string {
  const now = new Date();
  const date = `${now.getDate().toString().padStart(2, '0')}${(now.getMonth() + 1)
    .toString()
    .padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const safePrefix = (prefix || 'HOME').toUpperCase().slice(0, 6);
  return `${safePrefix}-${date}-${rand}`;
}

export function validateWaflowPhone(phone: string, country: WaflowCountry): boolean {
  return normalizeWaflowPhone(phone, country) !== null;
}

export function normalizeWaflowPhone(
  phone: string,
  country: WaflowCountry,
): string | null {
  const clean = phone.replace(/\D/g, '');
  if (!clean) return null;
  const parsed = parsePhoneNumberFromString(`${country.code}${clean}`);
  if (!parsed || !parsed.isValid()) return null;
  return parsed.number;
}

/**
 * Build the wa.me URL given a pre-encoded message. The number is expected
 * to be digits-only (no plus sign).
 */
export function buildWaflowUrl(businessNumber: string, message: string): string {
  const digits = businessNumber.replace(/[^0-9]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function resolveRefPrefix(config: WaflowConfig): string {
  if (config.variant === 'A') return 'HOME';
  if (config.variant === 'B')
    return (config.destination?.slug || 'DEST').toUpperCase().slice(0, 6);
  return (config.pkg?.slug || 'PKG').toUpperCase().slice(0, 6);
}
