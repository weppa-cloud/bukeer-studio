import {
  LocaleAdaptationOutputSchema,
  type LocaleAdaptationOutput,
} from '@/lib/ai/prompts/locale-adaptation';

export function inferLocaleParts(locale: string): { country: string; language: string; label: string } {
  const [langRaw, regionRaw] = locale.split('-');
  const language = (langRaw || locale || 'es').toLowerCase();
  const region = (regionRaw || '').toUpperCase();

  const countryByRegion: Record<string, string> = {
    US: 'United States',
    CO: 'Colombia',
    MX: 'Mexico',
    ES: 'Spain',
    AR: 'Argentina',
    CL: 'Chile',
    PE: 'Peru',
    BR: 'Brazil',
    PT: 'Portugal',
    FR: 'France',
    DE: 'Germany',
    IT: 'Italy',
    GB: 'United Kingdom',
    CA: 'Canada',
  };

  const fallbackByLanguage: Record<string, { country: string }> = {
    es: { country: 'Colombia' },
    en: { country: 'United States' },
    pt: { country: 'Brazil' },
    fr: { country: 'France' },
    de: { country: 'Germany' },
    it: { country: 'Italy' },
  };

  const country =
    (region && countryByRegion[region]) ||
    fallbackByLanguage[language]?.country ||
    'United States';

  return { country, language, label: locale };
}

export function parseLocaleAdaptationCompletion(text: string): LocaleAdaptationOutput | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const parseCandidate = (candidate: string): LocaleAdaptationOutput | null => {
    try {
      const parsedJson = JSON.parse(candidate);
      const validated = LocaleAdaptationOutputSchema.safeParse(parsedJson);
      return validated.success ? validated.data : null;
    } catch {
      return null;
    }
  };

  const direct = parseCandidate(trimmed);
  if (direct) return direct;

  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    const extracted = parseCandidate(trimmed.slice(start, end + 1));
    if (extracted) return extracted;
  }

  return null;
}
