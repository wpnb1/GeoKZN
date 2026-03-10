export const API_URL =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';

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
  const url = `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`;

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

