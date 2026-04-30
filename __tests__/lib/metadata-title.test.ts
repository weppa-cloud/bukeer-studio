import { normalizePublicMetadataTitle } from "@/lib/seo/metadata-title";

describe("normalizePublicMetadataTitle", () => {
  it("keeps title plus layout brand suffix within the crawler threshold", () => {
    const siteName = "ColombiaTours.Travel";
    const normalized = normalizePublicMetadataTitle(
      "5 Aerolineas para viajar a Colombia desde Mexico",
      siteName,
    );
    const renderedTitle = `${normalized} | ${siteName}`;

    expect(renderedTitle.length).toBeLessThanOrEqual(60);
    expect(renderedTitle).toBe(
      "5 Aerolineas para viajar a Colombia | ColombiaTours.Travel",
    );
  });

  it("strips an existing trailing brand before reserving suffix space", () => {
    const siteName = "ColombiaTours.Travel";
    const normalized = normalizePublicMetadataTitle(
      "Hoteles en San Andres Colombia para viajar | ColombiaTours.Travel",
      siteName,
    );

    expect(normalized).toBe("Hoteles en San Andres Colombia para");
  });
});
