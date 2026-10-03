import type { ScoreAction, UserSettings } from '@impulse/shared'
import { useCallback, useState } from 'react'
import { ScrollView, Share, Text, TextInput, View } from 'react-native'
import { api } from '../../src/api'
import { useLive } from '../../src/live'
import { colors, type } from '../../src/theme'
import { Button, Card, Chip, Eyebrow, Screen, Stepper } from '../../src/ui'

type Friend = { id: string; userId: string; name: string; status: string; direction: 'in' | 'out' }
type Challenge = {
  id: string
  title: string
  goalType: ScoreAction
  goal: number
  endsAt: string
  membership: string
  progress: number
  state: 'active' | 'completed' | 'ended'
}

const goalLabels: Record<ScoreAction, string> = {
  reflection_complete: 'Finish a reflection',
  defer: 'Save for later',
  revisit: 'Review a saved item',
  abandon: 'Walk away',
}
const goalTypes = Object.keys(goalLabels) as ScoreAction[]

function endsLabel(challenge: Challenge): string {
  if (challenge.state === 'completed') return 'Completed'
  if (challenge.state === 'ended') return 'Ended without reaching the goal'
  const days = Math.max(Math.ceil((new Date(challenge.endsAt).getTime() - Date.now()) / 86_400_000), 0)
  return days <= 1 ? 'Ends today' : `${days} days left`
}

