import test from 'node:test';
import assert from 'node:assert/strict';

import { API_URL, apiRequest } from '../lib/api';

test('API_URL falls back to localhost when env variable and Expo host are missing', () => {
  assert.equal(API_URL, 'http://localhost:4000');
});

test('apiRequest sends POST request with JSON body and bearer token', async () => {
  const originalFetch = globalThis.fetch;

  try {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
      capturedUrl = String(url);
      capturedOptions = options;

      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    const result = await apiRequest<{ ok: boolean }>('/events', {
      token: 'token-123',
      body: { title: 'Test event' },
    });

    assert.deepEqual(result, { ok: true });
    assert.equal(capturedUrl, 'http://localhost:4000/events');
    assert.equal(capturedOptions?.method, 'POST');
    assert.equal((capturedOptions?.headers as Record<string, string>).Authorization, 'Bearer token-123');
    assert.equal(capturedOptions?.body, JSON.stringify({ title: 'Test event' }));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('apiRequest throws normalized ApiError for non-OK response', async () => {
  const originalFetch = globalThis.fetch;

  try {
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;

    await assert.rejects(
      () => apiRequest('/admin/reports'),
      (error: any) => error?.error === 'Forbidden',
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
