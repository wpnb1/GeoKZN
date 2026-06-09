import { getApiUrl } from './api';

export type RealtimeMessage =
  | { type: 'connection:ready' }
  | { type: 'events:changed' }
  | { type: 'comments:changed'; eventId?: number | null };

export function buildRealtimeUrl() {
  const wsBase = getApiUrl().replace(/^http/i, 'ws');
  return `${wsBase}/ws`;
}

export function connectRealtime(onMessage: (message: RealtimeMessage) => void) {
  let socket = new WebSocket(buildRealtimeUrl());
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let isClosedManually = false;

  const attachSocket = (nextSocket: WebSocket) => {
    socket = nextSocket;

    socket.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(String(event.data)) as RealtimeMessage;
        onMessage(data);
      } catch {
        // Ignore malformed messages to keep the client resilient.
      }
    };

    socket.onerror = () => {
      socket.close();
    };

    socket.onclose = () => {
      if (isClosedManually || reconnectTimer) return;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        attachSocket(new WebSocket(buildRealtimeUrl()));
      }, 2000);
    };
  };

  attachSocket(socket);

  return () => {
    isClosedManually = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
    socket.close();
  };
}
