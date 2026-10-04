import { spendingCategories } from '../design/onboarding';
export type PurchaseRules = {
  amountEnabled: boolean;
  minAmount: number;
  categoryEnabled: boolean;
  categories: string[];
  match: 'any' | 'all';
};
export const defaultPurchaseRules = (): PurchaseRules => ({
  amountEnabled: true,
  minAmount: 50,
  categoryEnabled: false,
  categories: [],
  match: 'any',
});
export function readPurchaseRules(raw: unknown): PurchaseRules {
  const base = defaultPurchaseRules();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as PurchaseRules;
  const categories = Array.isArray(r.categories)
    ? [...new Set(r.categories)].filter((v) =>
        spendingCategories.includes(v as (typeof spendingCategories)[number]),
      )
    : [];
  return {
    amountEnabled: typeof r.amountEnabled === 'boolean' ? r.amountEnabled : true,
    minAmount:
      Number.isFinite(r.minAmount) && r.minAmount >= 0 && r.minAmount <= 1000000 ? r.minAmount : 50,
    categoryEnabled: r.categoryEnabled === true && categories.length > 0,
    categories,
    match: r.match === 'all' ? 'all' : 'any',
  };
}
export function matchesPurchase(r: PurchaseRules, amount: number, category?: string): boolean {
  if (!Number.isFinite(amount) || amount < 0) return false;
  const conditions: boolean[] = [];
  if (r.amountEnabled) conditions.push(amount >= r.minAmount);
  if (r.categoryEnabled) conditions.push(!!category && r.categories.includes(category));
  return (
    conditions.length > 0 &&
    (r.match === 'all' ? conditions.every(Boolean) : conditions.some(Boolean))
  );
}
