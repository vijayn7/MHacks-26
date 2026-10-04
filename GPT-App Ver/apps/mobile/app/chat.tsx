import { advanceOnboarding, emptyDraft } from '@impulse/shared'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { getDraft, setDraft } from '../src/draft'
import { colors, type } from '../src/theme'
import { Button, Eyebrow, Screen } from '../src/ui'

export default function Chat() {
  const router = useRouter()
  const [reply, setReply] = useState('Where does the urge usually show up — shopping, betting, or both?')
  const [suggestions, setSuggestions] = useState(['Shopping', 'Betting', 'Both'])
  const [text, setText] = useState('')

  function send(message: string) {
    const step = advanceOnboarding(getDraft().step ? getDraft() : emptyDraft(), message)
    setDraft(step.draft)
    setReply(step.reply)
    setSuggestions(step.suggestions)
    setText('')
    if (step.done) router.push('/restrict')
  }

  return (
    <Screen>
      <Eyebrow>ONBOARDING</Eyebrow>
      <Text style={type.title}>{reply}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {suggestions.map((item) => (
          <Pressable key={item} onPress={() => send(item)} style={{ borderWidth: 1, borderColor: colors.ink, padding: 8 }}>
            <Text>{item}</Text>
          </Pressable>
        ))}
      </View>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Or type it"
        placeholderTextColor={colors.ash}
        style={{ borderBottomWidth: 1, borderColor: colors.line, paddingVertical: 8, color: colors.ink }}
      />
      <Button label="Send" onPress={() => send(text)} />
    </Screen>
  )
}
