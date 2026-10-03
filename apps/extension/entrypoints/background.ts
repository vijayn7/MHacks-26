import { shouldIntervene, type ProtectedSite, type UserSettings } from '@impulse/shared'
import { ApiError, extensionFetch, isTransient, readSync, type SyncState } from '../src/api'

type Bootstrap = { settings: UserSettings; sites: ProtectedSite[] }
type QueueItem = { id: string; path: string; body: unknown }

const FLUSH_ALARM = 'flush'
const CHANGES_ALARM = 'changes'

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void handle(message)
      .then((result) => sendResponse(result))
      .catch((error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : 'failed' }))
    return true
  })
  void ensureAlarm(FLUSH_ALARM, 1)
  void ensureAlarm(CHANGES_ALARM, 0.5)
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === FLUSH_ALARM) void flush()
    if (alarm.name === CHANGES_ALARM) void pollChanges()
  })
  chrome.runtime.onStartup.addListener(() => void pollChanges())
  chrome.runtime.onInstalled.addListener(() => void pollChanges())
})

async function ensureAlarm(name: string, periodInMinutes: number) {
  const existing = await chrome.alarms.get(name)
  if (existing?.periodInMinutes !== periodInMinutes) await chrome.alarms.create(name, { periodInMinutes, delayInMinutes: periodInMinutes })
}

async function writeSync(patch: Partial<SyncState>) {
  const current = await readSync()
  await chrome.storage.local.set({ sync: { ...current, ...patch } })
}

/**
 * Asks the change feed whether anything about this account moved. The browser
 * only holds a session, so on a change it re-reads its own settings and
 * re-registers the content script. If the request fails it keeps what it knew.
 */
async function pollChanges() {
  const stored = await chrome.storage.local.get('token')
  if (!stored.token) {
    await writeSync({ status: 'unlinked' })
    return
  }
  const before = await readSync()
  if (before.status === 'unauthorized') return
  const attemptedAt = Date.now()
  try {
    const query = before.revision ? `?since=${encodeURIComponent(before.revision)}` : ''
    const feed = (await extensionFetch(`/api/changes${query}`)) as { revision: string; changed: boolean }
    const changed = feed.changed || feed.revision !== before.revision
    if (changed) {
      await chrome.storage.session.remove('bootstrap')
      await bootstrap(true)
      await syncScripts()
    }
    await writeSync({ revision: feed.revision, lastSyncAt: Date.now(), lastAttemptAt: attemptedAt, status: 'ok' })
  } catch (error) {
    const rejected = error instanceof ApiError && (error.status === 401 || error.status === 403)
    await writeSync({ lastAttemptAt: attemptedAt, status: rejected ? 'unauthorized' : 'offline' })
  }
}

async function applyMonitoring(enabled: boolean) {
  const result = (await extensionFetch('/api/extension/monitoring', { body: { enabled } })) as { monitoringEnabled: boolean }
  await chrome.storage.session.remove('bootstrap')
  await bootstrap(true)
  await syncScripts()
  await pollChanges()
  return result.monitoringEnabled
}

