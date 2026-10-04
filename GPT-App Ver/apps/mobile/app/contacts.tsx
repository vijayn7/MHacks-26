import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Text, TextInput } from 'react-native'
import { api } from '../src/api'
import { colors, type } from '../src/theme'
import { Button, Eyebrow, Screen } from '../src/ui'

export default function Contacts() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  async function invite() {
    try {
      const created = await api<{ url: string; sms: 'sent' | 'share' | 'failed' }>('/api/trusted', {
        body: { displayName: name || 'Sam', email: email || undefined, phone: phone || undefined },
      })
      if (created.sms !== 'sent') {
        try {
          await Linking.openURL(`sms:${phone ? encodeURIComponent(phone) : ''}&body=${encodeURIComponent(`Can I ask you before some purchases? ${created.url}`)}`)
        } catch {
          setError(created.sms === 'failed' ? 'The text did not send. Share this link yourself.' : 'Messages did not open. Share the link from your account.')
        }
      }
      router.replace('/connect')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the invite.')
    }
  }

  return (
    <Screen>
      <Eyebrow>TRUSTED CONTACT</Eyebrow>
      <Text style={type.title}>Someone who can answer one request.</Text>
      <Text style={type.body}>They never get control of your account or your money. Skip this if you want.</Text>
      <TextInput value={name} onChangeText={setName} placeholder="Their name" placeholderTextColor={colors.ash} style={input} />
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.ash} autoCapitalize="none" style={input} />
      <TextInput value={phone} onChangeText={setPhone} placeholder="Phone, optional" placeholderTextColor={colors.ash} keyboardType="phone-pad" style={input} />
      <Button label="Send through Messages" onPress={() => void invite()} />
      <Button ghost label="Skip" onPress={() => router.replace('/connect')} />
      {error ? <Text style={type.ash}>{error}</Text> : null}
    </Screen>
  )
}

const input = { borderBottomWidth: 1, borderColor: colors.line, color: colors.ink, paddingVertical: 8 }
