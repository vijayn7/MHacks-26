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

export function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (next: boolean) => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} style={styles.row}>
      <View style={styles.rowText}>
        <Text style={type.body}>{label}</Text>
        {hint ? <Text style={type.ash}>{hint}</Text> : null}
      </View>
      <View style={[styles.track, value && styles.trackOn]}>
        <View style={[styles.thumb, value && styles.thumbOn]} />
      </View>
    </Pressable>
  )
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.chip, selected && styles.chipOn]}>
      <Text style={[type.ash, selected && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  )
}

export function Stepper({ label, value, display, onChange }: { label: string; value: number; display: string; onChange: (next: number) => void }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowText}>
        <Text style={type.body}>{label}</Text>
        <Text style={type.ash}>{display}</Text>
      </View>
      <View style={styles.stepper}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${label}`} onPress={() => onChange(value - 1)} style={styles.step}>
          <Text style={type.body}>−</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${label}`} onPress={() => onChange(value + 1)} style={styles.step}>
          <Text style={type.body}>+</Text>
        </Pressable>
      </View>
    </View>
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 8 },
  rowText: { flex: 1, gap: 2 },
  track: { width: 44, height: 24, borderWidth: 1, borderColor: colors.ink, justifyContent: 'center', paddingHorizontal: 2 },
  trackOn: { backgroundColor: colors.ink },
  thumb: { width: 16, height: 16, backgroundColor: colors.ink },
  thumbOn: { backgroundColor: colors.paper, alignSelf: 'flex-end' },
  chip: { borderWidth: 1, borderColor: colors.line, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: colors.card },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipTextOn: { color: colors.paper },
  stepper: { flexDirection: 'row', gap: 8 },
  step: { borderWidth: 1, borderColor: colors.line, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  card: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 16, gap: 6 },
})

export function Eyebrow({ children }: { children: string }) {
  return <Text style={type.ash}>{children}</Text>
}
