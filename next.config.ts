import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

// OpenNext: initialize Cloudflare bindings for local dev (no-op in production)
if (process.env.NODE_ENV === 'development') {
  import('@opennextjs/cloudflare').then((m) => {
    if ('initOpenNextCloudflareForDev' in m) {
      (m as { initOpenNextCloudflareForDev: () => void }).initOpenNextCloudflareForDev();
    }
  }).catch(() => {
    // @opennextjs/cloudflare not installed — skip (e.g. CI lint-only)
  });
}

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  // Skip ESLint during build — lint runs as a separate CI step
  eslint: { ignoreDuringBuilds: true },

  // Skip TypeScript errors during build — typecheck runs as a separate CI step
  typescript: { ignoreBuildErrors: true },

  // Transpile workspace packages that use .js extension imports (ESM convention)
  transpilePackages: ['@bukeer/website-contract', '@bukeer/theme-sdk'],

  // Disable built-in image optimization (Cloudflare Workers doesn't support it natively).
  // Re-enable when Cloudflare Images binding is configured.
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'wzlxbpicdcdvxvdcvgas.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'colombiatours.travel',
      },
      {
        protocol: 'https',
        hostname: 'randomuser.me',
      },
      {
        protocol: 'https',
        hostname: '*.unsplash.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
    formats: ['image/avif', 'image/webp'],
  },

  // Optimize package imports for smaller bundles
  experimental: {
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-select',
      '@radix-ui/react-tabs',
      '@radix-ui/react-navigation-menu',
      'framer-motion',
    ],
  },

  // Headers for security and caching
  async headers() {
    return [
      // Editor route - permite iframe desde app.bukeer.com (CSP reemplaza X-Frame-Options)
      {
        source: '/editor/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "frame-ancestors 'self' https://app.bukeer.com http://localhost:*",
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
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      // Security headers for all other routes
      {
        // Exclude `/editor/*` so it can be embedded cross-origin via CSP.
        // If `/editor/*` also receives X-Frame-Options: SAMEORIGIN, the iframe will be blocked.
        source: '/:path((?!editor).*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
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
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      // Long cache for static assets (fonts, images, CSS, JS)
      {
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      // Cache for images
      {
        source: '/_next/image/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
};

export default withBundleAnalyzer(nextConfig);
