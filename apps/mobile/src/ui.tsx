import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, type } from './theme'

export function Screen({ children }: { children: ReactNode }) {
  return <View style={styles.screen}>{children}</View>
}

export function Button({ label, onPress, ghost = false }: { label: string; onPress: () => void; ghost?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.button, ghost && styles.ghost]}>
      <Text style={[styles.buttonText, ghost && styles.ghostText]}>{label}</Text>
    </Pressable>
  )
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper, padding: 24, paddingTop: 72, gap: 16 },
  button: { backgroundColor: colors.ink, paddingVertical: 14, paddingHorizontal: 16 },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.ink },
  buttonText: { color: colors.paper, textAlign: 'center', fontSize: 16 },
  ghostText: { color: colors.ink },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 6 },
})

export function Eyebrow({ children }: { children: string }) {
  return <Text style={type.ash}>{children}</Text>
}
