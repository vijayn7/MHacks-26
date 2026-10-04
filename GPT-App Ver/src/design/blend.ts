import { palettes, type Hue } from './tokens';

export function blendPalette(hue: Hue, second: Hue, amount: number) {
  const mix = Math.max(0, Math.min(100, amount)) / 100;
  return Object.fromEntries(
    Object.entries(palettes[hue]).map(([key, color]) => {
      const other = palettes[second][key as keyof typeof palettes.Ember];
      const channels = [1, 3, 5].map((offset) =>
        Math.round(
          parseInt(color.slice(offset, offset + 2), 16) * (1 - mix) +
            parseInt(other.slice(offset, offset + 2), 16) * mix,
        )
          .toString(16)
          .padStart(2, '0'),
      );
      return [key, '#' + channels.join('')];
    }),
  ) as typeof palettes.Ember;
}
