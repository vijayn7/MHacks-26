export const spendingCategories = [
  'clothes & beauty',
  'tech & gadgets',
  'food & delivery',
  'games & in-app purchases',
  'sports betting',
  'other',
] as const;
export function supportLevel(value: number) {
  return value < 34
    ? {
        name: 'gentle',
        title: 'a little pause?',
        detail: 'a soft reminder. you choose what happens next.',
      }
    : value < 67
      ? {
          name: 'balanced',
          title: 'snuff this urge?',
          detail: 'a clear check-in before you decide.',
        }
      : {
          name: 'firm',
          title: 'take a breath first.',
          detail: 'a more direct reminder to pause and reconsider.',
        };
}
