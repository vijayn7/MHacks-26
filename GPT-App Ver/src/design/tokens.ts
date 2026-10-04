// Extracted from Figma WHHOz06hrCV1a5g4nKBWt3, Cover + Flame pages.
export const colors = {
  bg: '#000000',
  surface: '#1C100D',
  border: '#FFFFFF12',
  text: '#F2EAE4',
  secondary: '#9A918B',
  muted: '#6B625C',
};
export const fonts = {
  display: 'Neco',
  italic: 'NecoItalic',
  body: 'Satoshi',
  medium: 'SatoshiMedium',
  mono: 'RobotoMono_400Regular',
};
export const palettes = {
  Ember: {
    core: '#FFF3D6',
    body: '#FFD66B',
    mid: '#F5A524',
    edge: '#ED7014',
    deep: '#8E1F02',
    wash: '#3A0F02',
  },
  Azure: {
    core: '#EAFBFF',
    body: '#9BE8FF',
    mid: '#43B9FF',
    edge: '#1D6BF5',
    deep: '#0A1C7A',
    wash: '#070F2E',
  },
  Verdigris: {
    core: '#F0FFE9',
    body: '#B9F7A8',
    mid: '#52D97A',
    edge: '#15A05A',
    deep: '#05482F',
    wash: '#04200F',
  },
  Violet: {
    core: '#FBEFFF',
    body: '#E0BBFF',
    mid: '#B07CFF',
    edge: '#7A3CF0',
    deep: '#2E0B6B',
    wash: '#160530',
  },
  Crimson: {
    core: '#FFEDEC',
    body: '#FFB3AE',
    mid: '#FF5F62',
    edge: '#D41F49',
    deep: '#5C0426',
    wash: '#2A0612',
  },
  Ash: {
    core: '#CFC5BE',
    body: '#9A918B',
    mid: '#6B625C',
    edge: '#3A3330',
    deep: '#1C1A19',
    wash: '#0B0302',
  },
};
export type Hue = keyof typeof palettes;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 40 };
export const radius = { sm: 12, md: 16, lg: 24 };
export { flameAssets } from './flame-assets';
