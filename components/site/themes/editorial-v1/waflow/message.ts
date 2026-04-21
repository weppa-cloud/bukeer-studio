/**
 * editorial-v1 WhatsApp Flow — Pure helpers.
 *
 * Port of `buildWAMessage`, `makeRef`, `validatePhone` from
 *   themes/references/claude design 1/project/waflow.jsx
 *
 * Kept as a standalone module (no React/DOM deps) so it can be imported by
 * server code (the /api/waflow/lead route) and unit-tested cheaply.
 */

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
  adults: number;
  children: number;
  interests: string[];
  adjust?: string[];
  pkgTitle?: string;
  pkgDays?: number | null;
  pkgNights?: number | null;
  ref: string;
}

/**
 * Build the pre-constructed WhatsApp message (one per variant). Kept
 * byte-identical to the designer prototype so operators recognise the
 * shape.
 */
export function buildWaflowMessage(input: WaflowMessageInput): string {
  const {
    variant,
    name,
    destinationChoice,
    destFull,
    when,
    adults,
    children,
    interests,
    adjust,
    pkgTitle,
    pkgDays,
    pkgNights,
    ref,
  } = input;

  const paxStr =
    children > 0
      ? `${adults} adulto${adults !== 1 ? 's' : ''} + ${children} niño${children !== 1 ? 's' : ''}`
      : `${adults} adulto${adults !== 1 ? 's' : ''}`;

  const lines: Array<string | null> = [];

  if (variant === 'A') {
    lines.push('¡Hola! Quiero planear un viaje por Colombia 👋');
    lines.push('');
    lines.push(
      destinationChoice && destinationChoice.trim().length > 0
        ? `📍 Destino: ${destinationChoice.trim()}`
        : '📍 Destino: por definir',
    );
    lines.push(`📅 Cuándo: ${when || 'Flexible'}`);
    lines.push(`👥 Viajeros: ${paxStr}`);
    if (interests.length > 0) {
      lines.push(`✨ Intereses: ${interests.join(', ')}`);
    }
  } else if (variant === 'B') {
    lines.push(`¡Hola! Quiero planear un viaje a ${destFull || 'Colombia'} 👋`);
    lines.push('');
    lines.push(`📍 Destino: ${destFull || 'Colombia'}`);
    lines.push(`📅 Cuándo: ${when || 'Flexible'}`);
    lines.push(`👥 Viajeros: ${paxStr}`);
    if (interests.length > 0) {
      lines.push(`✨ Me interesa: ${interests.join(', ')}`);
    }
  } else {
    // variant === 'D'
    lines.push(`¡Hola! Me interesa el paquete "${pkgTitle ?? ''}" 👋`);
    lines.push('');
    const pkgMeta = [
      pkgTitle ?? '',
      pkgDays != null && pkgNights != null ? `${pkgDays}D/${pkgNights}N` : null,
    ]
      .filter((s): s is string => !!s && s.trim().length > 0)
      .join(' · ');
    lines.push(`📦 Paquete: ${pkgMeta}`);
    lines.push(`📅 Cuándo: ${when || 'Flexible'}`);
    lines.push(`👥 Viajeros: ${paxStr}`);
    if (adjust && adjust.length > 0) {
      lines.push(`🛠️ Ajustes: ${adjust.join(', ')}`);
    }
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
    return `¡Hola! Quiero planear un viaje por Colombia 👋\n\n#ref: ${ref}`;
  }
  if (config.variant === 'B') {
    return `¡Hola! Quiero planear un viaje a ${config.destination?.name || ''} 👋\n\n#ref: ${ref}`;
  }
  return `¡Hola! Me interesa el paquete "${config.pkg?.title || ''}" 👋\n\n#ref: ${ref}`;
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
  const clean = phone.replace(/\D/g, '');
  return clean.length === country.len;
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
