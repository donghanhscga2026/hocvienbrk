import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tăng tốc phản hồi HTTP
  compress: true,

  // Tối ưu serverless deploy
  output: "standalone",

  // Strict mode giúp phát hiện bug React
  reactStrictMode: true,

  // Tối ưu import package lớn
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  images: {
    // Chỉ cho phép domain ảnh thực sự dùng
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "i.imgur.com",
      },
      {
        protocol: "https",
        hostname: "postimg.cc",
      },
      {
        protocol: "https",
        hostname: "**.postimg.cc",
      },
      {
        protocol: "https",
        hostname: "api.vietqr.io",
      },
      {
        protocol: "https",
        hostname: "img.vietqr.io",
      }
    ],

    // Format ảnh hiện đại
    formats: ["image/avif", "image/webp"],

    // Cache ảnh lâu hơn
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 ngày
  },

  // Tắt source map production để giảm bundle
  productionBrowserSourceMaps: false,

  // Headers bảo mật cơ bản
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

export default nextConfig;