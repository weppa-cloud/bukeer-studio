-- Public rate limits contract repair — Growth OS #310 / WAFlow smoke
--
-- Some environments already had public.public_rate_limits from an older
-- contract. The original booking Phase A migration uses CREATE TABLE IF NOT
-- EXISTS, so it does not add request_count when the table pre-exists. The
-- public WAFlow/newsletter rate limiter expects request_count and otherwise
-- fails open.

alter table if exists public.public_rate_limits
  add column if not exists request_count int not null default 1;

alter table if exists public.public_rate_limits
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'public_rate_limits'
      and column_name = 'count'
  ) then
    execute 'update public.public_rate_limits set request_count = greatest(request_count, "count")';
  end if;
end $$;

create index if not exists public_rate_limits_lookup_idx
  on public.public_rate_limits(scope, key, window_start desc);

comment on column public.public_rate_limits.request_count is
  'Number of requests observed for the scope/key/window_start bucket.';
