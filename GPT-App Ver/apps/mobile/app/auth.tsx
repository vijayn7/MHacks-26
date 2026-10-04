import * as Crypto from 'expo-crypto'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Text, TextInput } from 'react-native'
import { preferenceFromDraft } from '@impulse/shared'
import { api, saveToken } from '../src/api'
import { getDraft } from '../src/draft'
import { colors, type } from '../src/theme'
import { Button, Eyebrow, Screen } from '../src/ui'

export default function Auth() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  async function finish(token: string) {
    await saveToken(token)
    const preference = preferenceFromDraft({ ...getDraft(), chosenLevel: getDraft().chosenLevel })
    await api('/api/onboarding/finish', { body: preference })
    router.replace(preference.wantsTrustedContact ? '/contacts' : '/connect')
  }

  async function dev() {
    try {
      const session = await api<{ token: string }>('/api/auth/dev', {
        token: null,
        body: { displayName: name || 'Alex' },
      })
      await finish(session.token)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.')
    }
  }

  async function google() {
    try {
      const start = await api<{ url: string }>('/api/auth/google/start', { token: null, body: {} })
      const verifier = `${Crypto.randomUUID()}${Crypto.randomUUID()}`
      const digest = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier, {
        encoding: Crypto.CryptoEncoding.BASE64,
      })
      const challenge = digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
      const url = `${start.url}&code_challenge=${challenge}&code_challenge_method=s256`
      const subscription = Linking.addEventListener('url', (event) => {
        const parsed = Linking.parse(event.url)
        const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : ''
        if (!code) return
        subscription.remove()
        void api<{ token: string }>('/api/auth/google/callback', { token: null, body: { code, codeVerifier: verifier } })
          .then((session) => finish(session.token))
          .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Google failed.'))
      })
      await Linking.openURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google is not configured. Use development sign-in.')
    }
  }

  return (
    <Screen>
      <Eyebrow>ACCOUNT</Eyebrow>
      <Text style={type.title}>Authenticate with Google.</Text>
      <Text style={type.body}>The extension will link to this same account. It does not copy this phone’s session.</Text>
      <Button label="Continue with Google" onPress={() => void google()} />
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Name for development sign-in"
        placeholderTextColor={colors.ash}
        style={{ borderBottomWidth: 1, borderColor: colors.line, color: colors.ink, paddingVertical: 8 }}
      />
      <Button ghost label="Continue in development" onPress={() => void dev()} />
      {error ? <Text style={type.ash}>{error}</Text> : null}
    </Screen>
  )
}
