import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import { api } from '../src/api'
import { type } from '../src/theme'
import { Button, Eyebrow, Screen } from '../src/ui'

export default function Connect() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [status, setStatus] = useState('Not linked yet.')

  async function refresh() {
    const next = await api<{ code: string }>('/api/extension/pair-code', { body: {} })
    setCode(next.code)
    const link = await api<{ linked: boolean; online: boolean; lastSeenAt: string | null }>('/api/extension/status')
    setStatus(link.linked ? `Last seen ${link.lastSeenAt}. ${link.online ? 'Recent.' : 'Not currently active.'}` : 'Waiting for the extension.')
  }

  useEffect(() => {
    void refresh()
  }, [])

  return (
    <Screen>
      <Eyebrow>CHROME</Eyebrow>
      <Text style={type.title}>{code || '····'}</Text>
      <Text style={type.body}>Type this in the extension. It expires in ten minutes and works once. The extension does not stay “online” just because it linked.</Text>
      <Text style={type.ash}>{status}</Text>
      <Button label="New code" onPress={() => void refresh()} />
      <Button ghost label="Go to home" onPress={() => router.replace('/(tabs)/home')} />
    </Screen>
  )
}
