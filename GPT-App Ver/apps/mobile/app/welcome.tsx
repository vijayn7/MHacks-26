import { useRouter } from 'expo-router'
import { Text } from 'react-native'
import { type } from '../src/theme'
import { Button, Eyebrow, Screen } from '../src/ui'

export default function Welcome() {
  const router = useRouter()
  return (
    <Screen>
      <Eyebrow>IMPULSE</Eyebrow>
      <Text style={type.display}>A pause before the purchase.</Text>
      <Text style={type.body}>
        For adults who want a moment between the urge and the payment. Not a lock on your money. Not a game.
      </Text>
      <Button label="Begin" onPress={() => router.push('/chat')} />
    </Screen>
  )
}
