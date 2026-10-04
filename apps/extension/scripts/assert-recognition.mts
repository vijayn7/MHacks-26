import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analyze, firstOrderTotalAmount } from "../src/checkout-analyzer.ts";

function check(name: string, lines: string[], stage: string) {
  const result = analyze(lines);
  assert.equal(result.stage, stage, name);
  console.log(`ok ${name} -> ${result.stage}`);
}

check("product page is browsing", ["Everyday knit", "Choose size", "Add to bag", "Buy now, wear forever"], "browsing");
check("checkout alone is cart", ["Checkout", "Free shipping this week"], "cart");
check("cart total is cart", ["Your basket", "Subtotal $85", "Proceed to checkout"], "cart");

for (const action of ["Place order", "Place your order", "PAY NOW", "Complete purchase", "Confirm and pay"]) {
  check(`${action} plus order total is checkout`, ["Order total", action], "checkout");
}

check("shipping address plus continue to payment is checkout", ["Shipping address", "Continue to payment"], "checkout");
check(
  "order confirmed is confirmation",
  ["Order confirmed", "Order summary", "Payment method", "Checkout our new collection"],
  "confirmation",
);
check("recheckout/postsubtotal/repay now is unknown", ["Recheckout", "Postsubtotal", "Repay now"], "unknown");
check(
  "account settings are unknown",
  ["Account", "Shipping address", "Payment method", "Save changes"],
  "unknown",
);

const ownApp = analyze(["PACT LOCAL MONITOR", "Order summary", "Place order"]);
assert.equal(ownApp.stage, "ownApp");
assert.deepEqual(ownApp.signals, []);
assert.equal(ownApp.readableLineCount, 0);
console.log("ok own app is excluded -> ownApp");

const sensitive = analyze([
  "Checkout",
  "Payment method",
  "person@example.com",
  "4111 1111 1111 1111",
  "123 Private Street",
]);
const json = JSON.stringify(sensitive);
assert.equal(json.includes("person@example.com"), false);
assert.equal(json.includes("4111"), false);
assert.equal(json.includes("Private Street"), false);
assert.deepEqual(sensitive.signals, ["checkoutHeading", "payment"]);
assert.equal(sensitive.stage, "checkout");
console.log("ok analysis keeps signal names only -> checkoutHeading,payment");

assert.equal(analyze(["Checkout"]).stage, "cart");
assert.equal(analyze(["Cart", "Wool coat", "Total", "$64", "Checkout"]).stage, "cart");
assert.equal(firstOrderTotalAmount(["Cart", "Wool coat", "Total", "$64", "Checkout"]), undefined);
console.log('ok wool-coat lines are cart and have no order-total amount');

assert.equal(firstOrderTotalAmount(["Your basket", "Subtotal $85", "Proceed to checkout"]), 85);
assert.equal(firstOrderTotalAmount(["Order total", "$64"]), undefined);
assert.equal(firstOrderTotalAmount(["Order total $64"]), 64);
assert.equal(firstOrderTotalAmount(["Grand total $1,299.50"]), 1299.5);
assert.equal(firstOrderTotalAmount(["Total due $40"]), 40);
assert.equal(firstOrderTotalAmount(["Postsubtotal $85", "Recheckout", "Repay now"]), undefined);
assert.equal(firstOrderTotalAmount(["Shipping $5", "Order total $80"]), 80);
console.log("ok order-total amount uses the first amount on a matching line");

const content = readFileSync(new URL("../src/content.ts", import.meta.url), "utf8");
const listenerAt = content.indexOf('document.addEventListener(\n  "click"');
assert.ok(listenerAt !== -1, "click listener");
const listener = content.slice(listenerAt);
const woolAt = listener.indexOf('target.closest("#checkout")');
const analyzedAt = listener.indexOf("pauseAnalyzedCheckout(");
assert.ok(woolAt !== -1 && analyzedAt !== -1 && woolAt < analyzedAt, "wool-coat path precedes analyzer");
assert.match(listener.slice(woolAt, analyzedAt), /pauseWoolCoatCheckout\(event\);\s*return;/);

function functionBody(name: string): string {
  const start = content.indexOf(`function ${name}`);
  assert.ok(start !== -1, name);
  const next = content.indexOf("\nfunction ", start + 1);
  return content.slice(start, next === -1 ? content.length : next);
}

const woolCoat = functionBody("pauseWoolCoatCheckout");
assert.match(woolCoat, /data-total/);
assert.match(woolCoat, /holdCheckout\(event\)/);
assert.doesNotMatch(woolCoat, /analyze\(/);
assert.match(functionBody("holdCheckout"), /openCard\(\)/);
assert.match(functionBody("pauseAnalyzedCheckout"), /analyze\(/);
assert.match(functionBody("pauseAnalyzedCheckout"), /firstOrderTotalAmount/);
assert.match(functionBody("pauseAnalyzedCheckout"), /data-total/);
console.log("ok wool-coat #checkout path is special-cased from [data-total] before analyze");

console.log("passed");
