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

export const API_URL = FALLBACK_API_URL;

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

export type ApiError = {
  error: string;
  details?: unknown;
};

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text || null;
  }
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

  const data = await parseJsonSafe(res);
  if (!res.ok) {
    const msg =
      typeof data === 'object' && data && 'error' in data
        ? (data as any).error
        : `HTTP ${res.status}`;
    const err: ApiError = { error: msg, details: data };
    throw err;
  }
  return data as T;
}
