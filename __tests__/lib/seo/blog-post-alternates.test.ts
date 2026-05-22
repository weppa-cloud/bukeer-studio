import { buildBlogPostAlternateLanguages } from "@/lib/seo/blog-post-alternates";

describe("blog post alternate languages", () => {
  it("uses locale-specific blog slugs for hreflang and x-default", () => {
    expect(
      buildBlogPostAlternateLanguages("https://colombiatours.travel", "es-CO", [
        {
          locale: "es-CO",
          slug: "los-10-mejores-destinos-para-conocer-colombia",
        },
        {
          locale: "en-US",
          slug: "best-places-to-visit-in-colombia",
        },
        {
          locale: "fr-FR",
          slug: "meilleurs-endroits-a-visiter-en-colombie",
        },
        {
          locale: "de-DE",
          slug: "10-schoenste-reiseziele-kolumbiens",
        },
        {
          locale: "pt-BR",
          slug: "melhores-destinos-para-conhecer-na-colombia",
        },
      ]),
    ).toEqual({
      "es-CO":
        "https://colombiatours.travel/blog/los-10-mejores-destinos-para-conocer-colombia",
      "en-US":
        "https://colombiatours.travel/en/blog/best-places-to-visit-in-colombia",
      "fr-FR":
        "https://colombiatours.travel/fr/blog/meilleurs-endroits-a-visiter-en-colombie",
      "de-DE":
        "https://colombiatours.travel/de/blog/10-schoenste-reiseziele-kolumbiens",
      "pt-BR":
        "https://colombiatours.travel/pt-br/blog/melhores-destinos-para-conhecer-na-colombia",
      "x-default":
        "https://colombiatours.travel/blog/los-10-mejores-destinos-para-conocer-colombia",
    });
  });

  it("skips empty route rows and only emits x-default when the default route exists", () => {
    expect(
      buildBlogPostAlternateLanguages("https://colombiatours.travel", "es-CO", [
        { locale: "pt-BR", slug: "melhores-destinos" },
        { locale: "es-CO", slug: "" },
        { locale: null, slug: "missing-locale" },
      ]),
    ).toEqual({
      "pt-BR": "https://colombiatours.travel/pt-br/blog/melhores-destinos",
    });
  });
});
