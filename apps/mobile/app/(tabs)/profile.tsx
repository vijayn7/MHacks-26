import type { ProfileVisibility, RestrictionLevel, UserSettings } from '@impulse/shared'
import { useRouter } from 'expo-router'
import { useCallback, useState } from 'react'
import { Alert, ScrollView, Share, Text, View } from 'react-native'
import { api, saveToken } from '../../src/api'
import { useLive } from '../../src/live'
import { colors, type } from '../../src/theme'
import { Button, Card, Chip, Eyebrow, Screen, Stepper, Toggle } from '../../src/ui'

type Contact = { id: string; displayName: string; status: string; email: string | null }

const levels: RestrictionLevel[] = ['low', 'medium', 'high']
const visibilities: ProfileVisibility[] = ['private', 'friends', 'public']
const cooldowns: Array<{ label: string; seconds: number }> = [
  { label: 'None', seconds: 0 },
  { label: '1 hour', seconds: 3600 },
  { label: '1 day', seconds: 86400 },
  { label: '3 days', seconds: 259200 },
  { label: '7 days', seconds: 604800 },
]

function clampReflection(seconds: number): number {
  return Math.min(180, Math.max(3, Math.round(seconds)))
}

export default function Profile() {
  const router = useRouter()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    const [me, trusted] = await Promise.all([
      api<{ settings: UserSettings }>('/api/me'),
      api<{ contacts: Contact[] }>('/api/trusted'),
    ])
    setSettings(me.settings)
    setContacts(trusted.contacts.filter((contact) => contact.status !== 'revoked'))
  }, [])

  const { error } = useLive(load)

  async function patch(body: Partial<UserSettings>) {
    const before = settings
    if (before) setSettings({ ...before, ...body })
    try {
      setSettings(await api<UserSettings>('/api/settings', { method: 'PATCH', body }))
      setNote('')
    } catch (err) {
      setSettings(before)
      setNote(err instanceof Error ? err.message : 'Could not save that change.')
    }
  }

  async function revoke(contact: Contact) {
    try {
      await api(`/api/trusted/${contact.id}`, { method: 'DELETE' })
      setContacts((list) => list.filter((item) => item.id !== contact.id))
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Could not remove that contact.')
    }
  }

  async function exportData() {
    try {
      const data = await api<unknown>('/api/account/export')
      await Share.share({ title: 'My Impulse data', message: JSON.stringify(data, null, 2) })
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Export failed.')
    }
  }

  function confirmDelete() {
    Alert.alert(
      'Delete your account?',
      'This permanently removes your account, saved items, and history. It cannot be undone. Export your data first if you want a copy.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            void api('/api/account', { method: 'DELETE' })
              .then(async () => {
                await saveToken(null)
                router.replace('/welcome')
              })
              .catch((err: unknown) => setNote(err instanceof Error ? err.message : 'Could not delete the account.')),
        },
      ],
    )
  }

  const reflection = settings?.reflectionSeconds ?? 0

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 48 }}>
        <Eyebrow>PROFILE</Eyebrow>
        <Text style={type.title}>Your rules.</Text>
        <Text style={type.ash}>
          Impulse is a support tool for slowing down, not treatment. The browser extension can only act in the browser where it is installed. It cannot block
          native apps or every way of paying.
        </Text>
        {error ? <Text style={type.ash}>{error}</Text> : null}

        {settings ? (
          <>
            <Eyebrow>RESTRICTION LEVEL</Eyebrow>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {levels.map((level) => (
                <Chip
                  key={level}
                  label={level}
                  selected={settings.restrictionLevel === level}
                  onPress={() => void patch({ restrictionLevel: level, approvalRequired: level === 'high' })}
                />
              ))}
            </View>
            <Text style={type.ash}>High asks a trusted contact to approve before you continue.</Text>

            <Toggle
              label="Monitoring"
              hint="Pause to stop checkout checks in the linked browser."
              value={settings.monitoringEnabled}
              onChange={(value) => void patch({ monitoringEnabled: value })}
            />
            <Stepper
              label="Reflection time"
              value={reflection}
              display={`${reflection} seconds`}
              onChange={(next) => void patch({ reflectionSeconds: clampReflection(reflection + (next > reflection ? 5 : -5)) })}
            />
            <Eyebrow>COOLDOWN FOR SAVED ITEMS</Eyebrow>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {cooldowns.map((option) => (
                <Chip
                  key={option.seconds}
                  label={option.label}
                  selected={settings.cooldownSeconds === option.seconds}
                  onPress={() => void patch({ cooldownSeconds: option.seconds })}
                />
              ))}
            </View>

            <Eyebrow>NOTIFICATIONS</Eyebrow>
            <Toggle label="Saved items ready" value={settings.notifySaved} onChange={(value) => void patch({ notifySaved: value })} />
            <Toggle label="Approval requests" value={settings.notifyApprovals} onChange={(value) => void patch({ notifyApprovals: value })} />
            <Toggle label="Challenges" value={settings.notifyChallenges} onChange={(value) => void patch({ notifyChallenges: value })} />

            <Eyebrow>SOCIAL</Eyebrow>
            <Toggle
              label="Social features"
              hint="Friends and challenges. Off hides them and removes you from the leaderboard view."
              value={settings.socialEnabled}
              onChange={(value) => void patch({ socialEnabled: value })}
            />
            <Toggle
              label="Show me on the leaderboard"
              hint="Others see your name and score only. Never sites or amounts."
              value={settings.leaderboardOptIn}
              onChange={(value) => void patch({ leaderboardOptIn: value })}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {visibilities.map((visibility) => (
                <Chip
                  key={visibility}
                  label={visibility}
                  selected={settings.profileVisibility === visibility}
                  onPress={() => void patch({ profileVisibility: visibility })}
                />
              ))}
            </View>
          </>
        ) : (
          <Text style={type.ash}>Loading your settings…</Text>
        )}

        <Eyebrow>TRUSTED CONTACTS</Eyebrow>
        <Text style={type.ash}>People who can answer one purchase request. They are separate from friends and never see your history.</Text>
        {contacts.map((contact) => (
          <Card key={contact.id}>
            <Text style={type.body}>{contact.displayName}</Text>
            <Text style={type.ash}>
              {contact.status}
              {contact.email ? ` · ${contact.email}` : ''}
            </Text>
            <Button ghost label="Remove" onPress={() => void revoke(contact)} />
          </Card>
        ))}
        {contacts.length === 0 ? <Text style={type.ash}>No trusted contacts.</Text> : null}
        <Button ghost label="Add a trusted contact" onPress={() => router.push('/contacts')} />

        <Button label="Sites and extension" onPress={() => router.push('/connect')} />
        <Button label="Export my data" ghost onPress={() => void exportData()} />
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
        <Button label="Delete account" ghost onPress={confirmDelete} />
        {note ? <Text style={{ color: colors.ash }}>{note}</Text> : null}
      </ScrollView>
    </Screen>
  )
}
