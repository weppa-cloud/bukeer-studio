-- #165 — Product Video Field
-- Adds video_url + video_caption to products table (packages, activities, hotels, transfers).
-- write path: Flutter admin → existing product update
-- read path: Studio SSR via get_website_product_page RPC

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS video_url     text   DEFAULT NULL
    CONSTRAINT products_video_url_shape CHECK (
      video_url IS NULL
      OR video_url ~* '^https?://'
    ),
  ADD COLUMN IF NOT EXISTS video_caption text   DEFAULT NULL;

-- Rollback: ALTER TABLE public.products DROP COLUMN IF EXISTS video_url, DROP COLUMN IF EXISTS video_caption;
