-- Add robots_noindex toggle per page (Issue #52)
-- When true, the page emits <meta name="robots" content="noindex, follow">
-- and is excluded from the sitemap.

ALTER TABLE website_pages ADD COLUMN IF NOT EXISTS robots_noindex boolean DEFAULT false;
ALTER TABLE product_page_customizations ADD COLUMN IF NOT EXISTS robots_noindex boolean DEFAULT false;
ALTER TABLE destination_seo_overrides ADD COLUMN IF NOT EXISTS robots_noindex boolean DEFAULT false;
