import { useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Pressable, Text } from 'react-native'
import { api } from '../../src/api'
import { useLive } from '../../src/live'
import { type } from '../../src/theme'
import { Card, Eyebrow, Screen } from '../../src/ui'

type Item = { id: string; domain: string; itemName: string | null; status: string; amountCents: number | null; cooldownUntil: string }

export default function Saved() {
  const router = useRouter()
  const [items, setItems] = useState<Item[]>([])

  const load = useCallback(async () => {
    setItems((await api<{ items: Item[] }>('/api/saved')).items)
  }, [])

  const { error } = useLive(load)

  return (
    <Screen>
      <Eyebrow>SAVED</Eyebrow>
      <Text style={type.title}>Waiting on purpose.</Text>
      {items.map((item) => (
        <Pressable key={item.id} onPress={() => router.push({ pathname: '/saved/[id]', params: { id: item.id } })}>
          <Card>
            <Text style={type.body}>{item.itemName || item.domain}</Text>
            <Text style={type.ash}>
              {item.status}
              {item.amountCents == null ? '' : ` · $${(item.amountCents / 100).toFixed(2)}`}
            </Text>
          </Card>
        </Pressable>
      ))}
      {error ? <Text style={type.ash}>{error}</Text> : null}
      {items.length === 0 ? <Text style={type.ash}>Nothing saved yet.</Text> : null}
    </Screen>
  )
}
