-- issue-103-remediate-imagenes-anon-write.sql
-- Purpose: remove anonymous write permissions from legacy bucket "imagenes".
-- Safe scope: only policies targeting bucket_id = 'imagenes' on storage.objects.

begin;

-- 1) Drop write policies that target bucket "imagenes" (dynamic, name-agnostic).
do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd in ('INSERT', 'UPDATE', 'DELETE')
      and (
        coalesce(qual, '') ilike '%bucket_id = ''imagenes''%'
        or coalesce(with_check, '') ilike '%bucket_id = ''imagenes''%'
      )
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

-- 2) Normalize read policies for imagenes (drop legacy SELECT policies, keep one canonical).
do $$
declare p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and cmd = 'SELECT'
      and coalesce(qual, '') ilike '%bucket_id = ''imagenes''%'
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end $$;

drop policy if exists media_imagenes_public_read on storage.objects;
create policy media_imagenes_public_read
on storage.objects
for select
using (bucket_id = 'imagenes');

-- 3) Enforce service-role-only writes for imagenes.
drop policy if exists media_imagenes_service_insert on storage.objects;
drop policy if exists media_imagenes_service_update on storage.objects;
drop policy if exists media_imagenes_service_delete on storage.objects;

create policy media_imagenes_service_insert
on storage.objects
for insert
with check (
  bucket_id = 'imagenes'
  and auth.role() = 'service_role'
);

create policy media_imagenes_service_update
on storage.objects
for update
using (
  bucket_id = 'imagenes'
  and auth.role() = 'service_role'
)
with check (
  bucket_id = 'imagenes'
  and auth.role() = 'service_role'
);

create policy media_imagenes_service_delete
on storage.objects
for delete
using (
  bucket_id = 'imagenes'
  and auth.role() = 'service_role'
);

commit;

-- Verification query (expected: write policies require service_role):
-- select policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname='storage'
--   and tablename='objects'
--   and (
--     coalesce(qual,'') ilike '%bucket_id = ''imagenes''%'
--     or coalesce(with_check,'') ilike '%bucket_id = ''imagenes''%'
--   )
-- order by policyname;
