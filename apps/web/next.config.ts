import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@techseeker/ui', '@techseeker/types'],
  outputFileTracingRoot: path.join(__dirname, '../../'),
  experimental: {
    typedRoutes: true,
  },
};

export default nextConfig;

