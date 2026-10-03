-- Impulse schema for Supabase Postgres.
-- The API uses the service role and is the only writer.
-- Authenticated clients may read their own rows. They cannot update scores,
-- approvals, or interventions directly.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  onboarding_complete boolean not null default false,
  restriction_level text not null default 'medium' check (restriction_level in ('low', 'medium', 'high')),
  reflection_seconds integer not null default 15,
  cooldown_seconds integer not null default 86400,
  approval_required boolean not null default false,
  monitoring_enabled boolean not null default true,
  leaderboard_opt_in boolean not null default false,
  profile_visibility text not null default 'private' check (profile_visibility in ('private', 'friends', 'public')),
  social_enabled boolean not null default true,
  notify_saved boolean not null default true,
  notify_approvals boolean not null default true,
  notify_challenges boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  consent boolean not null,
  payload jsonb not null,
  source text not null check (source in ('ai', 'deterministic')),
  created_at timestamptz not null default now()
);

create table if not exists public.protected_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  domain text not null,
  category text not null check (category in ('shopping', 'betting', 'custom')),
  enabled boolean not null default true,
  unique (user_id, domain)
);

create table if not exists public.extension_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  device_label text,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz
);

create table if not exists public.trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  contact_user_id uuid references auth.users (id) on delete set null,
  display_name text not null,
  email text,
  phone text,
  status text not null check (status in ('invited', 'accepted', 'revoked')),
  consent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted', 'removed')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id)
);

create table if not exists public.interventions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  idempotency_key text not null,
  domain text not null,
  url text not null,
  category text not null,
  item_name text,
  amount_cents integer,
  decision text not null,
  restriction_level text not null,
  override_essential boolean not null default false,
  share_details boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create table if not exists public.deferred_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  intervention_id uuid not null unique references public.interventions (id) on delete cascade,
  url text not null,
  domain text not null,
  item_name text,
  amount_cents integer,
  saved_at timestamptz not null default now(),
  cooldown_until timestamptz not null,
  status text not null check (status in ('saved', 'eligible', 'purchased', 'removed')),
  notified_at timestamptz,
  revisited_at timestamptz
);

create table if not exists public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  intervention_id uuid not null references public.interventions (id) on delete cascade,
  requester_id uuid not null references auth.users (id) on delete cascade,
  contact_id uuid not null references public.trusted_contacts (id) on delete cascade,
  status text not null check (status in ('pending', 'approved', 'declined', 'expired', 'canceled')),
  expires_at timestamptz not null,
  responded_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.score_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  action text not null,
  points integer not null,
  idempotency_key text not null unique,
  explanation text not null,
  intervention_id uuid,
  deferred_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  goal_type text not null,
  goal_count integer not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('active', 'completed', 'canceled'))
);

create table if not exists public.challenge_members (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('invited', 'accepted', 'declined')),
  joined_at timestamptz,
  primary key (challenge_id, user_id)
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  channel text not null,
  status text not null,
  subject_id text,
  detail text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.onboarding_responses enable row level security;
alter table public.protected_sites enable row level security;
alter table public.extension_connections enable row level security;
alter table public.trusted_contacts enable row level security;
alter table public.friendships enable row level security;
alter table public.interventions enable row level security;
alter table public.deferred_purchases enable row level security;
alter table public.approval_requests enable row level security;
alter table public.score_events enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_members enable row level security;
alter table public.notification_deliveries enable row level security;

create policy profiles_owner on public.profiles for select using (auth.uid() = user_id);
create policy onboarding_owner on public.onboarding_responses for select using (auth.uid() = user_id);
create policy sites_owner on public.protected_sites for select using (auth.uid() = user_id);
create policy extensions_owner on public.extension_connections for select using (auth.uid() = user_id);
create policy trusted_owner on public.trusted_contacts for select using (auth.uid() = owner_id or auth.uid() = contact_user_id);
create policy friends_read on public.friendships for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy interventions_owner on public.interventions for select using (auth.uid() = user_id);
create policy deferred_owner on public.deferred_purchases for select using (auth.uid() = user_id);
create policy approvals_parties on public.approval_requests for select using (auth.uid() = requester_id);
create policy scores_owner on public.score_events for select using (auth.uid() = user_id);
create policy challenges_member on public.challenges for select using (
  exists (select 1 from public.challenge_members m where m.challenge_id = id and m.user_id = auth.uid())
);
create policy members_self on public.challenge_members for select using (auth.uid() = user_id);
create policy notes_owner on public.notification_deliveries for select using (auth.uid() = user_id);

-- No insert/update/delete policies. Direct client writes are denied.
-- Mutations go through the API, which uses the service role and enforces rules.
