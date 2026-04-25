/**
 * editorial-v1 — Full Activity detail page (standalone replacement).
 *
 * This variant no longer wraps the generic ProductLandingPage body. Instead it
 * renders a dedicated editorial detail layout and re-emits SEO JSON-LD
 * (ProductSchema + OrganizationSchema + FAQ schema) for parity.
 */

import type { ReactNode } from 'react';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { ProductData, ProductFAQ } from '@bukeer/website-contract';
import type { ActivityCircuitStop } from '@/lib/products/activity-circuit';
import { ProductSchema } from '@/components/seo/product-schema';
import { OrganizationSchema } from '@/components/seo/organization-schema';
import { ACTIVITY_FAQS_DEFAULT } from '@/lib/products/activity-faqs-default';
import { EditorialActivityDetailClient } from './activity-detail.client';

interface GoogleReviewProp {
  author_name: string;
  author_photo: string | null;
  rating: number;
  text: string;
  relative_time: string | null;
  images: Array<{ url: string; thumbnail?: string }>;
  response: { text: string; date: string } | null;
}

export interface EditorialActivityDetailPayload {
  product: ProductData;
  basePath: string;
  displayName: string;
  displayLocation: string | null;
  resolvedLocale: string;
  googleReviews: GoogleReviewProp[];
  similarProducts: ProductData[];
  activityCircuitStops: ActivityCircuitStop[];
  faqs?: ProductFAQ[] | null;
}

interface EditorialActivityDetailProps {
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

function buildPageUrl(websiteUrl: string | undefined, product: ProductData): string | undefined {
  if (!websiteUrl || !product.slug) return websiteUrl;
  return `${websiteUrl}/actividades/${product.slug}`;
}

export function EditorialActivityDetail({
  website,
  payload,
  children,
}: EditorialActivityDetailProps) {
  const resolvedPayload = payload as EditorialActivityDetailPayload | undefined;
  if (!resolvedPayload || !resolvedPayload.product) {
    return <>{children}</>;
  }

  const faqSource = Array.isArray(resolvedPayload.faqs) && resolvedPayload.faqs.length > 0
    ? resolvedPayload.faqs
    : ACTIVITY_FAQS_DEFAULT;
  const websiteUrl = buildWebsiteUrl(website, resolvedPayload.basePath);
  const pageUrl = buildPageUrl(websiteUrl, resolvedPayload.product);

  return (
    <div
      data-template-set="editorial-v1"
      data-editorial-variant="activity-detail"
      className="editorial-activity-detail"
    >
      <ProductSchema
        product={resolvedPayload.product}
        productType="activity"
        websiteUrl={websiteUrl}
        pageUrl={pageUrl}
        language={resolvedPayload.resolvedLocale}
        faqs={faqSource}
      />
      <OrganizationSchema website={website} websiteUrl={websiteUrl} />

      <EditorialActivityDetailClient
        website={website}
        basePath={resolvedPayload.basePath}
        product={resolvedPayload.product}
        displayName={resolvedPayload.displayName}
        displayLocation={resolvedPayload.displayLocation}
        resolvedLocale={resolvedPayload.resolvedLocale || 'es-CO'}
        googleReviews={Array.isArray(resolvedPayload.googleReviews) ? resolvedPayload.googleReviews : []}
        similarProducts={Array.isArray(resolvedPayload.similarProducts) ? resolvedPayload.similarProducts : []}
        faqs={faqSource}
        activityCircuitStops={
          Array.isArray(resolvedPayload.activityCircuitStops)
            ? resolvedPayload.activityCircuitStops
            : []
        }
      />
    </div>
  );
}
