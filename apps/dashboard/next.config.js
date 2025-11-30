/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    domains: ['localhost'],
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
};

module.exports = nextConfig;
