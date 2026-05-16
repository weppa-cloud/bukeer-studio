import {
  localePair,
  marketForGrowthLocale,
  normalizeGrowthLocale,
  resolveTranscreationLocaleScope,
} from "@/lib/growth/locale-targeting";

describe("growth locale targeting", () => {
  it("normalizes canonical transcreation locales and target markets", () => {
    expect(normalizeGrowthLocale("pt_br")).toBe("pt-BR");
    expect(normalizeGrowthLocale("fr")).toBe("fr-FR");
    expect(normalizeGrowthLocale("de-de")).toBe("de-DE");
    expect(normalizeGrowthLocale("en")).toBe("en-US");
    expect(marketForGrowthLocale("pt-BR")).toBe("BR");
    expect(marketForGrowthLocale("fr-FR")).toBe("EU");
  });

  it("builds an explicit source to target locale contract", () => {
    const scope = resolveTranscreationLocaleScope({
      sourceLocale: "es_CO",
      targetLocale: "pt",
      pageType: "blog",
      sourceEntityId: "post-1",
    });

    expect(scope).toMatchObject({
      sourceLocale: "es-CO",
      targetLocale: "pt-BR",
      targetMarket: "BR",
      localePair: localePair("es-CO", "pt-BR"),
      valid: true,
      targetPath: "blog:pt-BR:post-1",
    });
  });
});
