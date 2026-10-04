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
