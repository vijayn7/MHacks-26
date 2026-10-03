import { useEffect, useState } from 'react'

type Boot = {
  settings: { restrictionLevel: string; monitoringEnabled: boolean }
  sites: Array<{ domain: string; enabled: boolean }>
  extension: { linked: boolean; lastSeenAt: string | null; online: boolean }
}

export function App() {
  const [code, setCode] = useState('')
  const [boot, setBoot] = useState<Boot | null>(null)
  const [saved, setSaved] = useState<Array<{ id: string; domain: string; status: string }>>([])
  const [note, setNote] = useState('')

  async function refresh() {
    const reply = await chrome.runtime.sendMessage({ type: 'bootstrap' })
    if (!reply?.ok) {
      setNote(reply?.error ?? 'Link the extension first.')
      return
    }
    setBoot(reply.boot)
    setSaved(reply.saved.items ?? [])
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <main style={{ width: 320, padding: 16, background: '#f6f3ee', color: '#1c140f', fontFamily: 'Georgia, serif' }}>
      <p style={{ letterSpacing: 1, fontSize: 12, color: '#8c857c' }}>IMPULSE</p>
      <h1 style={{ fontSize: 28, margin: '8px 0' }}>{boot?.settings.restrictionLevel ?? 'Not linked'}</h1>
      <p style={{ color: '#8c857c' }}>
        {boot?.extension.linked
          ? `Last seen ${boot.extension.lastSeenAt}. ${boot.extension.online ? 'Recent.' : 'Not active right now.'}`
          : 'Paste the code from the phone.'}
      </p>
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
      {note ? <p>{note}</p> : null}
    </main>
  )
}
