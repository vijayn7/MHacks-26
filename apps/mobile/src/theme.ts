import { StyleSheet } from 'react-native'

/** Snuff Color tokens (Lit / Ember) — keep names close to Figma. */
export const colors = {
  bg: '#000000',
  surface: '#050505',
  ink: '#F6EFE6',
  muted: '#8C857C',
  line: 'rgba(255, 243, 214, 0.14)',
  core: '#FFF3D6',
  mid: '#F5A524',
  edge: '#ED7014',
  deep: '#8E1F02',
  // legacy aliases used by older screens
  paper: '#000000',
  ash: '#8C857C',
  card: '#050505',
  ember: '#ED7014',
  cool: '#6E7C74',
}

export const fonts = {
  display: 'Neco',
  sans: 'Satoshi',
}

export const type = StyleSheet.create({
  display: {
    fontFamily: fonts.display,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '400',
    letterSpacing: -0.8,
    color: colors.ink,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '400',
    letterSpacing: -0.6,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    letterSpacing: -0.2,
    color: colors.ink,
  },
  ash: {
    fontFamily: fonts.sans,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    color: colors.muted,
    letterSpacing: 0.3,
  },
})
