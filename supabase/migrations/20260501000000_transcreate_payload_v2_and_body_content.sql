-- EPIC #198 Wave 1
-- Track A (Phase 2 core) + Track C data persistence hooks
-- 1) Versioned transcreate payload envelope: schema_version + payload_v2
-- 2) Body transcreation persistence layer for product overlays

alter table if exists public.seo_transcreation_jobs
  add column if not exists schema_version text,
  add column if not exists payload_v2 jsonb;

-- Backfill v2 envelope from legacy payload when possible.
update public.seo_transcreation_jobs
set
  schema_version = coalesce(schema_version, '2.0'),
  payload_v2 = coalesce(
    payload_v2,
    jsonb_build_object(
      'meta_title', coalesce(payload ->> 'meta_title', payload ->> 'seoTitle', ''),
      'meta_desc', coalesce(payload ->> 'meta_desc', payload ->> 'seoDescription', ''),
      'slug', coalesce(payload ->> 'slug', ''),
      'h1', coalesce(payload ->> 'h1', payload ->> 'title', ''),
      'keywords',
        case
          when jsonb_typeof(payload -> 'keywords') = 'array' then payload -> 'keywords'
          when payload ? 'targetKeyword' then jsonb_build_array(payload ->> 'targetKeyword')
          else '[]'::jsonb
        end,
      'body_content',
        case
          when jsonb_typeof(payload -> 'body_content') = 'object' then payload -> 'body_content'
          else jsonb_strip_nulls(
            jsonb_build_object(
              'body', payload ->> 'body',
              'seo_intro', payload ->> 'seo_intro',
              'seo_highlights', case when jsonb_typeof(payload -> 'seo_highlights') = 'array' then payload -> 'seo_highlights' else null end,
              'seo_faq', case when jsonb_typeof(payload -> 'seo_faq') = 'array' then payload -> 'seo_faq' else null end
            )
          )
        end
    )
  )
where payload_v2 is null
  and jsonb_typeof(payload) = 'object'
  and (
    payload ? 'meta_title'
    or payload ? 'seoTitle'
    or payload ? 'meta_desc'
    or payload ? 'seoDescription'
    or payload ? 'h1'
    or payload ? 'title'
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'seo_transcreation_jobs_schema_version_check'
      and conrelid = 'public.seo_transcreation_jobs'::regclass
  ) then
    alter table public.seo_transcreation_jobs
      add constraint seo_transcreation_jobs_schema_version_check
      check (schema_version is null or schema_version = '2.0');
  end if;
end $$;

create index if not exists idx_seo_transcreation_jobs_schema_version
  on public.seo_transcreation_jobs(schema_version)
  where schema_version is not null;

-- Body per-locale layer in product overrides (request contract asks for this field).
alter table if exists public.product_seo_overrides
  add column if not exists body_content text;

-- Product overlay table used by transcreate apply pipeline.
alter table if exists public.website_product_pages
  add column if not exists body_content jsonb;
