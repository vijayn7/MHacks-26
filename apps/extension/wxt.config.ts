import { defineConfig } from 'wxt'

const domains = [
  'amazon.com',
  'ebay.com',
  'etsy.com',
  'walmart.com',
  'target.com',
  'shein.com',
  'nike.com',
  'stockx.com',
  'bestbuy.com',
  'draftkings.com',
  'fanduel.com',
  'betmgm.com',
  'bet365.com',
  'caesars.com',
  'pointsbet.com',
]

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Impulse',
    description: 'A pause before a checkout on sites you chose.',
    permissions: ['storage', 'scripting', 'alarms'],
    host_permissions: ['http://localhost:3000/*', 'http://127.0.0.1:3000/*'],
    optional_host_permissions: domains.map((domain) => `https://*.${domain}/*`),
    action: { default_title: 'Impulse' },
  },
})
