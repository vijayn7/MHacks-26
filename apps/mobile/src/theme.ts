import { Platform, StyleSheet } from 'react-native'

export const colors = {
  paper: '#F6F3EE',
  ink: '#1C140F',
  ash: '#8C857C',
  line: '#E4DDD4',
  ember: '#E23B1F',
  card: '#FFFCF8',
  cool: '#6E7C74',
}

export const type = StyleSheet.create({
  display: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontSize: 36,
    lineHeight: 42,
    color: colors.ink,
  },
  title: {
    fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }),
    fontSize: 28,
    lineHeight: 34,
    color: colors.ink,
  },
  body: { fontSize: 16, lineHeight: 24, color: colors.ink },
  ash: { fontSize: 13, lineHeight: 18, color: colors.ash, letterSpacing: 0.3 },
})
