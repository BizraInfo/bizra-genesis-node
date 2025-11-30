/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  // Enable WebGL support
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glb|gltf)$/,
      use: [
        {
          loader: 'file-loader',
          options: {
            publicPath: '/_next/static/models/',
            outputPath: 'static/models/',
          },
        },
      ],
    })
    return config
  },
}

module.exports = nextConfig
