/**
 * verification-batches.ts
 *
 * Central registry of URL batches for post-publish verification.
 * Add new locales/pages here as translations are created.
 */

export interface VerificationTarget {
  url: string;
  locale: string;
  label: string;
}

export const VERIFICATION_BATCHES: Record<string, VerificationTarget[]> = {
  /** Batch 1: P0 money pages (May 2026) */
  batch1: [
    // Cartagena Package
    { url: 'https://colombiatours.travel/de/cartagena-reise', locale: 'de-DE', label: 'Cartagena Package DE' },
    { url: 'https://colombiatours.travel/fr/carthagene',     locale: 'fr-FR', label: 'Cartagena Package FR' },
    { url: 'https://colombiatours.travel/pt/cartagena',      locale: 'pt-BR', label: 'Cartagena Package PT' },
    // Medellin Package
    { url: 'https://colombiatours.travel/de/medellin-reise',  locale: 'de-DE', label: 'Medellin Package DE' },
    { url: 'https://colombiatours.travel/fr/medellin',        locale: 'fr-FR', label: 'Medellin Package FR' },
    { url: 'https://colombiatours.travel/pt/medellin',        locale: 'pt-BR', label: 'Medellin Package PT' },
    // Eje Cafetero
    { url: 'https://colombiatours.travel/de/eje-cafetero-reise', locale: 'de-DE', label: 'Eje Cafetero DE' },
    { url: 'https://colombiatours.travel/fr/eje-cafetero',      locale: 'fr-FR', label: 'Eje Cafetero FR' },
    { url: 'https://colombiatours.travel/pt/eixo-cafeeiro',     locale: 'pt-BR', label: 'Eje Cafetero PT' },
    // Santa Marta
    { url: 'https://colombiatours.travel/de/santa-marta-reise', locale: 'de-DE', label: 'Santa Marta DE' },
    { url: 'https://colombiatours.travel/fr/santa-marta',       locale: 'fr-FR', label: 'Santa Marta FR' },
    { url: 'https://colombiatours.travel/pt/santa-marta',       locale: 'pt-BR', label: 'Santa Marta PT' },
  ],
};
