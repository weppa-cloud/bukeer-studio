-- Patch get_website_page_by_slug to return locale + translation_group_id.
-- Also adds robots_noindex, header_mode, parent_page_id which were missing
-- from the original RPC but already exist on the WebsitePage TS type.

CREATE OR REPLACE FUNCTION get_website_page_by_slug(
  p_subdomain text,
  p_slug      text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_website_id UUID;
  v_result     JSONB;
BEGIN
  SELECT id INTO v_website_id
  FROM public.websites
  WHERE subdomain = p_subdomain
    AND status = 'published'
    AND deleted_at IS NULL;

  IF v_website_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id',                   p.id,
    'page_type',            p.page_type,
    'category_type',        p.category_type,
    'slug',                 p.slug,
    'title',                p.title,
    'hero_config',          p.hero_config,
    'intro_content',        p.intro_content,
    'sections',             p.sections,
    'cta_config',           p.cta_config,
    'seo_title',            p.seo_title,
    'seo_description',      p.seo_description,
    'is_published',         p.is_published,
    'robots_noindex',       p.robots_noindex,
    'header_mode',          p.header_mode,
    'parent_page_id',       p.parent_page_id,
    'locale',               p.locale,
    'translation_group_id', p.translation_group_id
  ) INTO v_result
  FROM public.website_pages p
  WHERE p.website_id = v_website_id
    AND p.slug       = p_slug
    AND p.is_published = true;

  RETURN v_result;
END;
$$;
