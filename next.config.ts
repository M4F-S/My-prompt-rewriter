import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // API route optimizations
  experimental: {
    serverComponentsExternalPackages: ['groq-sdk'],
  },
  
  // Environment variable validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/api/health',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  
  // Redirects for API versioning
  async redirects() {
    return [
      {
        source: '/api/v1/:path*',
        destination: '/api/:path*',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
