-- #165 — Product Video Field (Phase 0 scope: package_kits)
-- Phase 0 scope: package_kits only. Activities + hotels follow-up (own schemas).
-- write path: Studio editor PATCH /api/products/[id]/video
-- read path: Studio SSR for public /paquetes/[slug] landing

ALTER TABLE public.package_kits
  ADD COLUMN IF NOT EXISTS video_url     text   DEFAULT NULL
    CONSTRAINT package_kits_video_url_shape CHECK (
      video_url IS NULL
      OR video_url ~* '^https?://'
    ),
  ADD COLUMN IF NOT EXISTS video_caption text   DEFAULT NULL;

-- Rollback: ALTER TABLE public.package_kits DROP COLUMN IF EXISTS video_url, DROP COLUMN IF EXISTS video_caption;
