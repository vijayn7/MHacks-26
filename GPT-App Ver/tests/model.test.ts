import {
  domainName,
  freshPlan,
  planErrors,
  previewDecision,
  scheduledNow,
} from '../src/state/blocking';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, initialState, migrate, reducer } from '../src/state/model';

test('the app starts with a minimal schema and coherent sample savings', () => {
  const s = initialState();
  assert.equal(s.version, 2);
  assert.equal(s.savings, 284);
  assert.equal(s.pauses, 11);
  assert.equal(
    Object.values(s.dailySavings).reduce((sum, n) => sum + n, 0),
    284,
  );
  assert.equal('onboarding' in s, false);
  assert.equal('challenges' in s, false);
});
test('a quiet hold counts a pause without inventing savings', () => {
  const s = reducer(initialState(), { type: 'PAUSE' });
  assert.equal(s.pauses, 12);
  assert.equal(s.savings, 284);
});
test('snuffing a notification records savings and a pause exactly once', () => {
  const before = initialState();
  const at = Date.now();
  const s = reducer(before, { type: 'SNUFF_NUDGE', id: 'headphones', at });
  assert.equal(s.savings, 433);
  assert.equal(s.pauses, 12);
  assert.equal(s.dailySavings[dayKey(at)], before.dailySavings[dayKey(at)] + 149);
  assert.equal(s.nudges[0].status, 'snuffed');
  assert.equal(reducer(s, { type: 'SNUFF_NUDGE', id: 'headphones' }), s);
  assert.equal(reducer(s, { type: 'SNUFF_NUDGE', id: 'missing' }), s);
});
test('snoozing never counts savings and cannot revive a completed nudge', () => {
  const until = Date.now() + 86400000;
  const s = reducer(initialState(), { type: 'SNOOZE_NUDGE', id: 'headphones', until });
  assert.equal(s.nudges[0].dueAt, until);
  assert.equal(s.savings, 284);
  const done = reducer(s, { type: 'SNUFF_NUDGE', id: 'headphones' });
  assert.equal(
    reducer(done, { type: 'SNOOZE_NUDGE', id: 'headphones', until }).nudges[0].dueAt,
    null,
  );
});
test('connections validate email and reject duplicate contacts regardless of case', () => {
  const s = initialState();
  assert.equal(reducer(s, { type: 'CONNECT', email: 'bad' }), s);
  const added = reducer(s, { type: 'CONNECT', email: ' Jamie.Lee@example.com ' });
  assert.equal(added.friends.length, 4);
  assert.equal(added.friends[3].name, 'Jamie');
  assert.equal(reducer(added, { type: 'CONNECT', email: 'JAMIE.LEE@EXAMPLE.COM' }), added);
});
test('the previous Ember schema migrates meaningful progress without old interface complexity', () => {
  const s = migrate({
    version: 1,
    user: { name: 'Nico', hue: 'Azure', notifications: { reminders: true } },
    pauses: 8,
    baseSavings: 100,
    purchases: [
      { id: 'p1', name: 'Lamp', amount: 50, status: 'released' },
      { id: 'p2', name: 'Shoes', amount: 80, status: 'waiting' },
    ],
    friends: [{ id: 'j', name: 'Jo', handle: 'jo@example.com', hue: 'Violet', savings: 20 }],
  });
  assert.equal(s.savings, 150);
  assert.equal(s.pauses, 8);
  assert.equal(s.name, 'Nico');
  assert.equal(s.hue, 'Azure');
  assert.equal(s.friends[0].email, 'jo@example.com');
  assert.equal(s.nudges[0].id, 'p2');
  assert.equal('purchases' in s, false);
  assert.equal('user' in s, false);
});
test('name, hue, and notification preferences retain progress; empty names are rejected', () => {
  const s = initialState();
  assert.equal(reducer(s, { type: 'NAME', name: '  ' }), s);
  let edited = reducer(s, { type: 'NAME', name: ' Nico ' });
  edited = reducer(edited, { type: 'HUE', hue: 'Violet' });
  edited = reducer(edited, { type: 'NOTIFICATIONS', enabled: true });
  assert.equal(edited.name, 'Nico');
  assert.equal(edited.hue, 'Violet');
  assert.equal(edited.notificationsEnabled, true);
  assert.equal(edited.savings, 284);
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(edited))), edited);
});