async function handle(message: { type: string; url?: string; title?: string; amountCents?: number | null; body?: unknown; code?: string; enabled?: boolean }) {
  if (message.type === 'evaluate' && message.url) {
    const boot = await bootstrap()
    const decision = shouldIntervene({
      url: message.url,
      monitoringEnabled: boot.settings.monitoringEnabled,
      sites: boot.sites,
    })
    return { ok: true, decision, reflectionSeconds: boot.settings.reflectionSeconds }
  }
  // Session storage is not readable from a content script, so the once-per-page
  // check has to happen here.
  if (message.type === 'claim-page' && message.url) {
    const key = `seen:${message.url}`
    const existing = await chrome.storage.session.get(key)
    if (existing[key]) return { ok: true, first: false }
    await chrome.storage.session.set({ [key]: Date.now() })
    return { ok: true, first: true }
  }
  if (message.type === 'act' && message.body) {
    try {
      const result = await extensionFetch('/api/interventions', { body: message.body })
      return { ok: true, result }
    } catch (error) {
      if (isTransient(error)) await enqueue('/api/interventions', message.body)
      throw error
    }
  }
  if (message.type === 'approval' && message.body) {
    const result = await extensionFetch('/api/approvals', { body: message.body })
    return { ok: true, result }
  }
  if (message.type === 'approval-status' && message.body && typeof message.body === 'object' && 'id' in message.body) {
    const result = await extensionFetch(`/api/approvals/${String((message.body as { id: string }).id)}`, { method: 'GET' })
    return { ok: true, result }
  }
  if (message.type === 'pair' && message.code) {
    const result = await extensionFetch('/api/extension/pair', { token: null, body: { code: message.code, deviceLabel: 'Chrome' } })
    await chrome.storage.local.set({ token: result.token, sync: { revision: null, lastSyncAt: null, lastAttemptAt: null, status: 'unlinked' } })
    await chrome.storage.session.remove('bootstrap')
    await syncScripts()
    await pollChanges()
    return { ok: true }
  }
  if (message.type === 'monitoring' && typeof message.enabled === 'boolean') {
    return { ok: true, monitoringEnabled: await applyMonitoring(message.enabled) }
  }
  if (message.type === 'poll') {
    await pollChanges()
    return { ok: true }
  }
  if (message.type === 'bootstrap') {
    const boot = await bootstrap()
    await syncScripts()
    const saved = await extensionFetch('/api/saved').catch(() => ({ items: [] }))
    return { ok: true, boot, saved, sync: await readSync() }
  }
  return { ok: false }
}

/**
 * The last good bootstrap is kept in local storage. When the API cannot be
 * reached the extension keeps using it instead of silently turning protection
 * off, and the popup shows when it was last confirmed.
 */
async function bootstrap(force = false): Promise<Bootstrap> {
  if (!force) {
    const cached = await chrome.storage.session.get('bootstrap')
    const hit = cached.bootstrap as { at: number; data: Bootstrap } | undefined
    if (hit && Date.now() - hit.at < 30_000) return hit.data
  }
  try {
    const data = (await extensionFetch('/api/extension/bootstrap')) as Bootstrap
    await chrome.storage.session.set({ bootstrap: { at: Date.now(), data } })
    await chrome.storage.local.set({ lastBootstrap: data })
    return data
  } catch (error) {
    const last = (await chrome.storage.local.get('lastBootstrap')).lastBootstrap as Bootstrap | undefined
    if (!force && last && !(error instanceof ApiError && error.status === 401)) return last
    throw error
  }
}

async function syncScripts() {
  const boot = await bootstrap()
  const origins = boot.sites.filter((site) => site.enabled).map((site) => `https://*.${site.domain}/*`)
  const existing = await chrome.scripting.getRegisteredContentScripts()
  const registered = existing.some((script) => script.id === 'impulse-guard')
  const granted = origins.length > 0 && boot.settings.monitoringEnabled && (await chrome.permissions.contains({ origins }))
  if (!granted) {
    if (registered) await chrome.scripting.unregisterContentScripts({ ids: ['impulse-guard'] })
    return
  }
  if (registered) {
    await chrome.scripting.unregisterContentScripts({ ids: ['impulse-guard'] })
  }
  await chrome.scripting.registerContentScripts([
    {
      id: 'impulse-guard',
      js: ['content-scripts/content.js'],
      matches: origins,
      runAt: 'document_idle',
      persistAcrossSessions: true,
    },
  ])
}

async function enqueue(path: string, body: unknown) {
  const stored = await chrome.storage.local.get('queue')
  const queue = (stored.queue as QueueItem[] | undefined) ?? []
  queue.push({ id: crypto.randomUUID(), path, body })
  await chrome.storage.local.set({ queue })
}

async function flush() {
  const stored = await chrome.storage.local.get('queue')
  const queue = (stored.queue as QueueItem[] | undefined) ?? []
  const remain: QueueItem[] = []
  for (const item of queue) {
    try {
      await extensionFetch(item.path, { body: item.body })
    } catch (error) {
      if (isTransient(error)) remain.push(item)
    }
  }
  await chrome.storage.local.set({ queue: remain })
}
