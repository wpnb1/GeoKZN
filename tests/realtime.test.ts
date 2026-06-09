import test from 'node:test';
import assert from 'node:assert/strict';

import { buildRealtimeUrl, connectRealtime, type RealtimeMessage } from '../lib/realtime';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  closed = false;

  constructor(public readonly url: string) {
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.closed = true;
  }
}

test('buildRealtimeUrl converts API url to websocket url', () => {
  assert.equal(buildRealtimeUrl(), 'ws://localhost:4000/ws');
});

test('connectRealtime forwards valid websocket messages to callback', () => {
  const originalWebSocket = globalThis.WebSocket;
  const messages: RealtimeMessage[] = [];

  try {
    FakeWebSocket.instances = [];
    globalThis.WebSocket = FakeWebSocket as any;

    const disconnect = connectRealtime((message) => {
      messages.push(message);
    });

    const socket = FakeWebSocket.instances[0];
    socket.onmessage?.({
      data: JSON.stringify({ type: 'events:changed' }),
    } as MessageEvent);

    assert.deepEqual(messages, [{ type: 'events:changed' }]);

    disconnect();
    assert.equal(socket.closed, true);
  } finally {
    globalThis.WebSocket = originalWebSocket;
  }
});

test('connectRealtime ignores malformed websocket payloads', () => {
  const originalWebSocket = globalThis.WebSocket;
  const messages: RealtimeMessage[] = [];

  try {
    FakeWebSocket.instances = [];
    globalThis.WebSocket = FakeWebSocket as any;

    const disconnect = connectRealtime((message) => {
      messages.push(message);
    });

    const socket = FakeWebSocket.instances[0];
    socket.onmessage?.({
      data: '{bad json}',
    } as MessageEvent);

    assert.equal(messages.length, 0);
    disconnect();
  } finally {
    globalThis.WebSocket = originalWebSocket;
  }
});

test('connectRealtime schedules reconnect after unexpected close', () => {
  const originalWebSocket = globalThis.WebSocket;
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;
  let timeoutScheduled = 0;

  try {
    FakeWebSocket.instances = [];
    globalThis.WebSocket = FakeWebSocket as any;
    globalThis.setTimeout = (((fn: (...args: any[]) => void) => {
      timeoutScheduled += 1;
      fn();
      return 1 as any;
    }) as any);
    globalThis.clearTimeout = (((_id: any) => {}) as any);

    const disconnect = connectRealtime(() => {});
    const firstSocket = FakeWebSocket.instances[0];

    firstSocket.onclose?.();

    assert.equal(timeoutScheduled, 1);
    assert.equal(FakeWebSocket.instances.length, 2);

    disconnect();
  } finally {
    globalThis.WebSocket = originalWebSocket;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  }
});
