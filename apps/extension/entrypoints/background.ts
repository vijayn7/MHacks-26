import { shouldIntervene, type ProtectedSite, type UserSettings } from '@impulse/shared'
import { extensionFetch } from '../src/api'

type Bootstrap = { settings: UserSettings; sites: ProtectedSite[] }
type QueueItem = { id: string; path: string; body: unknown }

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    void handle(message)
      .then((result) => sendResponse(result))
      .catch((error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : 'failed' }))
    return true
  })
  chrome.alarms.create('flush', { periodInMinutes: 1 })
  chrome.alarms.onAlarm.addListener(() => void flush())
})

async function handle(message: { type: string; url?: string; title?: string; amountCents?: number | null; body?: unknown; code?: string }) {
  if (message.type === 'evaluate' && message.url) {
    const boot = await bootstrap()
    const decision = shouldIntervene({
      url: message.url,
      monitoringEnabled: boot.settings.monitoringEnabled,
      sites: boot.sites,
    })
    return { ok: true, decision, reflectionSeconds: boot.settings.reflectionSeconds }
  }
  if (message.type === 'act' && message.body) {
    try {
      const result = await extensionFetch('/api/interventions', { body: message.body })
      return { ok: true, result }
    } catch (error) {
      await enqueue('/api/interventions', message.body)
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
    await chrome.storage.local.set({ token: result.token })
    await syncScripts()
    return { ok: true }
  }
  if (message.type === 'bootstrap') {
    const boot = await bootstrap()
    await syncScripts()
    return { ok: true, boot, saved: await extensionFetch('/api/saved') }
  }
  return { ok: false }
}

async function bootstrap(): Promise<Bootstrap> {
  const cached = await chrome.storage.session.get('bootstrap')
  const hit = cached.bootstrap as { at: number; data: Bootstrap } | undefined
  if (hit && Date.now() - hit.at < 30_000) return hit.data
  const data = (await extensionFetch('/api/extension/bootstrap')) as Bootstrap
  await chrome.storage.session.set({ bootstrap: { at: Date.now(), data } })
  return data
}

async function syncScripts() {
  const boot = await bootstrap()
  const origins = boot.sites.filter((site) => site.enabled).map((site) => `https://*.${site.domain}/*`)
  if (!origins.length || !boot.settings.monitoringEnabled) return
  const granted = await chrome.permissions.contains({ origins })
  if (!granted) return
  const existing = await chrome.scripting.getRegisteredContentScripts()
  if (existing.some((script) => script.id === 'impulse-guard')) {
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
    } catch {
      remain.push(item)
    }
  }
  await chrome.storage.local.set({ queue: remain })
}
