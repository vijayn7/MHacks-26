export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000'
export const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined) || ''

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

export type SyncState = {
  revision: string | null
  lastSyncAt: number | null
  lastAttemptAt: number | null
  status: 'unlinked' | 'ok' | 'offline' | 'unauthorized'
}

export const EMPTY_SYNC: SyncState = { revision: null, lastSyncAt: null, lastAttemptAt: null, status: 'unlinked' }

export async function apiBase(): Promise<string> {
  const stored = await chrome.storage.local.get('apiBase')
  return (stored.apiBase as string | undefined) || API_BASE
}

export async function appUrl(): Promise<string> {
  const stored = await chrome.storage.local.get('appUrl')
  return (stored.appUrl as string | undefined) || APP_URL || (await apiBase())
}

export async function readSync(): Promise<SyncState> {
  const stored = await chrome.storage.local.get('sync')
  return { ...EMPTY_SYNC, ...(stored.sync as Partial<SyncState> | undefined) }
}

export async function extensionFetch(path: string, init: { method?: string; body?: unknown; token?: string | null } = {}) {
  const stored = await chrome.storage.local.get(['token'])
  const token = init.token === undefined ? (stored.token as string | undefined) : init.token
  const base = await apiBase()
  const response = await fetch(`${base}${path}`, {
    method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const json = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(json?.error?.message ?? 'Request failed', response.status)
  return json
}

/** True when a failure came from the network or a server fault, not from the API rejecting the request. */
export function isTransient(error: unknown): boolean {
  return !(error instanceof ApiError) || error.status >= 500
}
