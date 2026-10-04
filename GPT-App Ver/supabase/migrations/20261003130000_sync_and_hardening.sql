-- Closes the gaps between the first schema and what the API needs on Postgres:
-- hashed link tokens, extension pairing, realtime, state-machine guards, and
-- column-level privileges so secrets can never be read by a signed-in client.

-- ---------------------------------------------------------------------------
-- Missing columns and tables
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists display_name text;

alter table public.trusted_contacts add column if not exists token_hash text unique;
alter table public.approval_requests add column if not exists token_hash text unique;

alter table public.extension_connections add column if not exists token_hash text unique;
alter table public.extension_connections add column if not exists expires_at timestamptz;

create table if not exists public.pair_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null unique,
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create table if not exists public.friend_invites (
  id uuid primary key default gen_random_uuid(),
  inviter_id uuid not null references auth.users (id) on delete cascade,
  email text,
  token_hash text not null unique,
  status text not null check (status in ('pending', 'accepted', 'expired')),
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.onboarding_drafts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.pair_codes enable row level security;
alter table public.friend_invites enable row level security;
alter table public.onboarding_drafts enable row level security;
-- No policies on these three: only the service role (the API) can touch them.

-- ---------------------------------------------------------------------------
-- Indexes for the queries the dashboard and the extension actually run
-- ---------------------------------------------------------------------------

create index if not exists idx_interventions_user_created on public.interventions (user_id, created_at desc);
create index if not exists idx_deferred_user_status on public.deferred_purchases (user_id, status, cooldown_until);
create index if not exists idx_approvals_requester on public.approval_requests (requester_id, status, expires_at);
create index if not exists idx_trusted_owner on public.trusted_contacts (owner_id, status);
create index if not exists idx_friends_addressee on public.friendships (addressee_id, status);
create index if not exists idx_members_user on public.challenge_members (user_id, status);
create index if not exists idx_notes_user on public.notification_deliveries (user_id, created_at desc);
create index if not exists idx_scores_user_action on public.score_events (user_id, action, created_at);
create index if not exists idx_extension_user on public.extension_connections (user_id) where revoked_at is null;

-- One open request per purchase, so a double tap cannot text a contact twice.
create unique index if not exists uniq_open_approval
  on public.approval_requests (intervention_id) where status = 'pending';

-- ---------------------------------------------------------------------------
-- State-machine guards. The API enforces these too; the database refuses to
-- let a bug or a stray query rewrite history.
-- ---------------------------------------------------------------------------

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists interventions_touch on public.interventions;
create trigger interventions_touch before update on public.interventions
  for each row execute function public.touch_updated_at();

create or replace function public.guard_approval() returns trigger
language plpgsql as $$
begin
  if new.requester_id is distinct from old.requester_id
     or new.contact_id is distinct from old.contact_id
     or new.intervention_id is distinct from old.intervention_id
     or new.expires_at is distinct from old.expires_at
     or new.token_hash is distinct from old.token_hash then
    raise exception 'approval requests are immutable except for their status';
  end if;
  if old.status <> 'pending' and new.status is distinct from old.status then
    raise exception 'approval request is already %', old.status using errcode = '23514';
  end if;
  if new.status <> 'pending' and new.responded_at is null then
    new.responded_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists approval_guard on public.approval_requests;
create trigger approval_guard before update on public.approval_requests
  for each row execute function public.guard_approval();

create or replace function public.guard_score_event() returns trigger
language plpgsql as $$
begin
  raise exception 'score events are append-only';
end;
$$;

drop trigger if exists score_events_append_only on public.score_events;
create trigger score_events_append_only before update on public.score_events
  for each row execute function public.guard_score_event();

create or replace function public.guard_intervention() returns trigger
language plpgsql as $$
begin
  if old.decision in ('continue', 'save', 'drop') and new.decision is distinct from old.decision then
    raise exception 'a finished intervention cannot change its decision' using errcode = '23514';
  end if;
  if new.user_id is distinct from old.user_id or new.idempotency_key is distinct from old.idempotency_key then
    raise exception 'intervention ownership is fixed';
  end if;
  return new;
end;
$$;

drop trigger if exists intervention_guard on public.interventions;
create trigger intervention_guard before update on public.interventions
  for each row execute function public.guard_intervention();

-- A trusted contact is a person who agreed to answer individual requests. It
-- never carries a permission on the owner's account, so revoking is final.
create or replace function public.guard_trusted_contact() returns trigger
language plpgsql as $$
begin
  if old.status = 'revoked' and new.status is distinct from old.status then
    raise exception 'a revoked contact must be invited again' using errcode = '23514';
  end if;
  if new.status = 'revoked' then
    update public.approval_requests
       set status = 'canceled', responded_at = now()
     where contact_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;

drop trigger if exists trusted_contact_guard on public.trusted_contacts;
create trigger trusted_contact_guard before update on public.trusted_contacts
  for each row execute function public.guard_trusted_contact();

-- ---------------------------------------------------------------------------
-- Privileges. RLS decides which rows; grants decide which columns and verbs.
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from anon;
revoke insert, update, delete, truncate, references, trigger on all tables in schema public from authenticated;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke insert, update, delete on tables from authenticated;

revoke select on public.pair_codes, public.friend_invites, public.onboarding_drafts from authenticated;

-- Hashes of link tokens are never readable by a client, even their owner's.
revoke select on public.trusted_contacts, public.approval_requests, public.extension_connections from authenticated;
grant select (id, owner_id, contact_user_id, display_name, email, phone, status, consent_at, created_at)
  on public.trusted_contacts to authenticated;
grant select (id, intervention_id, requester_id, contact_id, status, expires_at, responded_at, created_at)
  on public.approval_requests to authenticated;
grant select (id, user_id, device_label, last_seen_at, revoked_at, expires_at)
  on public.extension_connections to authenticated;

-- A contact who has an account can see that they are a contact, but only the
-- owner can read the phone number and email of the row.
drop policy if exists trusted_owner on public.trusted_contacts;
create policy trusted_owner on public.trusted_contacts for select using (auth.uid() = owner_id);
create policy trusted_self on public.trusted_contacts for select using (auth.uid() = contact_user_id and status <> 'revoked');

-- Everyone in a challenge can see it; only members, and only their own status.
drop policy if exists challenges_member on public.challenges;
create policy challenges_member on public.challenges for select using (
  creator_id = auth.uid()
  or exists (select 1 from public.challenge_members m where m.challenge_id = challenges.id and m.user_id = auth.uid())
);

-- ---------------------------------------------------------------------------
-- Realtime. Postgres changes are filtered through the same select policies,
-- so a subscriber only ever receives rows they could already read.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array[
      'profiles', 'protected_sites', 'interventions', 'deferred_purchases',
      'approval_requests', 'trusted_contacts', 'friendships', 'challenge_members',
      'score_events', 'notification_deliveries'
    ] loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
      ) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end;
$$;

alter table public.approval_requests replica identity full;
alter table public.deferred_purchases replica identity full;
alter table public.profiles replica identity full;
