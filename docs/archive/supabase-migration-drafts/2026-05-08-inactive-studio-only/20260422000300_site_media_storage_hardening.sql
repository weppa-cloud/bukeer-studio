-- Storage hardening + site-media bucket (#179)

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media',
  'site-media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
on conflict (id) do update
  set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;

do $$
declare
  rec record;
  policy_sql text;
begin
  for rec in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and (
        coalesce(qual, '') ilike '%images%'
        or coalesce(qual, '') ilike '%site-media%'
        or coalesce(qual, '') ilike '%review-avatars%'
        or coalesce(qual, '') ilike '%review-images%'
        or coalesce(with_check, '') ilike '%images%'
        or coalesce(with_check, '') ilike '%site-media%'
        or coalesce(with_check, '') ilike '%review-avatars%'
        or coalesce(with_check, '') ilike '%review-images%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', rec.policyname);
  end loop;

  policy_sql := $policy$
    create policy media_objects_public_read
      on storage.objects
      for select
      using (bucket_id in ('images', 'site-media', 'review-avatars', 'review-images'))
  $policy$;
  execute policy_sql;

  policy_sql := $policy$
    create policy media_objects_service_insert
      on storage.objects
      for insert
      with check (
        bucket_id in ('images', 'site-media', 'review-avatars', 'review-images')
        and auth.role() = 'service_role'
      )
  $policy$;
  execute policy_sql;

  policy_sql := $policy$
    create policy media_objects_service_update
      on storage.objects
      for update
      using (
        bucket_id in ('images', 'site-media', 'review-avatars', 'review-images')
        and auth.role() = 'service_role'
      )
      with check (
        bucket_id in ('images', 'site-media', 'review-avatars', 'review-images')
        and auth.role() = 'service_role'
      )
  $policy$;
  execute policy_sql;

  policy_sql := $policy$
    create policy media_objects_service_delete
      on storage.objects
      for delete
      using (
        bucket_id in ('images', 'site-media', 'review-avatars', 'review-images')
        and auth.role() = 'service_role'
      )
  $policy$;
  execute policy_sql;
end $$;
