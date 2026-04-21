/**
 * editorial-v1 — Package detail page wrapper.
 *
 * Provides the `data-template-set="editorial-v1"` CSS scope wrapper for the
 * package detail page. The editorial overlay sections (stats bar, Colombia
 * map, timeline, hotels, flights) are now injected via `renderAfterMain` from
 * `page.tsx` using `<EditorialPackageOverlay>`, so they appear between the
 * pricing section and the FAQ instead of after all generic content.
 *
 * SEO: the generic `<ProductLandingPage>` still emits
 * `<ProductSchema>`, `<OrganizationSchema>` and FAQ JSON-LD. We do NOT
 * re-emit any of those here to avoid duplicate JSON-LD blocks.
 */

import type { ReactNode } from 'react';
import type { WebsiteData } from '@/lib/supabase/get-website';
import type { ProductData } from '@bukeer/website-contract';

export interface EditorialPackageDetailPayload {
  product: ProductData;
  basePath: string;
  displayName: string;
  displayLocation: string | null;
}

interface EditorialPackageDetailProps {
  website: WebsiteData;
  payload?: unknown;
  /**
   * The generic page body rendered by the dispatcher's fallback. We wrap
   * it with editorial chrome instead of rebuilding hero/gallery/pricing
   * from scratch.
   */
  children?: ReactNode;
}

export function EditorialPackageDetail({
  website: _website,
  payload: _payload,
  children,
}: EditorialPackageDetailProps) {
  return (
    <div
      data-template-set="editorial-v1"
      data-editorial-variant="package-detail"
      className="editorial-package-detail"
    >
      {children}
    </div>
  );
}
