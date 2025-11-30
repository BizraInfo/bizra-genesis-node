/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Output configuration for Vercel
  output: 'standalone',
  
  // Image optimization
  images: {
    domains: ['localhost', 'bizra.info', 'api.bizra.info', 'bizra.ai', 'api.bizra.ai'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.bizra.info',
      },
      {
        protocol: 'https',
        hostname: '**.bizra.ai',
      },
    ],
  },

  // Environment variables exposed to the browser
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.bizra.info',
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || 'wss://api.bizra.info/ws',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://bizra.info',
  },

  // Webpack config for THREE.js optimization
  webpack: (config, { isServer }) => {
    // Optimize THREE.js bundle size
    config.resolve.alias = {
      ...config.resolve.alias,
      'three/examples/jsm/loaders/GLTFLoader': false,
      'three/examples/jsm/controls/OrbitControls': false,
    };

    // Optimize for production builds
    if (!isServer) {
      config.optimization.splitChunks.cacheGroups = {
        ...config.optimization.splitChunks.cacheGroups,
        three: {
          test: /[\\/]node_modules[\\/]three[\\/]/,
          name: 'three',
          chunks: 'all',
          priority: 1,
        },
      };
    }

    return config;
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/favicon.ico',
        destination: '/favicon.svg',
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
