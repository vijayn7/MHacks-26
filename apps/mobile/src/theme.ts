import { StyleSheet } from 'react-native'

export const colors = {
  paper: '#000000',
  ink: '#F6EFE6',
  ash: '#8C857C',
  line: 'rgba(255, 243, 214, 0.14)',
  ember: '#ED7014',
  card: '#050505',
  cool: '#6E7C74',
  core: '#FFF3D6',
}

export const fonts = {
  display: 'Neco',
  sans: 'Satoshi',
  sansMedium: 'Satoshi',
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
    color: colors.ash,
    letterSpacing: 0.3,
  },
})
