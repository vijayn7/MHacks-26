export const faces = ['classic', 'happy', 'dreamy', 'wink'] as const;
export type Face = (typeof faces)[number];
export const isFace = (value: unknown): value is Face =>
  typeof value === 'string' && faces.includes(value as Face);
