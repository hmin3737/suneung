import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // better-sqlite3는 서버 전용 native module
  serverExternalPackages: ['better-sqlite3'],
  // 업로드 파일 크기 제한 (PDF 최대 50MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },
};

export default nextConfig;
