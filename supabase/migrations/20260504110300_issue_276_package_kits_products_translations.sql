-- Issue #276
-- Add per-locale translations storage for package kits and canonical products rows.
-- Additive + idempotent migration.

ALTER TABLE public.package_kits
  ADD COLUMN IF NOT EXISTS translations jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS translations jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.package_kits.translations IS
  'Per-locale translation payloads for package kits (jsonb map).';

COMMENT ON COLUMN public.products.translations IS
  'Per-locale translation payloads for products (jsonb map).';
