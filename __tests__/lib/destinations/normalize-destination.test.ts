import {
  canonicalDestinationSlug,
  destinationSlugNeedsCanonicalRedirect,
  findDestinationByCanonicalSlug,
  isDestinationAlias,
  normalizeDestinationName,
} from "@/lib/destinations/normalize-destination";

describe("destination normalization", () => {
  it.each([
    ["Villa de Leyva", "villa-de-leyva"],
    ["Villa de Leiva", "villa-de-leyva"],
    ["villa-de-leiva", "villa-de-leyva"],
    ["villa leyva", "villa-de-leyva"],
    [" VILLA   DE   LEÍVA ", "villa-de-leyva"],
  ])("canonicalizes %s to %s", (input, expected) => {
    expect(canonicalDestinationSlug(input)).toBe(expected);
  });

  it("normalizes accents, punctuation, and spaces", () => {
    expect(normalizeDestinationName("  San Andrés & Providencia!! ")).toBe(
      "san andres and providencia",
    );
  });

  it("keeps unrelated destination slugs stable", () => {
    expect(canonicalDestinationSlug("cartagena-de-indias")).toBe(
      "cartagena-de-indias",
    );
    expect(canonicalDestinationSlug("Tour a la Villa de Whistler")).toBe(
      "tour-a-la-villa-de-whistler",
    );
  });

  it("matches typo aliases against canonical destination slugs", () => {
    expect(isDestinationAlias("villa-de-leiva", "villa-de-leyva")).toBe(true);
    expect(isDestinationAlias("Villa de Leiva", "villa-de-leyva")).toBe(true);
    expect(isDestinationAlias("cartagena", "villa-de-leyva")).toBe(false);
  });

  it("finds destination rows using canonical slug comparison", () => {
    const destinations = [
      { slug: "cartagena", name: "Cartagena" },
      { slug: "villa-de-leyva", name: "Villa de Leyva" },
    ];

    expect(findDestinationByCanonicalSlug(destinations, "villa-de-leiva"))
      .toEqual({ slug: "villa-de-leyva", name: "Villa de Leyva" });
  });

  it("flags typo aliases for redirect to the canonical slug", () => {
    expect(
      destinationSlugNeedsCanonicalRedirect("villa-de-leiva", "villa-de-leyva"),
    ).toBe(true);
    expect(
      destinationSlugNeedsCanonicalRedirect("villa-de-leyva", "villa-de-leyva"),
    ).toBe(false);
  });
});
