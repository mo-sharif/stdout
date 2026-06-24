import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isEnabled } from './config.mjs';

test('isEnabled is false when creds are absent', () => {
  // tests run with these env vars unset
  assert.equal(isEnabled('telegram'), false);
  assert.equal(isEnabled('linkedin'), false);
});
test('isEnabled is false for an unknown platform', () => {
  assert.equal(isEnabled('myspace'), false);
});
