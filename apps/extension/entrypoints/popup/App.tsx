import { useEffect, useState } from 'react'
import { appUrl, EMPTY_SYNC, type SyncState } from '../../src/api'

type Boot = {
  settings: { restrictionLevel: string; monitoringEnabled: boolean }
  sites: Array<{ domain: string; enabled: boolean }>
  extension: { linked: boolean; lastSeenAt: string | null; online: boolean }
}

function connectionLine(sync: SyncState, linked: boolean): string {
  if (!linked && sync.status === 'unlinked') return 'Not linked.'
  const when = sync.lastSyncAt ? `Last synced ${new Date(sync.lastSyncAt).toLocaleTimeString()}.` : 'Not synced yet.'
  if (sync.status === 'unauthorized') return `This browser was signed out. Link it again with a new code. ${when}`
  if (sync.status === 'offline') return `Cannot reach Impulse. Using the last known settings. ${when}`
  return `Connected. ${when}`
}

export function App() {
  const [code, setCode] = useState('')
  const [boot, setBoot] = useState<Boot | null>(null)
  const [saved, setSaved] = useState<Array<{ id: string; domain: string; status: string }>>([])
  const [note, setNote] = useState('')
  const [sync, setSync] = useState<SyncState>(EMPTY_SYNC)
  const [settingsUrl, setSettingsUrl] = useState('')

  async function refresh() {
    const reply = await chrome.runtime.sendMessage({ type: 'bootstrap' })
    if (!reply?.ok) {
      setNote(reply?.error ?? 'Link the extension first.')
      return
    }
    setBoot(reply.boot)
    setSaved(reply.saved.items ?? [])
    setSync(reply.sync ?? EMPTY_SYNC)
  }

  useEffect(() => {
    void refresh()
    void appUrl().then(setSettingsUrl)
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local' || !changes.sync) return
      const next = { ...EMPTY_SYNC, ...(changes.sync.newValue as Partial<SyncState> | undefined) }
      const before = { ...EMPTY_SYNC, ...(changes.sync.oldValue as Partial<SyncState> | undefined) }
      setSync(next)
      if (next.revision !== before.revision || next.status !== before.status) void refresh()
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  function toggleMonitoring() {
    if (!boot) return
    void chrome.runtime.sendMessage({ type: 'monitoring', enabled: !boot.settings.monitoringEnabled }).then((reply) => {
      setNote(reply?.ok ? '' : reply?.error ?? 'Could not change monitoring.')
      return refresh()
    })
  }

  return (
    <main
      style={{
        width: 320,
        padding: 16,
        background: '#050505',
        color: '#f6efe6',
        fontFamily: '"Satoshi", Helvetica, Arial, sans-serif',
        letterSpacing: '-0.01em',
      }}
    >
      <style>{`@import url('https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&f[]=neco@400,500&display=swap');`}</style>
      <p style={{ letterSpacing: 1, fontSize: 12, color: '#8c857c' }}>IMPULSE</p>
      <h1
        style={{
          fontSize: 28,
          margin: '8px 0',
          fontFamily: '"Neco", Georgia, serif',
          fontWeight: 400,
          letterSpacing: '-0.03em',
        }}
      >
        {boot?.settings.restrictionLevel ?? 'Not linked'}
      </h1>
      <p style={{ color: '#8c857c' }}>
        {boot?.extension.linked
          ? `Last seen ${boot.extension.lastSeenAt}. ${boot.extension.online ? 'Recent.' : 'Not active right now.'}`
          : 'Paste the code from the phone.'}
      </p>
      <p style={{ color: '#8c857c', fontSize: 13 }}>{connectionLine(sync, Boolean(boot?.extension.linked))}</p>
      {boot ? (
        <p>
          Monitoring is {boot.settings.monitoringEnabled ? 'on' : 'off'}.{' '}
          <button type="button" onClick={toggleMonitoring}>
            {boot.settings.monitoringEnabled ? 'Turn off' : 'Turn on'}
          </button>
        </p>
      ) : null}
      <input aria-label="Pair code" value={code} onChange={(event) => setCode(event.target.value)} style={{ width: '100%', margin: '8px 0' }} />
      <button
        type="button"
        onClick={() =>
          void chrome.runtime.sendMessage({ type: 'pair', code }).then((reply) => {
            setNote(reply?.ok ? 'Linked.' : reply?.error ?? 'Could not link.')
            return refresh()
          })
        }
      >
        Link account
      </button>
      <button
        type="button"
        onClick={() =>
          void chrome.permissions
            .request({ origins: (boot?.sites ?? []).filter((site) => site.enabled).map((site) => `https://*.${site.domain}/*`) })
            .then(() => refresh())
        }
      >
        Allow selected sites
      </button>
      <ul>
        {saved.slice(0, 4).map((item) => (
          <li key={item.id}>
            {item.domain} · {item.status}
          </li>
        ))}
      </ul>
      {settingsUrl ? (
        <p>
          <a href={settingsUrl} target="_blank" rel="noreferrer" style={{ color: '#fff3d6' }}>
            Account settings
          </a>
        </p>
      ) : null}
      <p style={{ color: '#8c857c', fontSize: 12 }}>
        Pauses supported checkout pages in Chrome on sites you allowed. It does not cover native apps or every payment.
      </p>
      {note ? <p>{note}</p> : null}
    </main>
  )
}
