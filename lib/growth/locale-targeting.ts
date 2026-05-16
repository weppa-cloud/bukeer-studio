import type { GrowthMarket } from "@bukeer/website-contract";

export const CANONICAL_TRANSCREATION_TARGET_LOCALES = [
  "en-US",
  "pt-BR",
  "fr-FR",
  "de-DE",
] as const;

export type CanonicalTranscreationTargetLocale =
  (typeof CANONICAL_TRANSCREATION_TARGET_LOCALES)[number];

const LOCALE_ALIASES: Record<string, string> = {
  en: "en-US",
  "en-us": "en-US",
  en_us: "en-US",
  pt: "pt-BR",
  br: "pt-BR",
  "pt-br": "pt-BR",
  pt_br: "pt-BR",
  fr: "fr-FR",
  "fr-fr": "fr-FR",
  fr_fr: "fr-FR",
  de: "de-DE",
  "de-de": "de-DE",
  de_de: "de-DE",
  es: "es-CO",
  co: "es-CO",
  "es-co": "es-CO",
  es_co: "es-CO",
};

function canonicalCase(value: string): string | null {
  const normalized = value.trim().replace(/_/g, "-");
  if (!normalized) return null;
  const [language, region] = normalized.split("-");
  if (!language || !/^[a-z]{2}$/i.test(language)) return null;
  if (!region) return language.toLowerCase();
  if (!/^[a-z]{2}$/i.test(region)) return null;
  return `${language.toLowerCase()}-${region.toUpperCase()}`;
}

export function normalizeGrowthLocale(
  value: unknown,
  fallback = "es-CO",
): string {
  if (typeof value !== "string") return fallback;
  const key = value.trim().toLowerCase();
  return LOCALE_ALIASES[key] ?? canonicalCase(value) ?? fallback;
}

export function marketForGrowthLocale(locale: unknown): GrowthMarket {
  const canonical = normalizeGrowthLocale(locale);
  if (canonical === "en-US") return "US";
  if (canonical === "pt-BR") return "BR";
  if (canonical === "fr-FR" || canonical === "de-DE") return "EU";
  if (canonical === "es-CO") return "CO";
  return "OTHER";
}

export function localePair(sourceLocale: string, targetLocale: string): string {
  return `${sourceLocale}->${targetLocale}`;
}

export interface TranscreationLocaleScope {
  sourceLocale: string;
  targetLocale: string;
  targetMarket: GrowthMarket;
  localePair: string;
  valid: boolean;
  targetPath: string | null;
}

export function resolveTranscreationLocaleScope(input: {
  sourceLocale?: unknown;
  targetLocale?: unknown;
  fallbackSourceLocale?: string;
  fallbackTargetLocale?: string;
  pageType?: unknown;
  sourceEntityId?: unknown;
  targetPath?: unknown;
}): TranscreationLocaleScope {
  const sourceLocale = normalizeGrowthLocale(
    input.sourceLocale,
    input.fallbackSourceLocale ?? "es-CO",
  );
  const targetLocale = normalizeGrowthLocale(
    input.targetLocale,
    input.fallbackTargetLocale ?? "en-US",
  );
  const pageType =
    typeof input.pageType === "string" && input.pageType.trim()
      ? input.pageType.trim()
      : "page";
  const sourceEntityId =
    typeof input.sourceEntityId === "string" && input.sourceEntityId.trim()
      ? input.sourceEntityId.trim()
      : null;
  const targetPath =
    typeof input.targetPath === "string" && input.targetPath.trim()
      ? input.targetPath.trim()
      : sourceEntityId
        ? `${pageType}:${targetLocale}:${sourceEntityId}`
        : null;

  return {
    sourceLocale,
    targetLocale,
    targetMarket: marketForGrowthLocale(targetLocale),
    localePair: localePair(sourceLocale, targetLocale),
    valid: sourceLocale !== targetLocale,
    targetPath,
  };
}
