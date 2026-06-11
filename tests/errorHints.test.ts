import test from 'node:test';
import assert from 'node:assert/strict';

import { formatApiErrorDetail, formatApiErrorMessage } from '../lib/errorHints';

test('formatApiErrorDetail returns mapped invalid credentials message', () => {
  const result = formatApiErrorDetail({ error: 'Invalid credentials' });

  assert.equal(result.summary, 'Неверный email или пароль.');
  assert.match(result.hint, /Caps Lock/i);
});

test('formatApiErrorDetail formats temporary block date for blocked user', () => {
  const result = formatApiErrorDetail({
    error: 'User is blocked',
    details: { unblockAt: '2026-05-15T12:30:00.000Z' },
  });

  assert.equal(result.summary, 'Аккаунт временно заблокирован.');
  assert.match(result.hint, /15\.05\.2026/);
});

test('formatApiErrorDetail formats chat mute time', () => {
  const result = formatApiErrorDetail({
    error: 'Chat temporarily muted',
    details: { muteUntil: '2026-05-15T12:30:45.000Z' },
  });

  assert.equal(result.summary, 'Слишком много сообщений за короткое время.');
  assert.match(result.hint, /\d{2}:\d{2}:\d{2}/);
});

test('formatApiErrorDetail returns description limit hint for validation text', () => {
  const result = formatApiErrorDetail({ error: 'description is too long' });

  assert.equal(result.summary, 'description is too long');
  assert.match(result.hint, /описание события/i);
});

test('formatApiErrorMessage builds combined summary and hint text', () => {
  const result = formatApiErrorMessage({ error: 'Forbidden' });

  assert.match(result, /^Недостаточно прав/);
  assert.match(result, /Что сделать:/);
});
