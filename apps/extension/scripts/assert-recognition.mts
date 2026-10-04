import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analyze, firstOrderTotalAmount, shouldPause } from "../src/checkout-analyzer.ts";

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
check("account settings are unknown", ["Account", "Shipping address", "Payment method", "Save changes"], "unknown");

const ownApp = analyze(["PACT LOCAL MONITOR", "Order summary", "Place order"]);
assert.equal(ownApp.stage, "ownApp");
assert.deepEqual(ownApp.signals, []);
console.log("ok own app is excluded -> ownApp");

assert.equal(firstOrderTotalAmount(["Order total", "$64.99"]), 64.99);
assert.equal(firstOrderTotalAmount(["Order total $10"]), 10);
assert.equal(shouldPause(["Place order", "Order total", "$64.99"], undefined, 40), true);
assert.equal(shouldPause(["Place order", "Order total $10"], undefined, 40), false);
assert.equal(shouldPause(["Shipping address", "Continue to payment"], undefined, 40), true);
assert.equal(shouldPause(["Add to bag", "Price $80"], undefined, 40), false);
assert.equal(shouldPause(["Checkout", "Total $64"], 64, 40), false);
assert.equal(shouldPause(["Order placed", "Order total $80", "Shipping address"], undefined, 40), false);
console.log("ok any checkout page pauses without a demo button id");

const content = readFileSync(new URL("../src/content.ts", import.meta.url), "utf8");
const manifest = readFileSync(new URL("../manifest.json", import.meta.url), "utf8");
assert.equal(content.includes(".click("), false);
assert.equal(content.includes("#checkout"), false);
assert.match(content, /void closeCard\("purchase_dropped", "Friend rejected"\)\.then\(closeTab\)/);
assert.match(manifest, /http:\/\/\*\/\*/);
assert.match(manifest, /https:\/\/\*\/\*/);
assert.equal(manifest.includes("localhost:5173"), false);
console.log("ok extension watches every http page and does not click a store button");
console.log("passed");
