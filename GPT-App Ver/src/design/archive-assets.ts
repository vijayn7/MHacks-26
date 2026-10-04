// Consistent studio placeholders for the archive / saved-item collection.
import type { ImageSourcePropType } from 'react-native';

export const archivePlaceholders = {
  'table light': require('../../assets/archive/archive-table-light.png'),
  'film camera': require('../../assets/archive/archive-film-camera.png'),
  'studio headphones': require('../../assets/archive/archive-studio-headphones.png'),
  'everyday tote': require('../../assets/archive/archive-everyday-tote.png'),
  'desk speaker': require('../../assets/archive/archive-desk-speaker.png'),
  'weekend watch': require('../../assets/archive/archive-weekend-watch.png'),
} as const satisfies Record<string, ImageSourcePropType>;

export function archivePlaceholderFor(name: string): ImageSourcePropType | null {
  const key = name.trim().toLowerCase();
  if (key in archivePlaceholders) {
    return archivePlaceholders[key as keyof typeof archivePlaceholders];
  }
  if (/headphone/i.test(key)) return archivePlaceholders['studio headphones'];
  if (/camera/i.test(key)) return archivePlaceholders['film camera'];
  if (/light|lamp/i.test(key)) return archivePlaceholders['table light'];
  if (/tote|bag/i.test(key)) return archivePlaceholders['everyday tote'];
  if (/watch/i.test(key)) return archivePlaceholders['weekend watch'];
  if (/speaker/i.test(key)) return archivePlaceholders['desk speaker'];
  return null;
}
