'use client'

import { useParams } from 'next/navigation'
import { useState } from 'react'

export default function TrustPage() {
  const params = useParams<{ token: string }>()
  const [message, setMessage] = useState('')

  async function accept() {
    const response = await fetch('/api/trusted/accept', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: params.token }),
    })
    const body = await response.json()
    setMessage(response.ok ? 'You can receive approval requests. You still cannot spend or block for them.' : body.error?.message)
  }

  return (
    <main>
      <p className="ash">Trusted contact</p>
      <h1>Agree to be asked, not to be in charge.</h1>
      <p>If you accept, you may get a link when they ask about a single purchase. You can ignore it. You can stop later when they remove you.</p>
      <button type="button" onClick={() => void accept()}>
        I agree
      </button>
      {message ? <p className="ash">{message}</p> : null}
    </main>
  )
}
