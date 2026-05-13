-- Add slug column to contacts for travel planner profile URLs
-- Used in Author schema JSON-LD (Issue #515)

ALTER TABLE contacts ADD COLUMN IF NOT EXISTS slug text;

COMMENT ON COLUMN contacts.slug IS 'URL-friendly slug for the planner profile page, used in Author schema (Issue #515)';

CREATE INDEX IF NOT EXISTS idx_contacts_slug ON contacts(slug);
CREATE INDEX IF NOT EXISTS idx_contacts_user_id_show ON contacts(user_id, show_on_website);