-- Issues #275 + #277
-- Add locale overlay translation columns for section content and planner contact copy.

do $$
begin
  if to_regclass('public.website_sections') is not null then
    alter table public.website_sections
      add column if not exists content_translations jsonb;
    update public.website_sections
      set content_translations = '{}'::jsonb
      where content_translations is null;
    alter table public.website_sections
      alter column content_translations set default '{}'::jsonb,
      alter column content_translations set not null;
    comment on column public.website_sections.content_translations is
      'Locale overlay map for section content, e.g. {"en-US":{"title":"Discover Colombia"}}';
  end if;

  if to_regclass('public.contacts') is not null then
    alter table public.contacts
      add column if not exists translations jsonb;
    update public.contacts
      set translations = '{}'::jsonb
      where translations is null;
    alter table public.contacts
      alter column translations set default '{}'::jsonb,
      alter column translations set not null;
    comment on column public.contacts.translations is
      'Locale overlay map for planner profile fields, e.g. {"en-US":{"bio":"...","specialty":"..."}}';
  end if;
end $$;
