import * as SecureStore from 'expo-secure-store'

const BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000'

export async function loadToken(): Promise<string | null> {
  return SecureStore.getItemAsync('impulse.token')
}

export async function saveToken(token: string | null): Promise<void> {
  if (!token) await SecureStore.deleteItemAsync('impulse.token')
  else await SecureStore.setItemAsync('impulse.token', token)
}

export async function api<T>(path: string, init: { method?: string; body?: unknown; token?: string | null } = {}): Promise<T> {
  const token = init.token === undefined ? await loadToken() : init.token
  const response = await fetch(`${BASE}${path}`, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const json = (await response.json()) as T & { error?: { message: string } }
  if (!response.ok) throw new Error(json.error?.message ?? 'Request failed')
  return json
}
