import type { ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, fonts, type } from './theme'

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
  screen: { flex: 1, backgroundColor: colors.bg, padding: 24, paddingTop: 72, gap: 16 },
  button: {
    backgroundColor: colors.core,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  buttonText: {
    color: '#1c0a04',
    textAlign: 'center',
    fontSize: 16,
    fontFamily: fonts.sans,
    fontWeight: '500',
  },
  ghostText: { color: colors.ink, fontFamily: fonts.sans },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 8 },
  rowText: { flex: 1, gap: 2 },
  track: {
    width: 44,
    height: 24,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderRadius: 999,
  },
  trackOn: { backgroundColor: colors.mid, borderColor: colors.mid },
  thumb: { width: 16, height: 16, backgroundColor: colors.muted, borderRadius: 999 },
  thumbOn: { backgroundColor: colors.bg, alignSelf: 'flex-end' },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.surface,
    borderRadius: 999,
  },
  chipOn: { backgroundColor: colors.mid, borderColor: colors.mid },
  chipTextOn: { color: '#1c0a04' },
  stepper: { flexDirection: 'row', gap: 8 },
  step: {
    borderWidth: 1,
    borderColor: colors.line,
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 6,
    borderRadius: 18,
  },
})

export function Eyebrow({ children }: { children: string }) {
  return <Text style={type.ash}>{children}</Text>
}
