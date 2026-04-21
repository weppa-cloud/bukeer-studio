/**
 * editorial-v1 — Full Package detail page (standalone replacement).
 *
 * This variant no longer wraps the generic ProductLandingPage body. Instead it
 * renders a dedicated editorial layout and re-emits SEO JSON-LD
 * (ProductSchema + OrganizationSchema + FAQ schema) for parity.
 */

import type { ReactNode } from 'react';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { ProductData, ProductFAQ } from '@bukeer/website-contract';
import { ProductSchema } from '@/components/seo/product-schema';
import { OrganizationSchema } from '@/components/seo/organization-schema';
import { PACKAGE_FAQS_DEFAULT } from '@/lib/products/package-faqs-default';
import { EditorialPackageDetailClient } from './package-detail.client';

interface GoogleReviewProp {
  author_name: string;
  author_photo: string | null;
  rating: number;
  text: string;
  relative_time: string | null;
  images: Array<{ url: string; thumbnail?: string }>;
  response: { text: string; date: string } | null;
}

export interface EditorialPackageDetailPayload {
  product: ProductData;
  basePath: string;
  displayName: string;
  displayLocation: string | null;
  resolvedLocale: string;
  googleReviews: GoogleReviewProp[];
  similarProducts: ProductData[];
  faqs?: ProductFAQ[] | null;
}

interface EditorialPackageDetailProps {
  website: WebsiteData;
  payload?: unknown;
  children?: ReactNode;
}

function buildWebsiteUrl(website: WebsiteData, basePath: string): string | undefined {
  if (website.custom_domain) {
    return `https://${website.custom_domain}${basePath}`;
  }
  if (website.subdomain) {
    return `https://${website.subdomain}.bukeer.com${basePath}`;
  }
  return undefined;
}

export function EditorialPackageDetail({
  website,
  payload,
  children,
}: EditorialPackageDetailProps) {
  const resolvedPayload = payload as EditorialPackageDetailPayload | undefined;
  if (!resolvedPayload || !resolvedPayload.product) {
    return <>{children}</>;
  }

  const faqSource = Array.isArray(resolvedPayload.faqs) && resolvedPayload.faqs.length > 0
    ? resolvedPayload.faqs
    : PACKAGE_FAQS_DEFAULT;
  const websiteUrl = buildWebsiteUrl(website, resolvedPayload.basePath);

  return (
    <div
      data-template-set="editorial-v1"
      data-editorial-variant="package-detail"
      className="editorial-package-detail"
    >
      <ProductSchema
        product={resolvedPayload.product}
        productType="package"
        websiteUrl={websiteUrl}
        language={resolvedPayload.resolvedLocale}
        faqs={faqSource}
      />
      <OrganizationSchema website={website} websiteUrl={websiteUrl} />

      <EditorialPackageDetailClient
        website={website}
        basePath={resolvedPayload.basePath}
        product={resolvedPayload.product}
        displayName={resolvedPayload.displayName}
        displayLocation={resolvedPayload.displayLocation}
        resolvedLocale={resolvedPayload.resolvedLocale || 'es-CO'}
        googleReviews={Array.isArray(resolvedPayload.googleReviews) ? resolvedPayload.googleReviews : []}
        similarProducts={Array.isArray(resolvedPayload.similarProducts) ? resolvedPayload.similarProducts : []}
        faqs={faqSource}
      />
    </div>
  );
}
