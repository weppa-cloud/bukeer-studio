import React from "react";

const mockNotFound = jest.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
const mockPermanentRedirect = jest.fn((url: string) => {
  throw new Error(`NEXT_PERMANENT_REDIRECT:${url}`);
});
const mockRedirect = jest.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});

const mockGetWebsiteBySubdomain = jest.fn();
const mockGetProductPage = jest.fn();
const mockGetPageBySlug = jest.fn();
const mockGetProductSlugRedirect = jest.fn();
const mockGetDestinations = jest.fn();
const mockResolvePublicMetadataLocale = jest.fn(async () => ({
  resolvedLocale: "es-CO",
  defaultLocale: "es-CO",
  resolvedLanguage: "es",
  localizedPathname: "/paquetes/cartagena-medellin",
}));
const mockStaticPage = jest.fn((props: unknown) =>
  React.createElement("div", { "data-testid": "static-page", props }),
);

jest.mock("next/navigation", () => ({
  notFound: () => mockNotFound(),
  permanentRedirect: (url: string) => mockPermanentRedirect(url),
  redirect: (url: string) => mockRedirect(url),
}));

jest.mock("@/components/pages/product-landing-page", () => ({
  ProductLandingPage: () =>
    React.createElement("div", { "data-testid": "product-page" }),
}));

jest.mock("@/components/pages/static-page", () => ({
  StaticPage: (props: unknown) => mockStaticPage(props),
}));

jest.mock("@/components/site/themes/editorial-v1/template-slot", () => ({
  TemplateSlot: () =>
    React.createElement("div", { "data-testid": "template-slot" }),
}));

jest.mock("@/lib/supabase/get-website", () => ({
  getWebsiteBySubdomain: (...args: unknown[]) =>
    mockGetWebsiteBySubdomain(...args),
}));

jest.mock("@/lib/supabase/get-pages", () => ({
  getCategoryProducts: jest.fn(async () => ({ items: [], total: 0 })),
  getDestinations: (...args: unknown[]) => mockGetDestinations(...args),
  getLocalizedProductOverlay: jest.fn(),
  getPageBySlug: (...args: unknown[]) => mockGetPageBySlug(...args),
  getProductPage: (...args: unknown[]) => mockGetProductPage(...args),
  getProductSlugRedirect: (...args: unknown[]) =>
    mockGetProductSlugRedirect(...args),
}));

jest.mock("@/lib/supabase/get-reviews", () => ({
  getReviewsForContext: jest.fn(async () => []),
}));

jest.mock("@/lib/supabase/get-planners", () => ({
  getPlanners: jest.fn(async () => []),
}));

jest.mock("@/lib/seo/public-metadata", () => ({
  buildLocaleAwareAlternateLanguages: (baseUrl: string, pathname: string) => ({
    "es-CO": `${baseUrl}${pathname}`,
  }),
  resolvePublicMetadataLocale: (...args: unknown[]) =>
    mockResolvePublicMetadataLocale(...args),
}));

jest.mock("@/lib/seo/locale-routing", () => ({
  buildPublicLocalizedPath: (pathname: string) => pathname,
  localeToOgLocale: () => "es_CO",
  translateCategoryPathname: (pathname: string) => pathname,
}));

jest.mock("@/lib/seo/og-helpers", () => ({
  resolveOgImage: (_website: unknown, image: string | null) => image,
}));

import PackageSlugPage, {
  generateMetadata as generatePackageMetadata,
} from "@/app/site/[subdomain]/paquetes/[slug]/page";
import ActivitySlugPage, {
  generateMetadata as generateActivityMetadata,
} from "@/app/site/[subdomain]/actividades/[slug]/page";

const website = {
  id: "web-colombiatours",
  account_id: "acct-colombiatours",
  subdomain: "colombiatours",
  custom_domain: "colombiatours.travel",
  status: "published",
  content: {
    siteName: "Colombia Tours Travel",
    account: { name: "Colombia Tours Travel" },
  },
  featured_products: {
    destinations: [],
    hotels: [],
    activities: [],
    transfers: [],
    packages: [],
  },
  sections: [],
};

function makePublishedLanding(slug: string) {
  return {
    id: `page-${slug}`,
    slug,
    title: "Cartagena Medellin",
    seo_title: "Cartagena Medellin | Colombia Tours Travel",
    seo_description:
      "Itinerario personalizado para viajar por Colombia con soporte local, asesoría experta y acompañamiento durante la reserva.",
    is_published: true,
    robots_noindex: false,
    hero_config: { backgroundImage: "https://cdn.example/hero.jpg" },
    custom_sections: [],
    sections_order: [],
    hidden_sections: [],
  };
}

