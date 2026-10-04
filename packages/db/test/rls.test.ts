import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'

/**
 * Runs the real Supabase migrations on Postgres and exercises them the way
 * PostgREST does: as the non-superuser `authenticated` role with a JWT subject.
 * A superuser would bypass RLS and make every one of these checks meaningless.
 */

const migrations = join(__dirname, '../../../supabase/migrations')

const ALEX = '00000000-0000-4000-8000-00000000000a'
const BLAIR = '00000000-0000-4000-8000-00000000000b'
const SAM = '00000000-0000-4000-8000-00000000000c'

let db: PGlite

async function as<T>(user: string | null, run: () => Promise<T>): Promise<T> {
  await db.exec(`select set_config('request.jwt.claim.sub', '${user ?? ''}', false)`)
  await db.exec(`set role ${user ? 'authenticated' : 'anon'}`)
  try {
    return await run()
  } finally {
    await db.exec('reset role')
    await db.exec(`select set_config('request.jwt.claim.sub', '', false)`)
  }
}

async function rows(sql: string): Promise<Array<Record<string, unknown>>> {
  return (await db.query(sql)).rows as Array<Record<string, unknown>>
}

const PRIVILEGE = /permission denied|row-level security/

async function denied(sql: string, reason: RegExp = PRIVILEGE): Promise<boolean> {
  try {
    await db.exec(sql)
    return false
  } catch (error) {
    return reason.test(String((error as Error).message))
  }
}

const GUARD = /immutable|already|append-only|cannot change|fixed|revoked|duplicate key|violates/

beforeAll(async () => {
  db = new PGlite()
  await db.exec(`
    create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create role anon nologin;
    create role authenticated nologin;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
  `)
  for (const file of readdirSync(migrations).filter((name) => name.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(join(migrations, file), 'utf8'))
  }
  await db.exec(`
    insert into auth.users (id) values ('${ALEX}'), ('${BLAIR}'), ('${SAM}');
    insert into public.profiles (user_id) values ('${ALEX}'), ('${BLAIR}');

    insert into public.interventions (id, user_id, idempotency_key, domain, url, category, decision, restriction_level)
    values
      ('10000000-0000-4000-8000-000000000001', '${ALEX}', 'alex-key-001', 'amazon.com', 'https://amazon.com/checkout', 'shopping', 'save', 'medium'),
      ('10000000-0000-4000-8000-000000000002', '${ALEX}', 'alex-key-002', 'amazon.com', 'https://amazon.com/checkout', 'shopping', 'awaiting_approval', 'high'),
      ('10000000-0000-4000-8000-000000000003', '${BLAIR}', 'blair-key-001', 'etsy.com', 'https://etsy.com/cart', 'shopping', 'drop', 'low');

    insert into public.deferred_purchases (user_id, intervention_id, url, domain, cooldown_until, status)
    values ('${ALEX}', '10000000-0000-4000-8000-000000000001', 'https://amazon.com/checkout', 'amazon.com', now() + interval '1 day', 'saved');

    insert into public.score_events (user_id, action, points, idempotency_key, explanation)
    values ('${ALEX}', 'defer', 15, 'defer:1', 'Saved a purchase for later.'),
           ('${BLAIR}', 'abandon', 20, 'abandon:3', 'Dropped a purchase.');

    insert into public.trusted_contacts (id, owner_id, contact_user_id, display_name, phone, status, token_hash, consent_at)
    values ('20000000-0000-4000-8000-000000000001', '${ALEX}', '${SAM}', 'Sam', '+15555550100', 'accepted', 'secret-hash-1', now()),
           ('20000000-0000-4000-8000-000000000002', '${ALEX}', null, 'Pat', '+15555550101', 'invited', 'secret-hash-2', null);

    insert into public.approval_requests (id, intervention_id, requester_id, contact_id, status, token_hash, expires_at)
    values ('30000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002', '${ALEX}',
            '20000000-0000-4000-8000-000000000001', 'pending', 'approval-hash-1', now() + interval '2 hours');

    insert into public.challenges (id, creator_id, title, goal_type, goal_count, starts_at, ends_at, status)
    values ('40000000-0000-4000-8000-000000000001', '${ALEX}', 'Seven pauses', 'defer', 7, now(), now() + interval '7 days', 'active');
    insert into public.challenge_members (challenge_id, user_id, status)
    values ('40000000-0000-4000-8000-000000000001', '${ALEX}', 'accepted'),
           ('40000000-0000-4000-8000-000000000001', '${BLAIR}', 'invited');

    insert into public.pair_codes (user_id, code_hash, expires_at) values ('${ALEX}', 'pair-hash', now() + interval '10 minutes');
  `)
})

