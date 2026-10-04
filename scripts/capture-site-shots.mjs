import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const outDir = path.resolve("apps/landing/public/sites");

const sites = [
  { id: "amazon", url: "https://www.amazon.com/" },
  { id: "ebay", url: "https://www.ebay.com/" },
  { id: "walmart", url: "https://www.walmart.com/" },
  { id: "nike", url: "https://www.nike.com/" },
  { id: "target", url: "https://www.target.com/" },
  { id: "bestbuy", url: "https://www.bestbuy.com/" },
  { id: "sephora", url: "https://www.sephora.com/" },
  { id: "stockx", url: "https://stockx.com/" },
  { id: "draftkings", url: "https://www.draftkings.com/" },
  { id: "fanduel", url: "https://www.fanduel.com/" },
  { id: "bet365", url: "https://www.bet365.com/" },
  { id: "caesars", url: "https://www.caesars.com/sportsbook-and-casino" },
  { id: "etsy", url: "https://www.etsy.com/" },
  { id: "wayfair", url: "https://www.wayfair.com/" },
];

async function dismissNoise(page) {
  const selectors = [
    "#sp-cc-accept",
    "input#sp-cc-accept",
    "button:has-text('Accept')",
    "button:has-text('Accept all')",
    "button:has-text('Accept All')",
    "button:has-text('I Agree')",
    "button:has-text('Got it')",
    "button:has-text('Close')",
    "[aria-label='Close']",
    "#onetrust-accept-btn-handler",
  ];
  for (const sel of selectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 800 })) {
        await el.click({ timeout: 1000 }).catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }
}

async function captureOne(browser, site) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    locale: "en-US",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const file = path.join(outDir, `${site.id}.jpg`);
  try {
    console.log(`capturing ${site.id}…`);
    await page.goto(site.url, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(2500);
    await dismissNoise(page);
    await page.waitForTimeout(800);
    await page.screenshot({ path: file, type: "jpeg", quality: 78, fullPage: false });
    console.log(`ok ${site.id}`);
    return true;
  } catch (err) {
    console.error(`fail ${site.id}:`, err instanceof Error ? err.message : err);
    try {
      await page.screenshot({ path: file, type: "jpeg", quality: 70, fullPage: false });
      console.log(`partial ${site.id}`);
      return true;
    } catch {
      return false;
    }
  } finally {
    await context.close();
  }
}

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });
  const ok = [];
  const bad = [];
  for (const site of sites) {
    const success = await captureOne(browser, site);
    (success ? ok : bad).push(site.id);
  }
  await browser.close();
  console.log(JSON.stringify({ ok, bad }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
