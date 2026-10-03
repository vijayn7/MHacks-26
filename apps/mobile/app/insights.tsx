import { useEffect, useState } from 'react'
import { Text } from 'react-native'
import { api } from '../src/api'
import { type } from '../src/theme'
import { Button, Eyebrow, Screen } from '../src/ui'

export default function Insights() {
  const [summary, setSummary] = useState('')
  const [source, setSource] = useState('')

  function load(period: 'week' | 'month') {
    void api<{ summary: string; source: string }>('/api/insights/summary', { body: { period } }).then((result) => {
      setSummary(result.summary)
      setSource(result.source)
    })
  }

  useEffect(() => {
    load('week')
  }, [])

  return (
    <Screen>
      <Eyebrow>INSIGHTS</Eyebrow>
      <Text style={type.title}>{summary || 'Reading the record.'}</Text>
      <Text style={type.ash}>{source === 'ai' ? 'Written from your counts.' : 'Counted locally. No model in the loop.'}</Text>
      <Button label="This week" onPress={() => load('week')} />
      <Button ghost label="This month" onPress={() => load('month')} />
    </Screen>
  )
}
