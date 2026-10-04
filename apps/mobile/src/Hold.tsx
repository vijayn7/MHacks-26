import * as Haptics from 'expo-haptics'
import { useEffect, useRef, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { emberColor } from '@impulse/shared'
import { colors } from './theme'

export function Hold({
  seconds,
  label,
  onComplete,
}: {
  seconds: number
  label: string
  onComplete: () => void
}) {
  const [progress, setProgress] = useState(0)
  const holding = useRef(false)
  const started = useRef(0)
  const done = useRef(false)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  function stop(reset: boolean) {
    holding.current = false
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    if (reset && !done.current) setProgress(0)
  }

  function tick(auto: boolean) {
    const elapsed = (Date.now() - started.current) / 1000
    const next = Math.min(1, elapsed / seconds)
    setProgress(next)
    if (next >= 1 && !done.current) {
      done.current = true
      stop(false)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined)
      onComplete()
      return
    }
    if (!auto && !holding.current) stop(true)
  }

  function begin(auto: boolean) {
    if (done.current) return
    holding.current = true
    started.current = Date.now()
    void Haptics.selectionAsync().catch(() => undefined)
    timer.current = setInterval(() => tick(auto), 50)
  }

  useEffect(() => () => stop(false), [])

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={() => begin(false)}
        onPressOut={() => stop(true)}
        style={[styles.orb, { backgroundColor: emberColor(progress) }]}
      >
        <Text style={styles.orbText}>{Math.round(progress * 100)}</Text>
      </Pressable>
      <Text style={styles.caption}>{label}</Text>
      <Pressable accessibilityRole="button" onPress={() => begin(true)}>
        <Text style={styles.alt}>Pause without holding</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 12 },
  orb: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
  orbText: { color: colors.core, fontSize: 28, fontFamily: 'Neco' },
  caption: { color: colors.ink, textAlign: 'center', fontFamily: 'Satoshi' },
  alt: { color: colors.ash, textDecorationLine: 'underline', fontFamily: 'Satoshi' },
})
