import test from 'node:test';
import assert from 'node:assert/strict';
import { optOutIds } from './score.js';
test('score counts explicit opt-outs once and excludes legacy, saved, and continued outcomes', () => {
  assert.deepEqual(optOutIds([
    { id: 'a', type: 'impulse_opt_out' }, { id: 'a', type: 'impulse_opt_out' },
    { id: 'b', type: 'impulse_opt_out' }, { id: 'c', type: 'purchase_dropped' },
    { id: 'd', type: 'saved_for_later' }, { id: 'e', type: 'continue_selected' },
  ]), ['a', 'b']);
});
