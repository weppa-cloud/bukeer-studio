/**
 * Normalize a place name into a stable cache key.
 * - NFD-normalizes to strip diacritics
 * - lowercases
 * - trims
 * - collapses internal whitespace to a single space
 *
 * SPEC #164 — Activity circuit maps.
 */
export function normalizePlaceName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
