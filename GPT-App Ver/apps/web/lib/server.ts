import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { createApp, type AppConfig } from '@impulse/api'
import { openFile, type SqliteRepo } from '@impulse/db'
import { exchangeGoogle } from './google'
import { sendSms } from './sms'

type App = ReturnType<typeof createApp>

const globalStore = globalThis as unknown as { impulseApp?: App; impulseRepo?: SqliteRepo }

export function getApp(): App {
  if (globalStore.impulseApp) return globalStore.impulseApp
  const databasePath = process.env.DATABASE_PATH ?? '.data/impulse.db'
  mkdirSync(dirname(databasePath), { recursive: true })
  const config: AppConfig = {
    allowDevAuth: process.env.ALLOW_DEV_AUTH !== 'false',
    appBaseUrl: process.env.APP_BASE_URL ?? 'http://localhost:3000',
    supabaseUrl: process.env.SUPABASE_URL,
    googleConfigured: Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
    ai: {
      apiKey: process.env.AI_API_KEY,
      baseUrl: process.env.AI_API_BASE,
      model: process.env.AI_MODEL,
    },
    smsConfigured: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM),
  }
  const repo = openFile(databasePath, { pepper: process.env.TOKEN_PEPPER })
  globalStore.impulseRepo = repo
  globalStore.impulseApp = createApp(repo, config, { exchange: exchangeGoogle, sendSms })
  return globalStore.impulseApp
}
