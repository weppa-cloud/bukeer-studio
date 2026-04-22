/**
 * editorial-v1 WhatsApp Flow — Shared types.
 *
 * Port of designer data shapes from
 *   themes/references/claude design 1/project/waflow.jsx
 *
 * The editorial flow runs three variants (A/B/D) through a single state
 * machine; variant-specific context (destination or package) is carried on
 * the `config` object and drives which chips/headings/messages render.
 */

import {
  getCountries,
  getCountryCallingCode,
  type CountryCode,
} from 'libphonenumber-js/min';

export type WaflowVariant = 'A' | 'B' | 'D';

export type WaflowStep =
  | 'intent'
  | 'dates'
  | 'party'
  | 'interests'
  | 'country'
  | 'contact'
  | 'confirmation';

export interface WaflowCountry {
  c: CountryCode;
  name: string;
  code: string;
  flag: string;
}

export interface WaflowDestinationContext {
  /** Canonical destination slug, e.g. "cartagena". */
  slug: string;
  /** Display name, e.g. "Cartagena". */
  name: string;
  /** Optional region line shown in the context pill, e.g. "Caribe colombiano". */
  region?: string;
  /** Optional hero image for the drawer header (next/image fill). */
  heroImageUrl?: string | null;
}

export interface WaflowPackageContext {
  /** Package slug (route segment). */
  slug: string;
  /** Display title. */
  title: string;
  /** Day count (for pill + message template). */
  days?: number | null;
  nights?: number | null;
  /** Currency symbol rendered in pill, e.g. "$". */
  currency?: string | null;
  /** Numeric price rendered in pill (formatted with toLocaleString). */
  price?: number | null;
  /** Pre-selected pricing tier label. */
  tier?: string | null;
  /** Optional hero image for the drawer header. */
  heroImageUrl?: string | null;
  /** Optional destination slug used to pick the interest chip set. */
  destinationSlug?: string | null;
}

export interface WaflowConfig {
  variant: WaflowVariant;
  destination?: WaflowDestinationContext;
  pkg?: WaflowPackageContext;
}

/**
 * Full wizard state captured between steps and persisted to localStorage.
 */
export interface WaflowState {
  /** Session key used to upsert partial leads server-side. */
  sessionKey: string;
  variant: WaflowVariant;
  step: WaflowStep;
  name: string;
  phone: string;
  email: string;
  countryCode: string;
  destinationChoice: string;
  when: string;
  adults: number;
  children: number;
  interests: string[];
  adjust: string[];
  notes: string;
  referenceCode?: string | null;
  whatsappUrl?: string | null;
  whatsappMessage?: string | null;
}

export type WaflowPrefill = Partial<
  Pick<WaflowState, 'destinationChoice' | 'when' | 'adults' | 'children' | 'notes'>
>;

export interface WaflowOpenHandlers {
  openVariantA: () => void;
  openVariantB: (ctx: WaflowDestinationContext, prefill?: WaflowPrefill) => void;
  openVariantD: (ctx: WaflowPackageContext, prefill?: WaflowPrefill) => void;
  close: () => void;
}

export interface WaflowContextValue extends WaflowOpenHandlers {
  isOpen: boolean;
  config: WaflowConfig | null;
  /** Business phone number (wa.me target). */
  businessNumber: string;
  /** Avg response-time label, e.g. "3 min". */
  responseTime: string;
}

export const WAFLOW_WHEN_OPTIONS = [
  'Este mes',
  'Próximo mes',
  'En 2–3 meses',
  'En 6 meses',
  'Fin de año',
  'Flexible',
] as const;

export const WAFLOW_BASE_INTERESTS = [
  'Relax',
  'Aventura',
  'Cultura',
  'Gastronomía',
  'Naturaleza',
  'Familiar',
] as const;

/**
 * Per-destination interest chip overrides. Keyed by destination slug
 * (matches {@link WaflowDestinationContext.slug}). Fallback when the slug
 * is missing from the map: {@link WAFLOW_BASE_INTERESTS}.
 */
export const WAFLOW_DEST_INTERESTS: Record<string, readonly string[]> = {
  cartagena: ['Relax', 'Playa', 'Historia', 'Gastronomía', 'Vida nocturna', 'Familiar'],
  'san-andres': ['Playa', 'Buceo', 'Relax', 'Familiar', 'Gastronomía', 'Aventura'],
  'eje-cafetero': [
    'Naturaleza',
    'Aventura',
    'Café',
    'Cultura',
    'Avistamiento',
    'Familiar',
  ],
  tayrona: ['Aventura', 'Playa', 'Naturaleza', 'Senderismo', 'Cultura', 'Relax'],
  medellin: [
    'Cultura',
    'Gastronomía',
    'Vida nocturna',
    'Arte urbano',
    'Naturaleza',
    'Familiar',
  ],
  guatape: ['Naturaleza', 'Aventura', 'Relax', 'Familiar', 'Cultura', 'Gastronomía'],
  desierto: ['Aventura', 'Cultura', 'Naturaleza', 'Off-grid', 'Etnoturismo', 'Familiar'],
  amazonas: [
    'Naturaleza',
    'Aventura',
    'Etnoturismo',
    'Avistamiento',
    'Cultura',
    'Familiar',
  ],
};

export const WAFLOW_PKG_ADJUST = [
  'Está perfecto así',
  'Agregar días',
  'Cambiar hotel',
  'Agregar actividades',
  'Cambiar fechas',
] as const;

function countryFlag(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

function countryName(code: CountryCode): string {
  if (typeof Intl === 'undefined' || typeof Intl.DisplayNames === 'undefined') {
    return code;
  }
  const display = new Intl.DisplayNames(['es'], { type: 'region' });
  return display.of(code) ?? code;
}

export const WAFLOW_COUNTRIES: WaflowCountry[] = getCountries()
  .map((code) => ({
    c: code,
    name: countryName(code),
    code: `+${getCountryCallingCode(code)}`,
    flag: countryFlag(code),
  }))
  .sort((a, b) => {
    if (a.c === 'CO') return -1;
    if (b.c === 'CO') return 1;
    return a.name.localeCompare(b.name, 'es');
  });

/** Wizard step order per variant. Confirmation always terminates. */
export const WAFLOW_STEP_ORDER: Record<WaflowVariant, WaflowStep[]> = {
  A: ['contact', 'confirmation'],
  B: ['contact', 'confirmation'],
  D: ['contact', 'confirmation'],
};

/** localStorage key factory. Keyed by a session uuid so parallel tabs don't collide. */
export const WAFLOW_STORAGE_PREFIX = 'waflow:v1:';
