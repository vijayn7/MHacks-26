'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'

export default function FriendInvitePage() {
  const params = useParams<{ token: string }>()
  const [name, setName] = useState('')
  const [message, setMessage] = useState('Sign in, then accept. This does not make you a trusted contact.')

  async function accept() {
    const auth = await fetch('/api/auth/dev', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ displayName: name || 'Friend' }),
    })
    const session = await auth.json()
    if (!auth.ok) {
      setMessage(session.error?.message ?? 'Sign-in failed.')
      return
    }
    const response = await fetch('/api/friends/accept', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${session.token}` },
      body: JSON.stringify({ token: params.token }),
    })
    const body = await response.json()
    setMessage(response.ok ? 'You are connected. Open Impulse on your phone with this same development account if you want the social tab.' : body.error?.message)
  }

  return (
    <main>
      <p className="ash">Friend invitation</p>
      <h1>This is a friend, not a guardian.</h1>
      <p>Friends can share challenges. They do not see purchases and they cannot approve spending unless you also invite them as a trusted contact from your own phone.</p>
      <p>
        <input aria-label="Your name" value={name} onChange={(event) => setName(event.target.value)} placeholder="Your name" />
      </p>
      <button type="button" onClick={() => void accept()}>
        Accept in development
      </button>
      <p className="ash">{message}</p>
    </main>
  )
}
