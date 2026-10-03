import { useCallback, useEffect, useState } from 'react'
import { Text, TextInput } from 'react-native'
import { api } from '../../src/api'
import { colors, type } from '../../src/theme'
import { Button, Card, Eyebrow, Screen } from '../../src/ui'

type Friend = { id: string; name: string; status: string; direction: 'in' | 'out' }
type Challenge = { id: string; title: string; progress: number; goal: number; membership: string }

export default function Social() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [leaders, setLeaders] = useState<Array<{ name: string; score: number }>>([])
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('Seven pauses')
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    const [friendRes, challengeRes, board] = await Promise.all([
      api<{ friends: Friend[] }>('/api/friends'),
      api<{ challenges: Challenge[] }>('/api/challenges'),
      api<{ leaders: Array<{ name: string; score: number }> }>('/api/leaderboard'),
    ])
    setFriends(friendRes.friends)
    setChallenges(challengeRes.challenges)
    setLeaders(board.leaders)
  }, [])

  useEffect(() => {
    void load().catch((err: unknown) => setNote(err instanceof Error ? err.message : 'Could not load social.'))
  }, [load])

  return (
    <Screen>
      <Eyebrow>SOCIAL</Eyebrow>
      <Text style={type.title}>Friends, not surveillance.</Text>
      <TextInput value={email} onChangeText={setEmail} placeholder="Friend’s email" placeholderTextColor={colors.ash} autoCapitalize="none" style={input} />
      <Button
        label="Suggest friend"
        onPress={() =>
          void api('/api/friends', { body: { email } })
            .then(() => load())
            .catch((err: unknown) => setNote(err instanceof Error ? err.message : 'Invite failed.'))
        }
      />
      {friends.map((friend) => (
        <Card key={friend.id}>
          <Text style={type.body}>
            {friend.name} · {friend.status}
          </Text>
          {friend.direction === 'in' && friend.status === 'pending' ? (
            <Button label="Accept" onPress={() => void api(`/api/friends/${friend.id}/respond`, { body: { accept: true } }).then(load)} />
          ) : null}
        </Card>
      ))}
      <TextInput value={title} onChangeText={setTitle} placeholder="Challenge" placeholderTextColor={colors.ash} style={input} />
      <Button
        label="Start challenge"
        onPress={() =>
          void api('/api/challenges', { body: { title, goalType: 'defer', goalCount: 3, days: 7 } }).then(load)
        }
      />
      {challenges.map((challenge) => (
        <Card key={challenge.id}>
          <Text style={type.body}>{challenge.title}</Text>
          <Text style={type.ash}>
            {challenge.progress}/{challenge.goal} · {challenge.membership}
          </Text>
          {challenge.membership === 'invited' ? (
            <Button label="Join" onPress={() => void api(`/api/challenges/${challenge.id}/join`, { body: {} }).then(load)} />
          ) : null}
        </Card>
      ))}
      <Text style={type.ash}>Leaderboard shows a name and a score. No sites, no amounts.</Text>
      {leaders.map((leader) => (
        <Text key={leader.name} style={type.body}>
          {leader.name} · {leader.score}
        </Text>
      ))}
      <Button
        label="Show me on the board"
        onPress={() => void api('/api/settings', { method: 'PATCH', body: { leaderboardOptIn: true, profileVisibility: 'public', socialEnabled: true } }).then(load)}
      />
      {note ? <Text style={type.ash}>{note}</Text> : null}
    </Screen>
  )
}

const input = { borderBottomWidth: 1, borderColor: colors.line, color: colors.ink, paddingVertical: 8 }
