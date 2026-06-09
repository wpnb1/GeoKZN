# Листинг основных фрагментов приложения GeoKZN

Ниже приведён укрупнённый листинг ключевых частей мобильного приложения и backend-сервера.  
Материал подобран в расчёте примерно на 15-20 страниц дипломного приложения при вставке в Word с моноширинным шрифтом 11-12 pt.

Рекомендуемый способ использования:

- брать фрагменты по разделам;
- перед каждым фрагментом ставить подпись вида `Листинг X - ...`;
- при необходимости подправить переносы строк и кодировку русских строк в редакторе диплома.

---

## Листинг 1. Конфигурация мобильного приложения для сборки Android APK

Файл: [app.json](/E:/Курсовая/TestApp/app.json)

```json
{
  "expo": {
    "name": "GeoKZN",
    "slug": "geokzn",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "geokzn",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#f5f7fb"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "ru.geokzn.app"
    },
    "android": {
      "package": "ru.geokzn.app",
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/android-icon-foreground.png",
        "backgroundImage": "./assets/images/android-icon-background.png",
        "monochromeImage": "./assets/images/android-icon-monochrome.png"
      },
      "edgeToEdgeEnabled": true
    },
    "web": {
      "favicon": "./assets/images/favicon.png"
    },
    "plugins": [
      "expo-router"
    ]
  }
}
```

---

## Листинг 2. Конфигурация EAS Build для APK и production-сборки

Файл: [eas.json](/E:/Курсовая/TestApp/eas.json)

```json
{
  "cli": {
    "version": ">= 16.20.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  }
}
```

---

## Листинг 3. Унифицированный HTTP-клиент и переключение адреса backend

Файл: [lib/api.ts](/E:/Курсовая/TestApp/lib/api.ts)

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_API_URL = 'http://localhost:4000';
const EXPO_TUNNEL_HOST_SUFFIXES = ['exp.direct', 'exp.host', 'expo.dev'];
const API_URL_STORAGE_KEY = 'geokzn.api-url';

function normalizeBaseUrl(url: string | null | undefined) {
  return url?.trim().replace(/\/$/, '') || null;
}

