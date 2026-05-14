const VILLA_DE_LEYVA_CANONICAL_SLUG = "villa-de-leyva";

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeDestinationName(value: string): string {
  return stripDiacritics(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function isVillaDeLeyvaVariant(normalized: string): boolean {
  const words = normalized.split(" ").filter(Boolean);
  if (!words.includes("villa")) return false;
  return words.includes("leyva") || words.includes("leiva");
}

export function canonicalDestinationSlug(value: string): string {
  const normalized = normalizeDestinationName(value);
  if (!normalized) return "";

  if (isVillaDeLeyvaVariant(normalized)) {
    return VILLA_DE_LEYVA_CANONICAL_SLUG;
  }

  return normalized.replace(/\s+/g, "-");
}

export function isDestinationAlias(input: string, canonicalSlug: string): boolean {
  const inputCanonical = canonicalDestinationSlug(input);
  const expectedCanonical = canonicalDestinationSlug(canonicalSlug);

  return Boolean(inputCanonical) && inputCanonical === expectedCanonical;
}

export function findDestinationByCanonicalSlug<T extends { slug: string }>(
  destinations: T[],
  slug: string,
): T | undefined {
  const requestedSlug = canonicalDestinationSlug(slug);

  return destinations.find(
    (destination) => canonicalDestinationSlug(destination.slug) === requestedSlug,
  );
}

export function destinationSlugNeedsCanonicalRedirect(
  requestedSlug: string,
  destinationSlug: string,
): boolean {
  const canonicalRequested = canonicalDestinationSlug(requestedSlug);
  const canonicalDestination = canonicalDestinationSlug(destinationSlug);

  return (
    Boolean(canonicalRequested) &&
    canonicalRequested === canonicalDestination &&
    requestedSlug !== canonicalDestination
  );
}
