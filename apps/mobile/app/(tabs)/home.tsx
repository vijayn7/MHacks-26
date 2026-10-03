import type { HomeSnapshot } from '@impulse/shared'
import { useRouter } from 'expo-router'
import { useCallback, useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, Text } from 'react-native'
import { api } from '../../src/api'
import { colors, type } from '../../src/theme'
import { Card, Eyebrow, Screen } from '../../src/ui'

export default function Home() {
  const router = useRouter()
  const [data, setData] = useState<HomeSnapshot | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setData(await api<HomeSnapshot>('/api/home'))
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load home.')
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = setInterval(() => void load(), 8000)
    return () => clearInterval(timer)
  }, [load])

  const money =
    data?.avoidedCents == null ? 'No amounts recorded' : `$${(data.avoidedCents / 100).toFixed(2)} left unspent`

  return (
    <Screen>
      <ScrollView refreshControl={<RefreshControl refreshing={false} onRefresh={() => void load()} />}>
        <Eyebrow>HOME</Eyebrow>
        <Text style={type.display}>{data ? data.score : '—'}</Text>
        <Text style={type.ash}>{data ? `${data.streakDays} day streak` : 'Score'}</Text>
        {error ? <Text style={type.ash}>{error}</Text> : null}
        <Card>
          <Text style={type.body}>{data ? `${data.interventions} interventions` : '…'}</Text>
          <Text style={type.ash}>{data ? `${data.saved} saved · ${data.abandoned} dropped` : ''}</Text>
          <Text style={type.ash}>{money}</Text>
        </Card>
        <Card>
          <Text style={type.body}>This week</Text>
          <Text style={type.ash}>
            {data
              ? `${data.week.continued} continued · ${data.week.saved} saved · ${data.week.abandoned} dropped`
              : ''}
          </Text>
        </Card>
        <Card>
          <Text style={type.body}>Extension</Text>
          <Text style={type.ash}>
            {data?.extension.linked
              ? `Last seen ${data.extension.lastSeenAt}. ${data.extension.online ? 'Seen recently.' : 'Not active right now.'}`
              : 'Not linked.'}
          </Text>
        </Card>
        {data?.challenge ? (
          <Card>
            <Text style={type.body}>{data.challenge.title}</Text>
            <Text style={type.ash}>
              {data.challenge.progress} / {data.challenge.goal}
            </Text>
          </Card>
        ) : null}
        {(data?.recent ?? []).map((item) => (
          <Text key={item.id} style={type.ash}>
            {item.domain} · {item.decision}
            {item.amountCents == null ? '' : ` · $${(item.amountCents / 100).toFixed(2)}`}
          </Text>
        ))}
        <Pressable onPress={() => router.push('/saved')}>
          <Text style={{ color: colors.ink, marginTop: 12 }}>Saved for later</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/insights')}>
          <Text style={{ color: colors.ink }}>Insights</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  )
}
