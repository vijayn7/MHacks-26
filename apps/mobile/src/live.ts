import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState } from 'react-native'
import { api } from './api'

type Changes = { revision: string; changed: boolean }

const WAIT_MS = 25_000
const BASE_BACKOFF_MS = 1_000
const MAX_BACKOFF_MS = 30_000

export function backoffDelay(failures: number): number {
  return Math.min(BASE_BACKOFF_MS * 2 ** Math.max(failures - 1, 0), MAX_BACKOFF_MS)
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : 'Could not refresh.'
}

/**
 * Loads once, then long-polls the change feed and reloads only when the server
 * reports a new revision. Pauses while the app is in the background and stops on unmount.
 */
export function useLive(load: () => Promise<void>): { refresh: () => Promise<void>; error: string } {
  const loadRef = useRef(load)
  loadRef.current = load
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    let run = 0

    const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

    async function loop(id: number) {
      const current = () => alive && run === id
      let failures = 0
      let revision: string | null = null
      while (current()) {
        try {
          if (revision === null) {
            const head = await api<Changes>('/api/changes')
            if (!current()) return
            revision = head.revision
            await loadRef.current()
          } else {
            const next: Changes = await api<Changes>(`/api/changes?since=${encodeURIComponent(revision)}&waitMs=${WAIT_MS}`)
            if (!current()) return
            if (next.changed) {
              revision = next.revision
              await loadRef.current()
            }
          }
          if (!current()) return
          failures = 0
          setError('')
        } catch (err) {
          if (!current()) return
          failures += 1
          setError(message(err))
          await sleep(backoffDelay(failures))
        }
      }
    }

    function start() {
      run += 1
      void loop(run)
    }

    function stop() {
      run += 1
    }

    if (AppState.currentState === 'active') start()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') start()
      else stop()
    })

    return () => {
      alive = false
      subscription.remove()
    }
  }, [])

  const refresh = useCallback(async () => {
    try {
      await loadRef.current()
      setError('')
    } catch (err) {
      setError(message(err))
    }
  }, [])

  return { refresh, error }
}