describe("product static landing fallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetWebsiteBySubdomain.mockResolvedValue(website);
    mockGetProductPage.mockResolvedValue(null);
    mockGetProductSlugRedirect.mockResolvedValue(null);
    mockGetDestinations.mockResolvedValue([]);
    mockResolvePublicMetadataLocale.mockResolvedValue({
      resolvedLocale: "es-CO",
      defaultLocale: "es-CO",
      resolvedLanguage: "es",
      localizedPathname: "/paquetes/cartagena-medellin",
    });
  });

  it("serves a published package landing as indexable metadata when the product RPC misses", async () => {
    mockGetPageBySlug.mockResolvedValue(
      makePublishedLanding("paquetes/cartagena-medellin"),
    );

    const metadata = await generatePackageMetadata({
      params: Promise.resolve({
        subdomain: "colombiatours",
        slug: "cartagena-medellin",
      }),
    });
    const element = await PackageSlugPage({
      params: Promise.resolve({
        subdomain: "colombiatours",
        slug: "cartagena-medellin",
      }),
    });

    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates?.canonical).toBe(
      "https://colombiatours.travel/paquetes/cartagena-medellin",
    );
    expect(mockGetPageBySlug).toHaveBeenCalledWith(
      "colombiatours",
      "paquetes/cartagena-medellin",
    );
    expect(mockNotFound).not.toHaveBeenCalled();
    expect(React.isValidElement(element)).toBe(true);
    expect(element.props).toEqual(
      expect.objectContaining({
        page: expect.objectContaining({
          slug: "paquetes/cartagena-medellin",
          is_published: true,
        }),
      }),
    );
  });

  it("serves a localized package landing from its DB slug without preserving the locale prefix", async () => {
    mockResolvePublicMetadataLocale.mockResolvedValue({
      resolvedLocale: "en-US",
      defaultLocale: "es-CO",
      resolvedLanguage: "en",
      localizedPathname: "/en/packages/cartagena-medellin",
    });
    mockGetPageBySlug.mockResolvedValue(
      makePublishedLanding("packages/cartagena-medellin"),
    );

    const metadata = await generatePackageMetadata({
      params: Promise.resolve({
        subdomain: "colombiatours",
        slug: "cartagena-medellin",
      }),
    });
    const element = await PackageSlugPage({
      params: Promise.resolve({
        subdomain: "colombiatours",
        slug: "cartagena-medellin",
      }),
    });

    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates?.canonical).toBe(
      "https://colombiatours.travel/en/packages/cartagena-medellin",
    );
    expect(mockGetPageBySlug).toHaveBeenCalledWith(
      "web-colombiatours",
      "packages/cartagena-medellin",
      "en-US",
    );
    expect(mockGetPageBySlug).not.toHaveBeenCalledWith(
      "web-colombiatours",
      "en/packages/cartagena-medellin",
      "en-US",
    );
    expect(mockNotFound).not.toHaveBeenCalled();
    expect(React.isValidElement(element)).toBe(true);
  });

  it("serves a published activity landing as indexable metadata when the product RPC misses", async () => {
    mockGetPageBySlug.mockResolvedValue(
      makePublishedLanding("actividades/city-tour-cartagena"),
    );

    const metadata = await generateActivityMetadata({
      params: Promise.resolve({
        subdomain: "colombiatours",
        slug: "city-tour-cartagena",
      }),
    });
    const element = await ActivitySlugPage({
      params: Promise.resolve({
        subdomain: "colombiatours",
        slug: "city-tour-cartagena",
      }),
    });

    expect(metadata.robots).toBeUndefined();
    expect(metadata.alternates?.canonical).toBe(
      "https://colombiatours.travel/actividades/city-tour-cartagena",
    );
    expect(mockGetPageBySlug).toHaveBeenCalledWith(
      "colombiatours",
      "actividades/city-tour-cartagena",
    );
    expect(mockNotFound).not.toHaveBeenCalled();
    expect(React.isValidElement(element)).toBe(true);
    expect(element.props).toEqual(
      expect.objectContaining({
        page: expect.objectContaining({
          slug: "actividades/city-tour-cartagena",
          is_published: true,
        }),
      }),
    );
  });
});
