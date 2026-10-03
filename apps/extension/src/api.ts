export const API_BASE = 'http://localhost:3000'

export async function extensionFetch(path: string, init: { method?: string; body?: unknown; token?: string | null } = {}) {
  const stored = await chrome.storage.local.get(['token', 'apiBase'])
  const token = init.token === undefined ? (stored.token as string | undefined) : init.token
  const base = (stored.apiBase as string | undefined) || API_BASE
  const response = await fetch(`${base}${path}`, {
    method: init.method ?? (init.body ? 'POST' : 'GET'),
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const json = await response.json()
  if (!response.ok) throw new Error(json.error?.message ?? 'Request failed')
  return json
}
