// Consistent studio placeholders for the archive / saved-item collection.
import type { ImageSourcePropType } from 'react-native';

export const archivePlaceholders = {
  'table light': require('../../assets/archive/archive-table-light.jpg'),
  'film camera': require('../../assets/archive/archive-film-camera.jpg'),
  'studio headphones': require('../../assets/archive/archive-studio-headphones.jpg'),
  'everyday tote': require('../../assets/archive/archive-everyday-tote.jpg'),
  'desk speaker': require('../../assets/archive/archive-desk-speaker.jpg'),
  'weekend watch': require('../../assets/archive/archive-weekend-watch.jpg'),
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