describe('row level security', () => {
  it('shows each person only their own rows', async () => {
    const alex = await as(ALEX, () => rows('select user_id from public.interventions'))
    expect(alex).toHaveLength(2)
    expect(alex.every((row) => row.user_id === ALEX)).toBe(true)

    const blair = await as(BLAIR, () => rows('select user_id from public.interventions'))
    expect(blair).toHaveLength(1)
    expect(blair[0]!.user_id).toBe(BLAIR)

    expect(await as(BLAIR, () => rows('select * from public.deferred_purchases'))).toHaveLength(0)
    expect(await as(BLAIR, () => rows('select * from public.score_events where user_id <> auth.uid()'))).toHaveLength(0)
    expect(await as(BLAIR, () => rows('select * from public.profiles where user_id <> auth.uid()'))).toHaveLength(0)
  })

  it('refuses every client write, including to your own rows', async () => {
    await as(ALEX, async () => {
      expect(await denied(`insert into public.score_events (user_id, action, points, idempotency_key, explanation) values ('${ALEX}', 'defer', 9999, 'cheat', 'cheat')`)).toBe(true)
      expect(await denied(`update public.score_events set points = 9999 where user_id = '${ALEX}'`)).toBe(true)
      expect(await denied(`update public.profiles set approval_required = false where user_id = '${ALEX}'`)).toBe(true)
      expect(await denied(`delete from public.interventions where user_id = '${ALEX}'`)).toBe(true)
      expect(await denied(`update public.approval_requests set status = 'approved' where requester_id = '${ALEX}'`)).toBe(true)
      expect(await denied(`insert into public.trusted_contacts (owner_id, display_name, status) values ('${ALEX}', 'Me', 'accepted')`)).toBe(true)
    })
    const score = await rows(`select sum(points)::int as n from public.score_events where user_id = '${ALEX}'`)
    expect(score[0]!.n).toBe(15)
  })

  it('gives anonymous callers nothing', async () => {
    await as(null, async () => {
      expect(await denied('select * from public.interventions')).toBe(true)
      expect(await denied('select * from public.profiles')).toBe(true)
    })
  })

  it('never exposes link-token hashes or pairing codes to a signed-in client', async () => {
    await as(ALEX, async () => {
      expect(await denied('select token_hash from public.approval_requests')).toBe(true)
      expect(await denied('select token_hash from public.trusted_contacts')).toBe(true)
      expect(await denied('select * from public.trusted_contacts')).toBe(true)
      expect(await denied('select * from public.pair_codes')).toBe(true)
      expect(await denied('select * from public.friend_invites')).toBe(true)
      expect(await denied('select * from public.onboarding_drafts')).toBe(true)
    })
    const own = await as(ALEX, () => rows('select id, status, expires_at from public.approval_requests'))
    expect(own).toHaveLength(1)
  })

  it('keeps a trusted contact to their own row and away from the requester’s data', async () => {
    const seen = await as(SAM, () => rows('select id, owner_id, display_name, status from public.trusted_contacts'))
    expect(seen).toHaveLength(1)
    expect(seen[0]!.display_name).toBe('Sam')

    await as(SAM, async () => {
      expect(await rows('select id from public.approval_requests')).toHaveLength(0)
      expect(await rows('select id from public.interventions')).toHaveLength(0)
      expect(await rows('select id from public.deferred_purchases')).toHaveLength(0)
      expect(await rows('select id from public.score_events')).toHaveLength(0)
      expect(await rows('select user_id from public.profiles')).toHaveLength(0)
    })
  })

  it('shows a challenge to its members and not to outsiders', async () => {
    expect(await as(ALEX, () => rows('select id from public.challenges'))).toHaveLength(1)
    expect(await as(BLAIR, () => rows('select id from public.challenges'))).toHaveLength(1)
    expect(await as(SAM, () => rows('select id from public.challenges'))).toHaveLength(0)
    const members = await as(BLAIR, () => rows('select user_id from public.challenge_members'))
    expect(members.map((row) => row.user_id)).toEqual([BLAIR])
  })
})

