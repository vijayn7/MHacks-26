// Phrase list and stage order copied from pact-ios CheckoutAnalyzer.
// Only these signal names leave the matcher. Raw page text stays in the extension.

export const screenSignals = [
  "checkoutHeading",
  "orderSummary",
  "orderTotal",
  "delivery",
  "payment",
  "purchaseAction",
  "continueAction",
  "addToBag",
  "cart",
  "confirmation",
] as const;

export type ScreenSignal = (typeof screenSignals)[number];

export type ShoppingStage = "unknown" | "browsing" | "cart" | "checkout" | "confirmation" | "ownApp";

export type ScreenAnalysis = {
  stage: ShoppingStage;
  signals: ScreenSignal[];
  readableLineCount: number;
};

export const signalPhrases: { readonly [K in ScreenSignal]: readonly string[] } = {
  checkoutHeading: ["checkout", "check out"],
  orderSummary: ["order summary", "review your order", "review order"],
  orderTotal: ["order total", "grand total", "total due", "subtotal"],
  delivery: ["shipping address", "delivery address", "delivery options", "shipping method"],
  payment: ["payment method", "payment details", "payment options", "billing address"],
  purchaseAction: ["place order", "place your order", "pay now", "complete purchase", "confirm and pay"],
  continueAction: ["continue to payment", "continue to delivery", "continue to shipping"],
  addToBag: ["add to bag", "add to cart", "add to basket", "choose size", "select size"],
  cart: ["your bag", "your cart", "your basket", "shopping bag", "shopping cart", "proceed to checkout"],
  confirmation: [
    "order confirmed",
    "order confirmation",
    "thank you for your order",
    "thanks for your order",
    "order placed",
  ],
};

function fold(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("en-US");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsPhrase(foldedText: string, phrase: string): boolean {
  return new RegExp(`\\b${escapeRegExp(fold(phrase))}\\b`, "u").test(foldedText);
}

export function lineMatchesSignal(line: string, signal: ScreenSignal): boolean {
  const text = fold(line.slice(0, 300));
  return signalPhrases[signal].some((phrase) => containsPhrase(text, phrase));
}

function overlaps(signals: ReadonlySet<ScreenSignal>, others: readonly ScreenSignal[]): boolean {
  return others.some((signal) => signals.has(signal));
}

export function analyze(lines: readonly string[]): ScreenAnalysis {
  const bounded = lines.slice(0, 100).map((line) => line.slice(0, 300));
  const text = fold(bounded.join("\n"));
  if (text.includes("pact local monitor")) {
    return { stage: "ownApp", signals: [], readableLineCount: 0 };
  }
  const signals = screenSignals.filter((signal) =>
    signalPhrases[signal].some((phrase) => containsPhrase(text, phrase)),
  );
  const set = new Set(signals);
  let stage: ShoppingStage;
  if (set.has("confirmation")) {
    stage = "confirmation";
  } else if (
    (set.has("purchaseAction") && overlaps(set, ["orderTotal", "orderSummary", "payment"])) ||
    (set.has("checkoutHeading") && overlaps(set, ["delivery", "payment", "orderSummary"])) ||
    (set.has("continueAction") && overlaps(set, ["delivery", "payment"]))
  ) {
    stage = "checkout";
  } else if (set.has("cart") || set.has("checkoutHeading")) {
    stage = "cart";
  } else if (set.has("addToBag")) {
    stage = "browsing";
  } else {
    stage = "unknown";
  }
  return { stage, signals, readableLineCount: Math.min(lines.length, 100) };
}

function firstMoneyAmount(line: string): number | undefined {
  const match =
    line.match(/\$\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/) ??
    line.match(/\b(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?\b/);
  if (!match?.[1]) return undefined;
  const amount = Number(`${match[1].replace(/,/g, "")}${match[2] ? `.${match[2]}` : ""}`);
  return Number.isFinite(amount) ? amount : undefined;
}

// First amount on an orderTotal line, or the next line when the price sits under the label.
export function firstOrderTotalAmount(lines: readonly string[]): number | undefined {
  const bounded = lines.slice(0, 100).map((line) => line.slice(0, 300));
  for (let i = 0; i < bounded.length; i++) {
    if (!lineMatchesSignal(bounded[i], "orderTotal")) continue;
    const amount = firstMoneyAmount(bounded[i]) ?? firstMoneyAmount(bounded[i + 1] ?? "");
    if (amount !== undefined) return amount;
  }
  return undefined;
}

// Pause on the iOS checkout stage. A readable total under the rule skips the pause.
export function shouldPause(lines: readonly string[], markedTotal: number | undefined, minAmount: number): boolean {
  if (analyze(lines).stage !== "checkout") return false;
  const amount = markedTotal ?? firstOrderTotalAmount(lines);
  if (amount === undefined) return true;
  return amount >= minAmount;
}
