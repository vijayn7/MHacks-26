import { getApp } from '../../../lib/server'

export const runtime = 'nodejs'

async function handle(request: Request): Promise<Response> {
  return getApp()(request)
}

export const GET = handle
export const POST = handle
export const PATCH = handle
export const DELETE = handle
export const OPTIONS = handle
