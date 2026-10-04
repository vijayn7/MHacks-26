import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const outDir = path.resolve("apps/landing/public/sites");

// Retry blocked/blank sites via live URLs and Wayback fallbacks
const sites = [
  { id: "draftkings", urls: [
    "https://web.archive.org/web/20240901000000/https://www.draftkings.com/",
    "https://sportsbook.draftkings.com/",
  ]},
  { id: "sephora", urls: [
    "https://www.sephora.com/",
    "https://web.archive.org/web/20240915000000/https://www.sephora.com/",
  ]},
  { id: "stockx", urls: [
    "https://stockx.com/",
    "https://web.archive.org/web/20240901000000/https://stockx.com/",
  ]},
  { id: "target", urls: [
    "https://www.target.com/",
    "https://web.archive.org/web/20240901000000/https://www.target.com/",
  ]},
  { id: "wayfair", urls: [
    "https://www.wayfair.com/",
    "https://web.archive.org/web/20240901000000/https://www.wayfair.com/",
  ]},
  { id: "etsy", urls: [
    "https://www.etsy.com/",
    "https://web.archive.org/web/20240901000000/https://www.etsy.com/",
  ]},
  { id: "ebay", urls: [
    "https://www.ebay.com/",
  ]},
  { id: "bestbuy", urls: [
    "https://www.bestbuy.com/",
    "https://web.archive.org/web/20240901000000/https://www.bestbuy.com/",
  ]},
  { id: "caesars", urls: [
    "https://www.caesars.com/sportsbook-and-casino",
    "https://web.archive.org/web/20240815000000/https://www.caesars.com/sportsbook-and-casino",
  ]},
];

async function tryCapture(page, url, file) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3500);
  // dismiss common banners
  for (const sel of ["#onetrust-accept-btn-handler", "button:has-text('Accept all')", "button:has-text('Accept')", "#sp-cc-accept"]) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 700 })) await el.click({ timeout: 1000 });
    } catch {}
  }
  await page.waitForTimeout(500);
  const text = await page.locator("body").innerText().catch(() => "");
  if (/access denied|request blocked|denied by|captcha|attention required/i.test(text) && text.length < 800) {
    throw new Error("blocked page");
  }
  await page.screenshot({ path: file, type: "jpeg", quality: 82, fullPage: false });
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });

  for (const site of sites) {
    const file = path.join(outDir, `${site.id}.jpg`);
    let done = false;
    for (const url of site.urls) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        locale: "en-US",
      });
      const page = await context.newPage();
      try {
        console.log(`try ${site.id} <- ${url}`);
        await tryCapture(page, url, file);
        console.log(`ok ${site.id}`);
        done = true;
        await context.close();
        break;
      } catch (err) {
        console.log(`fail ${site.id}: ${err instanceof Error ? err.message : err}`);
        await context.close();
      }
    }
    if (!done) console.log(`gave up ${site.id}`);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
