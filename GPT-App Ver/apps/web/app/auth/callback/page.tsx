'use client'

import { useEffect, useState } from 'react'

export default function AuthCallbackPage() {
  const [note, setNote] = useState('Returning to Impulse.')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (!code) {
      setNote('Google did not return a code. You can close this page and try again from the app.')
      return
    }
    window.location.replace(`impulse://auth?code=${encodeURIComponent(code)}`)
  }, [])

  return (
    <main>
      <h1>Sign-in handoff</h1>
      <p className="ash">{note}</p>
    </main>
  )
}
