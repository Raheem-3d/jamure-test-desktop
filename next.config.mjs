/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  trailingSlash: false, 

  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  experimental: {
    // App Router ke liye body size limit (5GB for large file uploads)
    serverActions: {
      bodySizeLimit: '5gb',
    },
  },

  // Server configuration for API routes
  serverRuntimeConfig: {
    // Server-side only
    maxRequestBodySize: '5gb',
  },

  publicRuntimeConfig: {
    // Client-side
  },

  // Webpack configuration for larger uploads
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.optimization.minimize = false;
    }
    return config;
  },

  // CORS headers for mobile app
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' }, // In production, set to specific domain
          { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization' },
        ],
      },
    ];
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      // Local dev ke liye
      { protocol: 'http', hostname: 'localhost', port: '3000' },

      // Agar tum remote DB ya images use karte ho
      // { protocol: 'https', hostname: 'chatapp.rumzz.com' },
    ],
  },

  env: {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM,
  },
    output: 'standalone',
}

export default nextConfig;
