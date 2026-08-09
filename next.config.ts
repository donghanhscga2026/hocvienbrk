import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tăng tốc phản hồi HTTP
  compress: true,

  allowedDevOrigins: ["192.168.1.3:3000"],

  // Tối ưu serverless deploy
  output: "standalone",

  // Strict mode giúp phát hiện bug React
  reactStrictMode: true,

  // Tối ưu import package lớn
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },

  images: {
    // [TEST] Thử bật lại Image Optimization trên Vercel Preview để kiểm tra
    // xem lỗi "resolved to private ip" (NAT64/DNS64 false-positive, xem
    // CURRENT_STATE.md mục Giai đoạn 3) có xảy ra trên hạ tầng Vercel thật hay không.
    unoptimized: false,
    // Các mức quality được phép
    qualities: [50, 60, 70, 75, 80, 85, 90],

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
        hostname: "i.postimg.cc",
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