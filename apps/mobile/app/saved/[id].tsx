import * as Linking from 'expo-linking'
import { useLocalSearchParams } from 'expo-router'
import { useState } from 'react'
import { Text } from 'react-native'
import { api } from '../../src/api'
import { Hold } from '../../src/Hold'
import { type } from '../../src/theme'
import { Button, Eyebrow, Screen } from '../../src/ui'

export default function SavedDetail() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const [url, setUrl] = useState('')
  const [note, setNote] = useState('Hold until the ember cools. Then the link is yours to open.')

  return (
    <Screen>
      <Eyebrow>REVIEW</Eyebrow>
      <Text style={type.title}>Put the fire out slowly.</Text>
      <Hold
        seconds={8}
        label="Hold to cool this off"
        onComplete={() => {
          if (!id) return
          void api<{ url: string; scoreAwarded: number }>(`/api/saved/${id}/revisit`)
            .then((result) => {
              setUrl(result.url)
              setNote(result.scoreAwarded ? 'Reviewed after the cooldown.' : 'Already reviewed.')
            })
            .catch((err: unknown) => setNote(err instanceof Error ? err.message : 'Still cooling down.'))
        }}
      />
      <Text style={type.ash}>{note}</Text>
      {url ? <Button label="Open the page" onPress={() => void Linking.openURL(url)} /> : null}
      <Button ghost label="I bought it" onPress={() => void api(`/api/saved/${id}/purchased`, { body: {} })} />
      <Button ghost label="Remove" onPress={() => void api(`/api/saved/${id}`, { method: 'DELETE' })} />
    </Screen>
  )
}
