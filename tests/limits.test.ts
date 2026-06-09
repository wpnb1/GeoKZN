import test from 'node:test';
import assert from 'node:assert/strict';

import { EVENT_DESCRIPTION_MAX_LENGTH } from '../constants/limits';

test('event description limit is fixed to 500 characters', () => {
  assert.equal(EVENT_DESCRIPTION_MAX_LENGTH, 500);
});