function isHttpUrl(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseExpoHostUri(hostUri: string) {
  const trimmed = hostUri.trim();
  if (!trimmed) return null;

  const withoutProtocol = trimmed.replace(/^[a-z]+:\/\//i, '');
  const host = withoutProtocol.split('/')[0]?.split(':')[0]?.trim();
  if (!host) return null;

  const lowerHost = host.toLowerCase();
  if (EXPO_TUNNEL_HOST_SUFFIXES.some((suffix) => lowerHost.endsWith(suffix))) {
    return null;
  }

  return host;
}

function resolveApiUrlFromExpoHost() {
  try {
    const constantsModule = require('expo-constants');
    const constants = constantsModule?.default ?? constantsModule;
    const hostUri =
      constants?.expoConfig?.hostUri ??
      constants?.platform?.hostUri ??
      null;

    const host = typeof hostUri === 'string' ? parseExpoHostUri(hostUri) : null;
    return host ? `http://${host}:4000` : null;
  } catch {
    return null;
  }
}

const FALLBACK_API_URL =
  normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL) ||
  resolveApiUrlFromExpoHost() ||
  DEFAULT_API_URL;

let currentApiUrl = FALLBACK_API_URL;

export function getDefaultApiUrl() {
  return FALLBACK_API_URL;
}

export function getApiUrl() {
  return currentApiUrl;
}

export async function loadApiUrlPreference() {
  try {
    const stored = normalizeBaseUrl(await AsyncStorage.getItem(API_URL_STORAGE_KEY));
    if (stored && isHttpUrl(stored)) {
      currentApiUrl = stored;
    }
  } catch {
    // Ignore storage failures and keep the bundled fallback.
  }

  return currentApiUrl;
}

export async function setApiUrlPreference(nextUrl: string) {
  const normalized = normalizeBaseUrl(nextUrl);
  if (!normalized || !isHttpUrl(normalized)) {
    throw new Error('Укажите корректный адрес сервера, например http://192.168.0.10:4000');
  }

  currentApiUrl = normalized;
  await AsyncStorage.setItem(API_URL_STORAGE_KEY, normalized);
  return currentApiUrl;
}

export async function resetApiUrlPreference() {
  currentApiUrl = FALLBACK_API_URL;
  await AsyncStorage.removeItem(API_URL_STORAGE_KEY);
  return currentApiUrl;
}

export async function apiRequest<T>(
  path: string,
  options: {
    method?: string;
    token?: string | null;
    body?: unknown;
  } = {},
): Promise<T> {
  const url = `${getApiUrl()}${path.startsWith('/') ? '' : '/'}${path}`;

  const res = await fetch(url, {
    method: options.method ?? (options.body ? 'POST' : 'GET'),
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg =
      typeof data === 'object' && data && 'error' in data
        ? (data as any).error
        : `HTTP ${res.status}`;
    throw { error: msg, details: data };
  }
  return data as T;
}
```

---

## Листинг 4. Подключение к WebSocket-каналу для синхронизации событий

Файл: [lib/realtime.ts](/E:/Курсовая/TestApp/lib/realtime.ts)

```ts
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
```

---

## Листинг 5. Ограничение области карты границами города Казань

Файл: [lib/useBoundedMapRegion.ts](/E:/Курсовая/TestApp/lib/useBoundedMapRegion.ts)

```ts
import { useEffect, useRef, useState } from 'react';
import { InteractionManager } from 'react-native';
import type MapView from 'react-native-maps';
import type { Region } from 'react-native-maps';

import { KAZAN_BOUNDS } from '@/constants/map';
import { hasMeaningfulRegionChange } from '@/lib/mapRegion';

export function clampMapRegion(region: Region): Region {
  let { latitude, longitude, latitudeDelta, longitudeDelta } = region;

  if (latitude < KAZAN_BOUNDS.minLat) latitude = KAZAN_BOUNDS.minLat;
  else if (latitude > KAZAN_BOUNDS.maxLat) latitude = KAZAN_BOUNDS.maxLat;

  if (longitude < KAZAN_BOUNDS.minLng) longitude = KAZAN_BOUNDS.minLng;
  else if (longitude > KAZAN_BOUNDS.maxLng) longitude = KAZAN_BOUNDS.maxLng;

  const maxDelta = 0.6;
  latitudeDelta = Math.min(latitudeDelta, maxDelta);
  longitudeDelta = Math.min(longitudeDelta, maxDelta);

  return { latitude, longitude, latitudeDelta, longitudeDelta };
}

export function clampMapCoord(coord: { latitude: number; longitude: number }) {
  return {
    latitude: Math.min(Math.max(coord.latitude, KAZAN_BOUNDS.minLat), KAZAN_BOUNDS.maxLat),
    longitude: Math.min(Math.max(coord.longitude, KAZAN_BOUNDS.minLng), KAZAN_BOUNDS.maxLng),
  };
}

export function useBoundedMapRegion(initialRegion: Region) {
  const mapRef = useRef<MapView | null>(null);
  const latestRegionRef = useRef<Region>(initialRegion);
  const isCorrectingRegionRef = useRef(false);
  const correctionTaskRef = useRef<{ cancel?: () => void } | null>(null);
  const pendingRegionCorrectionRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [region, setRegion] = useState<Region>(initialRegion);

  const clearPendingRegionCorrection = () => {
    if (pendingRegionCorrectionRef.current) {
      clearTimeout(pendingRegionCorrectionRef.current);
      pendingRegionCorrectionRef.current = null;
    }
    correctionTaskRef.current?.cancel?.();
    correctionTaskRef.current = null;
  };

  useEffect(() => {
    return () => {
      clearPendingRegionCorrection();
    };
  }, []);

  const handleMapPanDrag = () => {
    clearPendingRegionCorrection();
    isCorrectingRegionRef.current = false;
  };

  const scheduleRegionCorrection = () => {
    clearPendingRegionCorrection();
    pendingRegionCorrectionRef.current = setTimeout(() => {
      pendingRegionCorrectionRef.current = null;
      correctionTaskRef.current = InteractionManager.runAfterInteractions(() => {
        correctionTaskRef.current = null;
        const clamped = clampMapRegion(latestRegionRef.current);
        if (!hasMeaningfulRegionChange(latestRegionRef.current, clamped)) return;
        isCorrectingRegionRef.current = true;
        mapRef.current?.animateToRegion(clamped, 180);
      });
    }, 260);
  };

  const handleRegionChangeComplete = (nextRegion: Region) => {
    latestRegionRef.current = nextRegion;
    const clamped = clampMapRegion(nextRegion);
    setRegion((current) =>
      hasMeaningfulRegionChange(current, clamped) ? clamped : current,
    );

    if (isCorrectingRegionRef.current) {
      isCorrectingRegionRef.current = false;
      return;
    }

    if (!hasMeaningfulRegionChange(nextRegion, clamped)) return;
    scheduleRegionCorrection();
  };

  return {
    mapRef,
    region,
    handleMapPanDrag,
    handleRegionChangeComplete,
  };
}
```

---

## Листинг 6. Экран авторизации с валидацией и настройкой адреса сервера

Файл: [components/LoginScreen.tsx](/E:/Курсовая/TestApp/components/LoginScreen.tsx)

```tsx
type Props = {
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
  onGuest?: () => void;
  serverUrl: string;
  defaultServerUrl: string;
  onSaveServerUrl: (url: string) => Promise<void>;
  onResetServerUrl: () => Promise<void>;
};

type FieldErrors = {
  username?: string;
  password?: string;
};

export default function LoginScreen({
  onLogin,
  onRegister,
  onGuest,
  serverUrl,
  defaultServerUrl,
  onSaveServerUrl,
  onResetServerUrl,
}: Props) {
  const { theme } = useTheme();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [serverDraft, setServerDraft] = useState(serverUrl);
  const [serverMessage, setServerMessage] = useState('');

  const handleSubmit = async () => {
    setError('');
    const u = username.trim();
    const p = password;
    const nextErrors: FieldErrors = {};

    if (!u) {
      nextErrors.username = 'Введите логин.';
    } else if (isRegister && u.length < 3) {
      nextErrors.username = 'Логин должен содержать минимум 3 символа.';
    }

    if (!p) {
      nextErrors.password = 'Введите пароль.';
    } else if (p.length < 4) {
      nextErrors.password = 'Пароль должен содержать минимум 4 символа.';
    }

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      if (isRegister) {
        await onRegister(u, p);
      } else {
        await onLogin(u, p);
      }
    } catch (e: any) {
      setError(e?.message ? String(e.message) : 'Ошибка авторизации.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveServerUrl = async () => {
    try {
      await onSaveServerUrl(serverDraft);
      setServerMessage('Адрес сервера сохранён.');
      setError('');
    } catch (e: any) {
      setServerMessage(e?.message ? String(e.message) : 'Не удалось сохранить адрес сервера.');
    }
  };

  const handleResetServerUrl = async () => {
    try {
      await onResetServerUrl();
      setServerDraft(defaultServerUrl);
      setServerMessage('Возвращён адрес по умолчанию.');
      setError('');
    } catch (e: any) {
      setServerMessage(e?.message ? String(e.message) : 'Не удалось вернуть адрес по умолчанию.');
    }
  };
}
```

---

## Листинг 7. Форма создания события с ограничением заголовка и выбором координат

Файл: [components/CreateEventScreen.tsx](/E:/Курсовая/TestApp/components/CreateEventScreen.tsx)

```tsx
type CreatePayload = {
  type: EventType;
  title: string;
  description: string;
  lat: number;
  lng: number;
  endTime: Date | null;
};

type FormErrors = {
  type?: string;
  title?: string;
  endTime?: string;
};

const eventTypes: { value: EventType; label: string }[] = [
  { value: 'accident', label: 'ДТП' },
  { value: 'police', label: 'Пост ДПС' },
  { value: 'chat', label: 'Чат' },
  { value: 'official', label: 'Официальное' },
  { value: 'other', label: 'Другое' },
];

export default function CreateEventScreen({
  currentUser,
  onCreateEvent,
  onUpdateEvent,
  onCancel,
  initialCoords,
  initialEvent,
}: Props) {
  const [type, setType] = useState<EventType | null>(initialEvent?.type ?? null);
  const [title, setTitle] = useState(initialEvent?.title ?? '');
  const [description, setDescription] = useState(initialEvent?.description ?? '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [endTimeText, setEndTimeText] = useState(() => {
    if (initialEvent?.endTime) {
      return initialEvent.endTime.toISOString().slice(0, 19);
    }
    return '';
  });

  const [selectedCoord, setSelectedCoord] = useState<{ latitude: number; longitude: number }>(
    clampMapCoord(initialCoord),
  );

  const canPickOfficial = currentUser.isAdmin;
  const isOfficial = type === 'official';

  const parseEndTime = (): Date | null => {
    const raw = endTimeText.trim();
    if (!raw) return null;
    const dt = new Date(raw);
    if (!Number.isFinite(dt.getTime())) return null;
    return dt;
  };

  const handleSubmit = () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    const endTime = isOfficial ? parseEndTime() : null;
    const nextErrors: FormErrors = {};

    if (!type) {
      nextErrors.type = 'Выберите тип события.';
    }
    if (!trimmedTitle) {
      nextErrors.title = 'Введите заголовок события.';
    } else if (trimmedTitle.length > EVENT_TITLE_MAX_LENGTH) {
      nextErrors.title = `Заголовок не должен превышать ${EVENT_TITLE_MAX_LENGTH} символов.`;
    }
    if (isOfficial && canPickOfficial && !endTimeText.trim()) {
      nextErrors.endTime = 'Укажите дату окончания.';
    } else if (isOfficial && canPickOfficial && !endTime) {
      nextErrors.endTime = 'Введите корректную дату в формате ISO.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !type) return;

    const payload: CreatePayload = {
      type,
      title: trimmedTitle,
      description: trimmedDescription,
      lat: selectedCoord.latitude,
      lng: selectedCoord.longitude,
      endTime,
    };

    if (mode === 'edit') {
      if (!initialEvent || !onUpdateEvent) return;
      onUpdateEvent(initialEvent.id, payload);
      return;
    }

    if (!onCreateEvent) return;
    onCreateEvent(payload);
  };

  const handleMapPress = (e: any) => {
    const coord = e?.nativeEvent?.coordinate;
    if (!coord) return;

    const lat = Number(coord.latitude);
    const lng = Number(coord.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    setSelectedCoord(clampMapCoord({ latitude: lat, longitude: lng }));
  };
}
```

---

## Листинг 8. Загрузка событий, комментариев и данных админ-панели на клиенте

Файл: [app/_layout.tsx](/E:/Курсовая/TestApp/app/_layout.tsx)

```tsx
const loadEvents = async () => {
  try {
    const data = await apiRequest<{ items: any[] }>('/events?includeArchived=true', {
      token,
    });
    const mapped: Event[] = data.items.map((row) => ({
      id: String(row.event_id),
      type: row.type,
      title: row.title,
      description: row.description ?? '',
      lat: Number(row.latitude),
      lng: Number(row.longitude),
      author: row.author,
      createdAt: new Date(row.created_at),
      endTime: row.expires_at ? new Date(row.expires_at) : null,
      isAdminEvent: row.type === 'official',
      archivedManually: Boolean(row.is_archived),
    }));
    setEvents(mapped);
    syncSelectedEvent(mapped);
  } catch {
    // ignore (offline demo)
  }
};

const loadCommentsForEvent = async (eventId: string) => {
  const idNum = Number(eventId);
  if (!Number.isFinite(idNum)) return;

  try {
    const data = await apiRequest<{ items: any[] }>(`/events/${idNum}/comments`, { token });
    const mapped: Comment[] = data.items.map((c) => ({
      id: String(c.comment_id),
      eventId: String(idNum),
      author: c.author,
      text: c.text,
      createdAt: new Date(c.created_at),
    }));
    setComments((prev) => {
      const rest = prev.filter((x) => x.eventId !== String(idNum));
      return [...rest, ...mapped];
    });
  } catch {
    // ignore
  }
};

const loadAdminReports = async () => {
  if (!token) return;
  try {
    const data = await apiRequest<{ items: any[] }>('/admin/reports', { token });
    const mapped: Complaint[] = data.items.map((r) => ({
      id: String(r.report_id),
      type: r.event_id ? 'event' : 'comment',
      targetId: String(r.event_id ?? r.comment_id),
      reporter: r.reporter,
      reason: r.reason,
      createdAt: new Date(r.created_at),
      targetUsername: r.target_username ?? undefined,
      targetUserId: r.target_user_id != null ? String(r.target_user_id) : null,
      reportNote: r.report_note ?? null,
      eventId: r.event_id ? String(r.event_id) : r.comment_event_id != null ? String(r.comment_event_id) : null,
      eventTitle: r.event_title ?? null,
      eventDescription: r.event_description ?? null,
      eventAuthor: r.target_username ?? null,
      commentText: r.comment_text ?? null,
      commentEventTitle: r.comment_event_title ?? null,
    }));
    setComplaints(mapped);
  } catch {
    // ignore
  }
};
```

---

## Листинг 9. Инициализация приложения, сохранение URL сервера и подписка на realtime

Файл: [app/_layout.tsx](/E:/Курсовая/TestApp/app/_layout.tsx)

```tsx
const saveServerUrl = async (nextUrl: string) => {
  const saved = await setApiUrlPreference(nextUrl);
  setApiUrl(saved);
  await loadEvents();
  if (token) {
    await loadReportReasons();
  }
};

const restoreDefaultServerUrl = async () => {
  const restored = await resetApiUrlPreference();
  setApiUrl(restored);
  await loadEvents();
  if (token) {
    await loadReportReasons();
  }
};

useEffect(() => {
  let isMounted = true;

  (async () => {
    const restoredApiUrl = await loadApiUrlPreference();
    if (isMounted) {
      setApiUrl(restoredApiUrl);
    }

    await Promise.all([
      loadEvents(),
      loadReportReasons(),
      new Promise((resolve) => setTimeout(resolve, 700)),
    ]);
  })().finally(() => {
    if (isMounted) setIsBooting(false);
  });

  return () => {
    isMounted = false;
  };
}, []);

useEffect(() => {
  const disconnect = connectRealtime((message: RealtimeMessage) => {
    if (message.type === 'events:changed') {
      loadEvents();
      return;
    }

    if (
      message.type === 'comments:changed' &&
      selectedEvent &&
      String(message.eventId ?? '') === selectedEvent.id
    ) {
      loadCommentsForEvent(selectedEvent.id);
    }
  });

  return disconnect;
}, [selectedEvent?.id, apiUrl]);
```

---

## Листинг 10. Схема базы данных PostgreSQL

Файл: [backend/schema.sql](/E:/Курсовая/TestApp/backend/schema.sql)

```sql
BEGIN;

CREATE TABLE IF NOT EXISTS users (
  user_id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_blocked BOOLEAN NOT NULL DEFAULT FALSE,
  avatar_emoji VARCHAR(16)
);

CREATE TABLE IF NOT EXISTS event_types (
  type_id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  icon_url TEXT,
  color_code VARCHAR(7) DEFAULT '#1976D2' CHECK (color_code ~ '^#[0-9A-Fa-f]{6}$'),
  description TEXT
);

CREATE TABLE IF NOT EXISTS events (
  event_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  type_id INTEGER NOT NULL REFERENCES event_types(type_id) ON DELETE RESTRICT,
  title VARCHAR(100) NOT NULL,
  description TEXT,
  latitude NUMERIC(10, 8) NOT NULL,
  longitude NUMERIC(11, 8) NOT NULL,
  address VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  archived_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS comments (
  comment_id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  event_id INTEGER NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  like_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS report_reasons (
  reason_id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  priority INTEGER NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 10)
);

CREATE TABLE IF NOT EXISTS reports (
  report_id SERIAL PRIMARY KEY,
  reporter_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  reported_user_id INTEGER REFERENCES users(user_id),
  event_id INTEGER REFERENCES events(event_id),
  comment_id INTEGER REFERENCES comments(comment_id),
  reason_id INTEGER NOT NULL REFERENCES report_reasons(reason_id) ON DELETE RESTRICT,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolved_by INTEGER REFERENCES users(user_id)
);

COMMIT;
```

---

## Листинг 11. Инициализация backend и сервисные функции модерации/чата

Файл: [backend/src/index.js](/E:/Курсовая/TestApp/backend/src/index.js)

```js
const http = require('http');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { WebSocketServer } = require('ws');

const { query } = require('./db');
const { signToken, authRequired, adminRequired } = require('./auth');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(cors());
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const EVENT_TITLE_MAX_LENGTH = 30;
const EVENT_DESCRIPTION_MAX_LENGTH = 500;
const CHAT_SPAM_WINDOW_MS = 12 * 1000;
const CHAT_SPAM_MAX_MESSAGES = 4;
const CHAT_MUTE_MS = 40 * 1000;
const chatSpamState = new Map();

function broadcast(payload) {
  const message = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  }
}

function getChatSpamState(userId) {
  const existing = chatSpamState.get(userId);
  if (existing) return existing;

  const created = { timestamps: [], muteUntil: 0 };
  chatSpamState.set(userId, created);
  return created;
}

function checkChatMute(userId) {
  const state = getChatSpamState(userId);
  const now = Date.now();

  if (state.muteUntil > now) {
    return { muted: true, muteUntil: state.muteUntil };
  }

  if (state.muteUntil !== 0) {
    state.muteUntil = 0;
  }

  state.timestamps = state.timestamps.filter((ts) => now - ts <= CHAT_SPAM_WINDOW_MS);
  return { muted: false, muteUntil: 0 };
}

function registerChatMessage(userId) {
  const state = getChatSpamState(userId);
  const now = Date.now();

  state.timestamps = state.timestamps.filter((ts) => now - ts <= CHAT_SPAM_WINDOW_MS);
  state.timestamps.push(now);

  if (state.timestamps.length > CHAT_SPAM_MAX_MESSAGES) {
    state.timestamps = [];
    state.muteUntil = now + CHAT_MUTE_MS;
    return { muted: true, muteUntil: state.muteUntil };
  }

  return { muted: false, muteUntil: 0 };
}

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'connection:ready' }));
});
```

---

## Листинг 12. Регистрация и авторизация пользователей на backend

Файл: [backend/src/index.js](/E:/Курсовая/TestApp/backend/src/index.js)

```js
app.post('/auth/register', async (req, res) => {
  const schema = z.object({
    username: z.string().min(3).max(50),
    email: z.string().email().optional(),
    password: z.string().min(4).max(200),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const { username, email, password } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);
  const role = 'user';

  try {
    const { rows } = await query(
      `INSERT INTO users (username, email, password_hash, role)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, username, role, is_blocked, avatar_emoji, created_at`,
      [username, email ?? null, passwordHash, role],
    );

    const user = mapUserRow(rows[0]);
    const token = signToken({ userId: user.userId, role: user.role, username: user.username });
    return res.json({ token, user });
  } catch (e) {
    return res.status(409).json({ error: 'User already exists' });
  }
});

app.post('/auth/login', async (req, res) => {
  const schema = z.object({
    username: z.string().min(1).max(50),
    password: z.string().min(1).max(200),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const { username, password } = parsed.data;
  const { rows } = await query(
    'SELECT user_id, username, role, is_blocked, avatar_emoji, created_at, password_hash FROM users WHERE username = $1',
    [username],
  );

  const row = rows[0];
  if (!row) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const ok = await bcrypt.compare(password, row.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const user = mapUserRow(row);
  const token = signToken({ userId: user.userId, role: user.role, username: user.username });
  return res.json({ token, user });
});
```

---

## Листинг 13. Получение событий и комментариев через REST API

Файл: [backend/src/index.js](/E:/Курсовая/TestApp/backend/src/index.js)

```js
app.get('/events', async (req, res) => {
  const includeArchived = req.query.includeArchived === 'true';
  const type = req.query.type;
  const bbox = typeof req.query.bbox === 'string' ? req.query.bbox : null;

  let bboxFilter = '';
  const params = [];
  let idx = 1;

  if (bbox) {
    const parts = bbox.split(',').map((x) => Number(x));
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [minLat, minLng, maxLat, maxLng] = parts;
      bboxFilter = `AND e.latitude BETWEEN $${idx++} AND $${idx++}
                    AND e.longitude BETWEEN $${idx++} AND $${idx++}`;
      params.push(minLat, maxLat, minLng, maxLng);
    }
  }

  let typeFilter = '';
  if (typeof type === 'string' && type.length > 0) {
    typeFilter = `AND et.name = $${idx++}`;
    params.push(type);
  }

  const archivedFilter = includeArchived ? '' : 'AND e.is_archived = FALSE';

  const sql = `
    SELECT
      e.event_id,
      e.title,
      e.description,
      e.latitude,
      e.longitude,
      e.created_at,
      e.expires_at,
      e.is_archived,
      e.is_active,
      u.username AS author,
      et.name AS type
    FROM events e
    JOIN users u ON u.user_id = e.user_id
    JOIN event_types et ON et.type_id = e.type_id
    WHERE e.is_active = TRUE
      ${archivedFilter}
      ${bboxFilter}
      ${typeFilter}
    ORDER BY e.created_at DESC
    LIMIT 500
  `;

  const { rows } = await query(sql, params);
  return res.json({ items: rows });
});

app.get('/events/:id/comments', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid event id' });

  const { rows } = await query(
    `SELECT c.comment_id,
            c.text AS text,
            c.created_at,
            u.username AS author
     FROM comments c
     JOIN users u ON u.user_id = c.user_id
     WHERE c.event_id = $1
       AND c.is_deleted = FALSE
     ORDER BY c.created_at ASC
     LIMIT 1000`,
    [id],
  );
  return res.json({ items: rows });
});
```

---

## Листинг 14. Создание пользовательского события через API

Файл: [backend/src/index.js](/E:/Курсовая/TestApp/backend/src/index.js)

```js
app.post('/events', authRequired, async (req, res) => {
  const schema = z.object({
    type: z.string().min(1).max(50),
    title: z.string().min(1).max(EVENT_TITLE_MAX_LENGTH),
    description: z.string().max(EVENT_DESCRIPTION_MAX_LENGTH).optional(),
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().max(255).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const { type, title, description, latitude, longitude, address } = parsed.data;
  if (type === 'official') {
    return res.status(403).json({ error: 'Official events must be created via /admin/events' });
  }

  const typeId = await getEventTypeIdByName(type);
  if (!typeId) return res.status(400).json({ error: 'Unknown event type' });

  const { rows } = await query(
    `INSERT INTO events (user_id, type_id, title, description, latitude, longitude, address)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING event_id, created_at`,
    [req.user.userId, typeId, title, description ?? '', latitude, longitude, address ?? null],
  );

  broadcast({ type: 'events:changed' });
  return res.status(201).json({
    eventId: rows[0].event_id,
    createdAt: rows[0].created_at,
  });
});
```

---

## Листинг 15. Отправка комментариев и синхронизация чата

Файл: [backend/src/index.js](/E:/Курсовая/TestApp/backend/src/index.js)

```js
app.post('/events/:id/comments', authRequired, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: 'Invalid event id' });

  const schema = z.object({
    text: z.string().min(1).max(1000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid input', details: parsed.error.flatten() });
  }

  const mute = checkChatMute(req.user.userId);
  if (mute.muted) {
    return res.status(429).json({ error: 'Chat temporarily muted', muteUntil: new Date(mute.muteUntil).toISOString() });
  }

  const status = registerChatMessage(req.user.userId);
  if (status.muted) {
    return res.status(429).json({ error: 'Chat temporarily muted', muteUntil: new Date(status.muteUntil).toISOString() });
  }

  const { rows } = await query(
    `INSERT INTO comments (user_id, event_id, text)
     VALUES ($1, $2, $3)
     RETURNING comment_id, created_at`,
    [req.user.userId, id, parsed.data.text],
  );

  broadcast({ type: 'comments:changed', eventId: id });
  return res.status(201).json({
    commentId: rows[0].comment_id,
    createdAt: rows[0].created_at,
  });
});
```

---

## Листинг 16. Итоговые рекомендации по включению листинга в диплом

Для практического использования рекомендуется:

1. Взять листинги 1-10 как основной комплект.
2. Листинги 11-15 использовать как серверную часть и примеры API.
3. Если объём нужно уменьшить, убрать листинги 2 и 4.
4. Если объём нужно увеличить, можно добавить:
   - фрагменты [components/MapScreen.tsx](/E:/Курсовая/TestApp/components/MapScreen.tsx);
   - фрагменты [components/AdminPanelScreen.tsx](/E:/Курсовая/TestApp/components/AdminPanelScreen.tsx);
   - сиды из [backend/seed.sql](/E:/Курсовая/TestApp/backend/seed.sql).

При желании этот Markdown-файл можно прямо преобразовать в Word-документ, сохранив структуру разделов и подписи.
