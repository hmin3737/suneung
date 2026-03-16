import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // better-sqlite3는 서버 전용 native module
  serverExternalPackages: ['better-sqlite3', 'xlsx', 'adm-zip'],
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
};

export default nextConfig;
