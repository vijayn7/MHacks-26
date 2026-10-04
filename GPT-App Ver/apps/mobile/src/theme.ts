import { StyleSheet } from 'react-native'
import { snuff } from '@impulse/shared'

/** Snuff Color + Type tokens mirrored from Figma. */
export const colors = {
  bg: snuff.bg.base,
  surface: snuff.bg.surface,
  ink: snuff.text.primary,
  muted: snuff.text.secondary,
  line: snuff.border.hair,
  core: snuff.flame.core,
  body: snuff.flame.body,
  mid: snuff.flame.mid,
  edge: snuff.flame.edge,
  deep: snuff.flame.deep,
  // legacy aliases
  paper: snuff.bg.base,
  ash: snuff.smoke.muted,
  card: snuff.bg.surface,
  ember: snuff.flame.edge,
  cool: '#6E7C74',
}

export const fonts = {
  display: snuff.font.display,
  sans: snuff.font.sans,
}

export const type = StyleSheet.create({
  display: {
    fontFamily: fonts.display,
    fontSize: snuff.type.displayL.size,
    lineHeight: snuff.type.displayL.line,
    fontWeight: '400',
    letterSpacing: snuff.type.displayL.track,
    color: colors.ink,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: snuff.type.headingM.size,
    lineHeight: snuff.type.headingM.line,
    fontWeight: '400',
    letterSpacing: snuff.type.headingM.track,
    color: colors.ink,
  },
  body: {
    fontFamily: fonts.sans,
    fontSize: snuff.type.bodyL.size,
    lineHeight: snuff.type.bodyL.line,
    fontWeight: '400',
    letterSpacing: snuff.type.bodyL.track,
    color: colors.ink,
  },
  ash: {
    fontFamily: fonts.sans,
    fontSize: snuff.type.bodyS.size,
    lineHeight: snuff.type.bodyS.line,
    fontWeight: '400',
    color: colors.muted,
    letterSpacing: 0.3,
  },
})