test('empty prototypes receive the Home sample once while retaining preferences', () => {
  const empty = {
    ...initialState(),
    savings: 0,
    pauses: 2,
    dailySavings: {},
    name: 'Nico',
    hue: 'Azure',
  };
  const seeded = migrate(empty);
  assert.equal(seeded.savings, 284);
  assert.equal(seeded.pauses, 13);
  assert.equal(seeded.name, 'Nico');
  assert.equal(seeded.hue, 'Azure');
  assert.equal(
    Object.values(seeded.dailySavings).reduce((sum, value) => sum + value, 0),
    284,
  );
  assert.deepEqual(migrate(seeded), seeded);
});

test('profile preferences migrate safely and stay separate from progress', () => {
  const { blend, blendHue, burnRate, trustedFriendId, ...legacy } = initialState();
  const old = migrate(legacy);
  assert.equal(old.blend, 0);
  assert.equal(old.burnRate, 54);
  let next = reducer(old, { type: 'BLEND_HUE', hue: 'Crimson' });
  next = reducer(next, { type: 'BLEND', value: 62 });
  next = reducer(next, { type: 'BURN_RATE', value: 82 });
  next = reducer(next, { type: 'TRUSTED_FRIEND', id: 'ria' });
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(next))), next);
  assert.equal(next.savings, old.savings);
  assert.equal(next.pauses, old.pauses);
  assert.equal(reducer(next, { type: 'TRUSTED_FRIEND', id: 'missing' }), next);
  assert.equal(reducer(next, { type: 'BLEND', value: Infinity }).blend, 62);
  assert.equal(reducer(next, { type: 'BURN_RATE', value: -12 }).burnRate, 0);
  assert.equal(migrate({ ...next, blend: 190, burnRate: 'bad', friends: [] }).blend, 100);
  assert.equal(migrate({ ...next, friends: [] }).trustedFriendId, null);
});

test('goal rules survive reload without changing savings and reject malformed plans', () => {
  const base = initialState();
  const plan = { ...freshPlan(base.savings), title: 'a weekend away' };
  const saved = reducer(base, { type: 'SAVE_PLAN', plan });
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(saved))).plan, plan);
  assert.equal(saved.savings, base.savings);
  assert.equal(saved.pauses, base.pauses);
  assert.equal(reducer(saved, { type: 'SAVE_PLAN', plan: { ...plan, target: NaN } }), saved);
  assert.equal(migrate({ ...saved, plan: { title: 'broken' } }).plan, null);
  assert.equal(reducer(saved, { type: 'PLAN_ENABLED', enabled: false }).plan?.enabled, false);
  assert.equal(domainName('https://www.amazon.com/cart?q=hello'), 'amazon.com');
  assert.equal(domainName('not a site'), null);
  assert.equal(domainName('https://person:password@amazon.com'), null);
});

test('block matching honors domains, subdomains, thresholds, schedules, and the enabled switch', () => {
  const plan = { ...freshPlan(284), title: 'travel' };
  assert.equal(previewDecision(plan, 'www.amazon.com', 40).matched, true);
  assert.equal(previewDecision(plan, 'checkout.amazon.com', 40).matched, true);
  assert.equal(previewDecision(plan, 'notamazon.com', 100).matched, false);
  assert.equal(previewDecision(plan, 'amazon.com.evil.com', 100).matched, false);
  assert.equal(previewDecision(plan, 'amazon.com', 39.99).matched, false);
  assert.equal(previewDecision({ ...plan, enabled: false }, 'amazon.com', 100).matched, false);
  assert.ok(planErrors({ ...plan, domains: [] })[1]);
  assert.ok(planErrors({ ...plan, schedule: 'scheduled', days: [] })[2]);
  assert.ok(planErrors({ ...plan, cooldownMinutes: 0 })[3]);
});

