-- #275 + #277
-- Additive migration for localized content payloads.
--
-- Adds:
--   - public.website_sections.content_translations jsonb not null default '{}'
--   - public.contacts.translations jsonb not null default '{}'
--
-- Idempotent and safe for environments where columns may already exist.

DO $$
BEGIN
  IF to_regclass('public.website_sections') IS NOT NULL THEN
    ALTER TABLE public.website_sections
      ADD COLUMN IF NOT EXISTS content_translations jsonb DEFAULT '{}'::jsonb;

    UPDATE public.website_sections
    SET content_translations = '{}'::jsonb
    WHERE content_translations IS NULL;

    ALTER TABLE public.website_sections
      ALTER COLUMN content_translations SET DEFAULT '{}'::jsonb,
      ALTER COLUMN content_translations SET NOT NULL;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.contacts') IS NOT NULL THEN
    ALTER TABLE public.contacts
      ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb;

    UPDATE public.contacts
    SET translations = '{}'::jsonb
    WHERE translations IS NULL;

    ALTER TABLE public.contacts
      ALTER COLUMN translations SET DEFAULT '{}'::jsonb,
      ALTER COLUMN translations SET NOT NULL;
  END IF;
END
$$;
