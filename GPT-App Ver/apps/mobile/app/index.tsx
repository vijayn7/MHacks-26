import { Redirect } from 'expo-router'
import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import { api, loadToken } from '../src/api'
import { Screen } from '../src/ui'

export default function Index() {
  const [href, setHref] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    void (async () => {
      const token = await loadToken()
      if (!token) {
        setHref('/welcome')
        return
      }
      try {
        const me = await api<{ settings: { onboardingComplete: boolean } }>('/api/me')
        setHref(me.settings.onboardingComplete ? '/(tabs)/home' : '/chat')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not reach Impulse.')
        setHref('/welcome')
      }
    })()
  }, [])

  if (!href) {
    return (
      <Screen>
        <Text>{error || 'Opening Impulse.'}</Text>
      </Screen>
    )
  }
  return <Redirect href={href as '/welcome'} />
}
