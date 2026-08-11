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
    // Đã kiểm tra qua Vercel Preview (2026-08-09): lỗi "resolved to private ip"
    // trước đây chỉ xảy ra do NAT64/DNS64 trong 1 môi trường dev cụ thể, KHÔNG
    // tái hiện trên hạ tầng Vercel thật (đã test cả postimg.cc lẫn Supabase,
    // tải bình thường). Xem CURRENT_STATE.md mục Giai đoạn 3.
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
        hostname: "i.ibb.co",
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

  // Redirect link cũ sang mã khóa học mới sau khi đổi id_khoa, để quảng
  // cáo/ảnh QR/bookmark cũ đã phát ra không bị 404 (link cũ trỏ tới id_khoa
  // cũ của khóa #22, "Quà tặng Lv1", đổi mã ngày 2026-08-11 — xem trao đổi
  // trong phiên làm việc). permanent:true (308) giữ nguyên query string như
  // ?ref=... của link affiliate.
  async redirects() {
    return [
      {
        source: "/khoa-hoc/XD_HETHONG_UP1000",
        destination: "/khoa-hoc/QUA_LV1",
        permanent: true,
      },
    ];
  },

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