test('overnight quiet hours belong to their start day and end exactly on time', () => {
  const p = {
    ...freshPlan(284),
    title: 'travel',
    schedule: 'scheduled' as const,
    days: [1],
    start: '21:00',
    end: '08:00',
  };
  assert.equal(scheduledNow(p, +new Date(2026, 9, 5, 20, 59)), false);
  assert.equal(scheduledNow(p, +new Date(2026, 9, 5, 21, 0)), true);
  assert.equal(scheduledNow(p, +new Date(2026, 9, 6, 7, 59)), true);
  assert.equal(scheduledNow(p, +new Date(2026, 9, 6, 8, 0)), false);
  assert.equal(scheduledNow(p, +new Date(2026, 9, 6, 21, 0)), false);
  assert.equal(
    scheduledNow({ ...p, start: '09:00', end: '17:00' }, +new Date(2026, 9, 5, 12)),
    true,
  );
});

test('face preferences survive reload and older or invalid preferences keep classic eyes', () => {
  const original = initialState();
  for (const face of ['classic', 'happy', 'dreamy', 'wink'] as const) {
    const saved = reducer(original, { type: 'FACE', face });
    assert.equal(migrate(JSON.parse(JSON.stringify(saved))).face, face);
    assert.equal(saved.savings, original.savings);
    assert.deepEqual(saved.friends, original.friends);
  }
  assert.equal(migrate({ ...original, face: undefined }).face, 'classic');
  assert.equal(migrate({ ...original, face: 'unknown' }).face, 'classic');
});

test('declining a nudge clears its delivery without awarding savings or overriding a snuff', () => {
  const before = initialState();
  const kept = reducer(before, { type: 'KEEP_NUDGE', id: 'headphones' });
  assert.equal(kept.nudges[0].status, 'kept');
  assert.equal(kept.nudges[0].dueAt, null);
  assert.equal(kept.savings, before.savings);
  assert.equal(kept.pauses, before.pauses);
  assert.equal(migrate(JSON.parse(JSON.stringify(kept))).nudges[0].status, 'kept');
  assert.equal(reducer(kept, { type: 'SNUFF_NUDGE', id: 'headphones' }), kept);
  const reminded = reducer(kept, { type: 'SNOOZE_NUDGE', id: 'headphones', until: 123 });
  assert.equal(reminded.nudges[0].status, 'waiting');
  const snuffed = reducer(before, { type: 'SNUFF_NUDGE', id: 'headphones' });
  assert.equal(
    reducer(snuffed, { type: 'KEEP_NUDGE', id: 'headphones' }).nudges[0].status,
    'snuffed',
  );
});

test('save for later is persistent and idempotent, keeps its date on revisits, and never invents savings', () => {
  const before = initialState();
  const saved = reducer(before, { type: 'SAVE_FOR_LATER', id: 'headphones', at: 1791079200000 });
  assert.equal(saved.archive.length, 1);
  assert.deepEqual(saved.archive[0], {
    id: 'headphones',
    name: 'Studio headphones',
    amount: 149,
    savedAt: 1791079200000,
  });
  assert.equal(saved.nudges[0].status, 'saved');
  assert.equal(saved.nudges[0].dueAt, null);
  assert.equal(saved.savings, before.savings);
  assert.equal(saved.pauses, before.pauses);
  assert.equal(reducer(saved, { type: 'SAVE_FOR_LATER', id: 'headphones' }), saved);
  assert.deepEqual(migrate(JSON.parse(JSON.stringify(saved))).archive, saved.archive);
  const revisited = reducer(saved, { type: 'REVISIT_ITEM', id: 'headphones' });
  assert.equal(revisited.nudges[0].status, 'waiting');
  assert.deepEqual(
    reducer(revisited, { type: 'SAVE_FOR_LATER', id: 'headphones' }).archive,
    saved.archive,
  );
  assert.equal(
    reducer(saved, { type: 'SNOOZE_NUDGE', id: 'headphones', until: 123 }).nudges[0].status,
    'saved',
  );
  assert.equal(reducer(revisited, { type: 'SNUFF_NUDGE', id: 'headphones' }).savings, 433);
  assert.deepEqual(migrate({ ...before, archive: [{ id: 'broken' }] }).archive, []);
  assert.deepEqual(migrate({ ...before, archive: undefined }).archive, []);
});
