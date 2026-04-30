/**
 * Epic #310 EN quality gate.
 *
 * These slugs were manually audited on 2026-04-30 in
 * `docs/growth-sessions/2026-04-30-en-quality-gate-results.md`.
 * They can render for human restoration/review, but must not be indexable
 * until the EN content is restored or retranslated and the gate is rerun.
 */

const NON_INDEXABLE_EN_BLOG_SLUGS = new Set([
  "boleto-de-avion-a-colombia",
  "colombia-de-los-mejores-paises-para-viajar",
  "descubriendo-san-andres-isla-un-paraiso",
  "explora-viajes-cartagena-las-mejores-ofertas",
  "explorando-colombia-armenia-quindio",
  "la-comuna-13-en-medellin",
  "las-50-mejores-frases-de-viajes-para-encender",
  "playas-colombianas",
  "rodrigo-de-bastidas-un-viaje-a-los-origenes",
  "san-jose-del-guaviare",
  "viajando-con-agencias-de-viajes",
  "viajar-por-colombia-en-15-dias",
]);

export function isEnBlogQualityBlocked(locale: string, slug: string): boolean {
  return (
    locale.toLowerCase().startsWith("en") &&
    NON_INDEXABLE_EN_BLOG_SLUGS.has(slug)
  );
}
