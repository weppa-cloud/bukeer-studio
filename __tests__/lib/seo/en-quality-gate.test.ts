import { isEnBlogQualityBlocked } from "@/lib/seo/en-quality-gate";

describe("EN quality gate", () => {
  it("blocks audited EN slugs that need restoration or retranslation", () => {
    expect(isEnBlogQualityBlocked("en-US", "boleto-de-avion-a-colombia")).toBe(
      true,
    );
    expect(
      isEnBlogQualityBlocked("en-US", "viajar-por-colombia-en-15-dias"),
    ).toBe(true);
  });

  it("does not block the publishable EN slug or ES locale", () => {
    expect(isEnBlogQualityBlocked("en-US", "asegura-tu-viaje-a-colombia")).toBe(
      false,
    );
    expect(isEnBlogQualityBlocked("es-CO", "boleto-de-avion-a-colombia")).toBe(
      false,
    );
  });
});
