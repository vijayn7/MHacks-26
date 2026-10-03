import type { RestrictionLevel, UserSettings } from '@impulse/shared'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, Text } from 'react-native'
import { api, saveToken } from '../../src/api'
import { colors, type } from '../../src/theme'
import { Button, Card, Eyebrow, Screen } from '../../src/ui'

export default function Profile() {
  const router = useRouter()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [note, setNote] = useState('')

  async function load() {
    const me = await api<{ settings: UserSettings }>('/api/me')
    setSettings(me.settings)
  }

  useEffect(() => {
    void load().catch((err: unknown) => setNote(err instanceof Error ? err.message : 'Could not load settings.'))
  }, [])

  async function patch(body: Partial<UserSettings>) {
    setSettings(await api<UserSettings & { onboardingComplete: boolean }>('/api/settings', { method: 'PATCH', body }))
  }

  return (
    <Screen>
      <Eyebrow>PROFILE</Eyebrow>
      <Text style={type.title}>Your rules.</Text>
      {(['low', 'medium', 'high'] as RestrictionLevel[]).map((level) => (
        <Pressable key={level} onPress={() => void patch({ restrictionLevel: level, approvalRequired: level === 'high' })}>
          <Card>
            <Text style={type.body}>
              {level}
              {settings?.restrictionLevel === level ? ' · on' : ''}
            </Text>
          </Card>
        </Pressable>
      ))}
      <Button label="Sites and extension" onPress={() => router.push('/connect')} />
      <Button
        label={settings?.monitoringEnabled ? 'Pause monitoring' : 'Resume monitoring'}
        onPress={() => void patch({ monitoringEnabled: !settings?.monitoringEnabled })}
      />
      <Button
        label="Export my data"
        ghost
        onPress={() =>
          void api('/api/account/export')
            .then(() => setNote('Export downloaded to the app session. It is also available from the API.'))
            .catch((err: unknown) => setNote(err instanceof Error ? err.message : 'Export failed.'))
        }
      />
      <Button
        label="Sign out"
        ghost
        onPress={() =>
          void api('/api/auth/signout', { body: {} }).finally(async () => {
            await saveToken(null)
            router.replace('/welcome')
          })
        }
      />
      <Button
        label="Delete account"
        ghost
        onPress={() =>
          void api('/api/account', { method: 'DELETE' }).then(async () => {
            await saveToken(null)
            router.replace('/welcome')
          })
        }
      />
      {note ? <Text style={{ color: colors.ash }}>{note}</Text> : null}
    </Screen>
  )
}