describe('state guards', () => {
  it('answers an approval request once and then freezes it', async () => {
    const id = '30000000-0000-4000-8000-000000000001'
    expect(await denied(`update public.approval_requests set expires_at = now() + interval '30 days' where id = '${id}'`, GUARD)).toBe(true)
    expect(await denied(`update public.approval_requests set contact_id = '20000000-0000-4000-8000-000000000002' where id = '${id}'`, GUARD)).toBe(true)

    await db.exec(`update public.approval_requests set status = 'approved' where id = '${id}'`)
    const [row] = await rows(`select status, responded_at from public.approval_requests where id = '${id}'`)
    expect(row!.status).toBe('approved')
    expect(row!.responded_at).not.toBeNull()

    expect(await denied(`update public.approval_requests set status = 'declined' where id = '${id}'`, GUARD)).toBe(true)
    expect(await denied(`update public.approval_requests set status = 'pending' where id = '${id}'`, GUARD)).toBe(true)
  })

  it('allows one open request per purchase', async () => {
    const intervention = '10000000-0000-4000-8000-000000000001'
    await db.exec(`
      insert into public.approval_requests (intervention_id, requester_id, contact_id, status, token_hash, expires_at)
      values ('${intervention}', '${ALEX}', '20000000-0000-4000-8000-000000000001', 'pending', 'dup-hash-1', now() + interval '2 hours')`)
    expect(
      await denied(`
        insert into public.approval_requests (intervention_id, requester_id, contact_id, status, token_hash, expires_at)
        values ('${intervention}', '${ALEX}', '20000000-0000-4000-8000-000000000001', 'pending', 'dup-hash-2', now() + interval '2 hours')`, GUARD),
    ).toBe(true)
  })

  it('cancels open requests when a contact is revoked, and keeps them revoked', async () => {
    const contact = '20000000-0000-4000-8000-000000000001'
    await db.exec(`update public.trusted_contacts set status = 'revoked' where id = '${contact}'`)
    const open = await rows(`select count(*)::int as n from public.approval_requests where contact_id = '${contact}' and status = 'pending'`)
    expect(open[0]!.n).toBe(0)
    expect(await denied(`update public.trusted_contacts set status = 'accepted' where id = '${contact}'`, GUARD)).toBe(true)
    expect(await as(SAM, () => rows('select id from public.trusted_contacts'))).toHaveLength(0)
  })

  it('treats scores as append-only and finished interventions as final', async () => {
    expect(await denied(`update public.score_events set points = 1 where user_id = '${ALEX}'`, GUARD)).toBe(true)
    expect(await denied(`update public.interventions set decision = 'drop' where id = '10000000-0000-4000-8000-000000000001'`, GUARD)).toBe(true)
    expect(await denied(`update public.interventions set user_id = '${BLAIR}' where id = '10000000-0000-4000-8000-000000000001'`, GUARD)).toBe(true)
    await db.exec(`update public.interventions set decision = 'continue' where id = '10000000-0000-4000-8000-000000000002'`)
  })

  it('removes everything when the account is deleted', async () => {
    await db.exec(`delete from auth.users where id = '${ALEX}'`)
    for (const [table, column] of [
      ['profiles', 'user_id'],
      ['interventions', 'user_id'],
      ['deferred_purchases', 'user_id'],
      ['score_events', 'user_id'],
      ['approval_requests', 'requester_id'],
      ['trusted_contacts', 'owner_id'],
      ['challenges', 'creator_id'],
      ['pair_codes', 'user_id'],
    ]) {
      const left = await rows(`select count(*)::int as n from public.${table} where ${column} = '${ALEX}'`)
      expect(left[0]!.n, table).toBe(0)
    }
    const blair = await rows(`select count(*)::int as n from public.interventions where user_id = '${BLAIR}'`)
    expect(blair[0]!.n).toBe(1)
  })
})
