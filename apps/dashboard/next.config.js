/** @type {import('next').NextConfig} */

// Bundle analyzer - run with ANALYZE=true npm run build
const isAnalyzeEnabled = process.env.ANALYZE === 'true';
const withBundleAnalyzer = isAnalyzeEnabled
  ? (() => {
      try {
        const analyzer = require('@next/bundle-analyzer');
        return analyzer({ enabled: true });
      } catch (error) {
        console.warn('Bundle analyzer not available; continuing without it.', error);
        return (config) => config;
      }
    })()
  : (config) => config;

const nextConfig = {
  reactStrictMode: true,

  // Optimize package imports (tree-shaking)
  modularizeImports: {
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{ kebabCase member }}',
    },
  },

  // Experimental optimizations
  experimental: {
    optimizePackageImports: ['framer-motion', 'lucide-react'],
  },

  // Production output for Docker/standalone
  output: process.env.NODE_ENV === 'production' ? 'standalone' : undefined,

  // Image optimization domains
  images: {
    domains: ['bizra.info', 'bizra.ai', 'api.bizra.ai'],
    unoptimized: process.env.UNOPTIMIZED_IMAGES === 'true',
  },

  // Security headers
  async headers() {
    const isDev = process.env.NODE_ENV === 'development';
    const connectSrc = isDev 
      ? "'self' ws://localhost:3002 wss://localhost:3002 http://localhost:8080"
      : "'self' wss://ws.bizra.ai https://api.bizra.ai https://bizra.info https://bizra.ai";
    
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          // CSP - production ready
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https://bizra.info https://bizra.ai",
              "font-src 'self' data:",
              `connect-src ${connectSrc}`,
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },

  // Proxy API requests to Rust backend
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
    ];
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
  },
};

module.exports = withBundleAnalyzer(nextConfig);
