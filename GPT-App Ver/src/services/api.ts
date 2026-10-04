// Set EXPO_PUBLIC_API_URL (for example in .env.local) to the SecondThought API, e.g. http://192.168.1.20:8787.
// A phone cannot reach the Mac's localhost. Without the variable the app stays fully local.
const base = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '');
export const apiEnabled = base !== '';

export async function api<T = unknown>(path: string, init?: RequestInit, timeoutMs = 5000): Promise<T> {
  if (!apiEnabled) throw new Error('api_disabled');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(base + path, {
      ...init,
      signal: controller.signal,
      headers: init?.body ? { 'Content-Type': 'application/json', ...init.headers } : init?.headers,
    });
    if (!res.ok) throw new Error('api_' + res.status);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const post = <T = unknown>(path: string, body: unknown, timeoutMs?: number) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(body) }, timeoutMs);

export const newId = () => Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
