'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function ApprovePage() {
  const params = useParams<{ token: string }>()
  const token = params.token
  const [preview, setPreview] = useState<{ status: string; domain: string } | null>(null)
  const [message, setMessage] = useState('Loading the request.')

  useEffect(() => {
    void fetch('/api/approvals/preview', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (response) => {
        if (!response.ok) {
          setMessage('This link is not active.')
          return
        }
        setPreview(await response.json())
        setMessage('')
      })
      .catch(() => setMessage('Could not reach Impulse.'))
  }, [token])

  async function respond(decision: 'approve' | 'decline') {
    const response = await fetch('/api/approvals/respond', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, decision }),
    })
    const body = await response.json()
    setMessage(response.ok ? `Marked ${body.status}.` : body.error?.message ?? 'Could not answer.')
    setPreview(null)
  }

  return (
    <main>
      <p className="ash">One purchase. One answer.</p>
      <h1>{preview ? `A pause on ${preview.domain}` : 'Approval'}</h1>
      {preview?.status === 'pending' ? (
        <>
          <p>You are not taking over anyone’s account. You are answering a single request they chose to send.</p>
          <p>
            <button type="button" onClick={() => void respond('approve')}>
              Approve this one
            </button>{' '}
            <button type="button" className="secondary" onClick={() => void respond('decline')}>
              Decline
            </button>
          </p>
        </>
      ) : null}
      {message ? <p className="ash">{message}</p> : null}
    </main>
  )
}
