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
  c: string;
  name: string;
  code: string;
  flag: string;
  len: number;
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

export interface WaflowOpenHandlers {
  openVariantA: () => void;
  openVariantB: (ctx: WaflowDestinationContext) => void;
  openVariantD: (ctx: WaflowPackageContext) => void;
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

export const WAFLOW_COUNTRIES: WaflowCountry[] = [
  { c: 'CO', name: 'Colombia', code: '+57', flag: '🇨🇴', len: 10 },
  { c: 'US', name: 'Estados Unidos', code: '+1', flag: '🇺🇸', len: 10 },
  { c: 'MX', name: 'México', code: '+52', flag: '🇲🇽', len: 10 },
  { c: 'ES', name: 'España', code: '+34', flag: '🇪🇸', len: 9 },
  { c: 'FR', name: 'Francia', code: '+33', flag: '🇫🇷', len: 9 },
  { c: 'DE', name: 'Alemania', code: '+49', flag: '🇩🇪', len: 11 },
  { c: 'AR', name: 'Argentina', code: '+54', flag: '🇦🇷', len: 10 },
  { c: 'CL', name: 'Chile', code: '+56', flag: '🇨🇱', len: 9 },
  { c: 'PE', name: 'Perú', code: '+51', flag: '🇵🇪', len: 9 },
  { c: 'BR', name: 'Brasil', code: '+55', flag: '🇧🇷', len: 11 },
  { c: 'CA', name: 'Canadá', code: '+1', flag: '🇨🇦', len: 10 },
  { c: 'GB', name: 'Reino Unido', code: '+44', flag: '🇬🇧', len: 10 },
  { c: 'IT', name: 'Italia', code: '+39', flag: '🇮🇹', len: 10 },
];

/** Wizard step order per variant. Confirmation always terminates. */
export const WAFLOW_STEP_ORDER: Record<WaflowVariant, WaflowStep[]> = {
  A: ['intent', 'dates', 'party', 'interests', 'country', 'contact', 'confirmation'],
  B: ['dates', 'party', 'interests', 'country', 'contact', 'confirmation'],
  D: ['dates', 'party', 'country', 'contact', 'confirmation'],
};

/** localStorage key factory. Keyed by a session uuid so parallel tabs don't collide. */
export const WAFLOW_STORAGE_PREFIX = 'waflow:v1:';
