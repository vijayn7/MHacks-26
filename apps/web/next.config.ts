import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@impulse/shared', '@impulse/api', '@impulse/db'],
  serverExternalPackages: [],
}

export default nextConfig
