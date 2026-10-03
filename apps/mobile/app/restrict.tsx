import type { RestrictionLevel } from '@impulse/shared'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text } from 'react-native'
import { chooseLevel, getDraft } from '../src/draft'
import { colors, type } from '../src/theme'
import { Button, Card, Eyebrow, Screen } from '../src/ui'

const levels: Array<{ id: RestrictionLevel; title: string; copy: string }> = [
  { id: 'low', title: 'Low', copy: 'A reminder, and an optional moment to reflect.' },
  { id: 'medium', title: 'Mid', copy: 'Continuing takes a short wait you set.' },
  { id: 'high', title: 'High', copy: 'The wait, plus an optional ask to someone you trust.' },
]

export default function Restrict() {
  const router = useRouter()
  const recommended = getDraft().recommendedLevel ?? getDraft().chosenLevel ?? 'medium'
  const [chosen, setChosen] = useState<RestrictionLevel>(getDraft().chosenLevel ?? recommended)

  return (
    <Screen>
      <Eyebrow>RESTRICTION</Eyebrow>
      <Text style={type.title}>How firm should the pause be?</Text>
      <Text style={type.ash}>Suggested: {recommended}. You can reject it.</Text>
      {levels.map((level) => (
        <Pressable key={level.id} onPress={() => setChosen(level.id)}>
          <Card>
            <Text style={type.body}>
              {level.title}
              {chosen === level.id ? '  ·  selected' : ''}
            </Text>
            <Text style={type.ash}>{level.copy}</Text>
          </Card>
        </Pressable>
      ))}
      <Button
        label="Keep this"
        onPress={() => {
          chooseLevel(chosen)
          router.push('/auth')
        }}
      />
    </Screen>
  )
}