export default function Social() {
  const [socialEnabled, setSocialEnabled] = useState(true)
  const [friends, setFriends] = useState<Friend[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [leaders, setLeaders] = useState<Array<{ name: string; score: number }>>([])
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('Seven pauses')
  const [goalType, setGoalType] = useState<ScoreAction>('defer')
  const [goalCount, setGoalCount] = useState(3)
  const [days, setDays] = useState(7)
  const [invited, setInvited] = useState<string[]>([])
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    const settings = await api<UserSettings>('/api/settings')
    setSocialEnabled(settings.socialEnabled)
    const [friendRes, challengeRes, board] = await Promise.all([
      api<{ friends: Friend[] }>('/api/friends'),
      api<{ challenges: Challenge[] }>('/api/challenges'),
      api<{ leaders: Array<{ name: string; score: number }> }>('/api/leaderboard'),
    ])
    setFriends(friendRes.friends)
    setChallenges(challengeRes.challenges)
    setLeaders(board.leaders)
    const accepted = new Set(friendRes.friends.filter((friend) => friend.status === 'accepted').map((friend) => friend.userId))
    setInvited((list) => list.filter((id) => accepted.has(id)))
  }, [])

  const { refresh, error } = useLive(load)

  async function act(work: () => Promise<unknown>, fallback: string) {
    try {
      await work()
      setNote('')
      await refresh()
    } catch (err) {
      setNote(err instanceof Error ? err.message : fallback)
    }
  }

  async function invite() {
    const address = email.trim()
    if (!address) return
    await act(async () => {
      const created = await api<{ friendshipId: string | null; url: string | null }>('/api/friends', { body: { email: address } })
      setEmail('')
      if (created.url) await Share.share({ message: `Join me on Impulse as a friend: ${created.url}` })
    }, 'Invite failed.')
  }

  async function startChallenge() {
    const name = title.trim()
    if (!name) {
      setNote('Give the challenge a name.')
      return
    }
    await act(async () => {
      await api('/api/challenges', { body: { title: name, goalType, goalCount, days, inviteUserIds: invited } })
      setInvited([])
    }, 'Could not start the challenge.')
  }

  const accepted = friends.filter((friend) => friend.status === 'accepted')

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 48 }}>
        <Eyebrow>SOCIAL</Eyebrow>
        <Text style={type.title}>Friends, not surveillance.</Text>
        <Text style={type.ash}>Friends can join challenges and see your name and score if you allow it. Trusted contacts are different: they only answer purchase requests.</Text>
        {error ? <Text style={type.ash}>{error}</Text> : null}
        {!socialEnabled ? (
          <>
            <Text style={type.body}>Social features are off.</Text>
            <Button label="Turn on social features" onPress={() => void act(() => api('/api/settings', { method: 'PATCH', body: { socialEnabled: true } }), 'Could not update.')} />
          </>
        ) : null}

        <Eyebrow>FRIENDS</Eyebrow>
        <TextInput value={email} onChangeText={setEmail} placeholder="Friend’s email" placeholderTextColor={colors.ash} autoCapitalize="none" keyboardType="email-address" style={input} />
        <Button label="Invite friend" onPress={() => void invite()} />
        {friends.map((friend) => (
          <Card key={friend.id}>
            <Text style={type.body}>{friend.name}</Text>
            <Text style={type.ash}>
              {friend.status === 'pending' ? (friend.direction === 'in' ? 'Wants to be friends' : 'Invite sent') : 'Friend'}
            </Text>
            {friend.direction === 'in' && friend.status === 'pending' ? (
              <>
                <Button label="Accept" onPress={() => void act(() => api(`/api/friends/${friend.id}/respond`, { body: { accept: true } }), 'Could not accept.')} />
                <Button ghost label="Decline" onPress={() => void act(() => api(`/api/friends/${friend.id}/respond`, { body: { accept: false } }), 'Could not decline.')} />
              </>
            ) : (
              <Button
                ghost
                label={friend.status === 'pending' ? 'Cancel invite' : 'Remove friend'}
                onPress={() => void act(() => api(`/api/friends/${friend.id}`, { method: 'DELETE' }), 'Could not remove.')}
              />
            )}
          </Card>
        ))}
        {friends.length === 0 ? <Text style={type.ash}>No friends yet.</Text> : null}

        <Eyebrow>START A CHALLENGE</Eyebrow>
        <TextInput value={title} onChangeText={setTitle} placeholder="Challenge name" placeholderTextColor={colors.ash} maxLength={80} style={input} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {goalTypes.map((option) => (
            <Chip key={option} label={goalLabels[option]} selected={goalType === option} onPress={() => setGoalType(option)} />
          ))}
        </View>
        <Stepper label="Goal" value={goalCount} display={`${goalCount} time${goalCount === 1 ? '' : 's'}`} onChange={(next) => setGoalCount(Math.min(100, Math.max(1, next)))} />
        <Stepper label="Length" value={days} display={`${days} day${days === 1 ? '' : 's'}`} onChange={(next) => setDays(Math.min(60, Math.max(1, next)))} />
        {accepted.length > 0 ? (
          <>
            <Text style={type.ash}>Invite friends</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {accepted.map((friend) => (
                <Chip
                  key={friend.userId}
                  label={friend.name}
                  selected={invited.includes(friend.userId)}
                  onPress={() => setInvited((list) => (list.includes(friend.userId) ? list.filter((id) => id !== friend.userId) : [...list, friend.userId].slice(0, 20)))}
                />
              ))}
            </View>
          </>
        ) : null}
        <Button label="Start challenge" onPress={() => void startChallenge()} />

        <Eyebrow>CHALLENGES</Eyebrow>
        {challenges.map((challenge) => {
          const open = challenge.state === 'active'
          return (
            <Card key={challenge.id}>
              <Text style={type.body}>{challenge.title}</Text>
              <Text style={type.ash}>
                {goalLabels[challenge.goalType] ?? challenge.goalType} · {challenge.progress}/{challenge.goal}
              </Text>
              <Text style={type.ash}>{challenge.membership === 'invited' && open ? 'Invited' : endsLabel(challenge)}</Text>
              {challenge.membership === 'invited' && open ? (
                <>
                  <Button label="Join" onPress={() => void act(() => api(`/api/challenges/${challenge.id}/join`, { body: {} }), 'Could not join.')} />
                  <Button ghost label="Decline" onPress={() => void act(() => api(`/api/challenges/${challenge.id}/decline`, { body: {} }), 'Could not decline.')} />
                </>
              ) : null}
            </Card>
          )
        })}
        {challenges.length === 0 ? <Text style={type.ash}>No challenges yet.</Text> : null}

        <Eyebrow>LEADERBOARD</Eyebrow>
        <Text style={type.ash}>Shows a name and a score. No sites, no amounts. You appear only if you opt in under Profile.</Text>
        {leaders.map((leader) => (
          <Text key={leader.name} style={type.body}>
            {leader.name} · {leader.score}
          </Text>
        ))}
        {note ? <Text style={type.ash}>{note}</Text> : null}
      </ScrollView>
    </Screen>
  )
}

const input = { borderBottomWidth: 1, borderColor: colors.line, color: colors.ink, paddingVertical: 8 }
