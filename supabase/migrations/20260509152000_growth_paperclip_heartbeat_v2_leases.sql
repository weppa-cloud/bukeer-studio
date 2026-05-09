-- Paperclip heartbeat protocol v2: explicit leases for wakeups and task sessions.

alter table public.growth_agent_wakeup_requests
  add column if not exists lease_token text,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists last_claimed_at timestamptz,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 3;

alter table public.growth_agent_wakeup_requests
  drop constraint if exists growth_agent_wakeup_requests_status_chk;

alter table public.growth_agent_wakeup_requests
  add constraint growth_agent_wakeup_requests_status_chk
    check (status in (
      'queued',
      'claimed',
      'completed',
      'failed',
      'cancelled',
      'coalesced',
      'expired'
    ));

alter table public.growth_agent_wakeup_requests
  drop constraint if exists growth_agent_wakeup_requests_attempts_chk;

alter table public.growth_agent_wakeup_requests
  add constraint growth_agent_wakeup_requests_attempts_chk
    check (attempt_count >= 0 and max_attempts > 0 and attempt_count <= max_attempts);

alter table public.growth_agent_task_sessions
  add column if not exists lease_token text,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists attempt_count integer not null default 0,
  add column if not exists max_attempts integer not null default 3;

alter table public.growth_agent_task_sessions
  drop constraint if exists growth_agent_task_sessions_status_chk;

alter table public.growth_agent_task_sessions
  add constraint growth_agent_task_sessions_status_chk
    check (status in (
      'created',
      'assigned',
      'running',
      'blocked',
      'completed',
      'cancelled',
      'failed',
      'expired'
    ));

alter table public.growth_agent_task_sessions
  drop constraint if exists growth_agent_task_sessions_attempts_chk;

alter table public.growth_agent_task_sessions
  add constraint growth_agent_task_sessions_attempts_chk
    check (attempt_count >= 0 and max_attempts > 0 and attempt_count <= max_attempts);

create index if not exists growth_agent_wakeup_requests_lease_idx
  on public.growth_agent_wakeup_requests(website_id, lane, status, lease_expires_at, priority desc);

create index if not exists growth_agent_task_sessions_lease_idx
  on public.growth_agent_task_sessions(website_id, assigned_agent_lane, status, lease_expires_at);

comment on column public.growth_agent_wakeup_requests.lease_token is
  'Current Paperclip-style checkout token. Claims and renewals must match this token.';
comment on column public.growth_agent_wakeup_requests.lease_expires_at is
  'When the current wakeup claim can be recovered by another daemon.';
comment on column public.growth_agent_task_sessions.lease_token is
  'Current Paperclip-style task-session lease token.';
comment on column public.growth_agent_task_sessions.lease_expires_at is
  'When the current task session can be marked expired or recovered.';
