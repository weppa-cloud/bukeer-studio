-- Migration: package_kits AI generation flags
-- Enables Studio to track which fields were AI-generated and prevent overwriting
-- manual edits. Idempotency hash avoids redundant OpenRouter calls.
-- Relates to: bukeer-studio#174, bukeer-flutter#757

ALTER TABLE package_kits
  ADD COLUMN IF NOT EXISTS description_ai_generated  boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS highlights_ai_generated   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_ai_hash              text;

COMMENT ON COLUMN package_kits.description_ai_generated IS
  'True when description was last written by AI. Reset to false on manual operator edit.';
COMMENT ON COLUMN package_kits.highlights_ai_generated IS
  'True when program_highlights was last written by AI. Reset to false on manual operator edit.';
COMMENT ON COLUMN package_kits.last_ai_hash IS
  'SHA-256 hex of (name||destination||duration_days||itinerary_ids||child_products_summary). Used for idempotency — skip regen when hash unchanged.';
