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
    // (2026-08-12) Vấn đề NAT64/DNS64 tái hiện lại trên máy dev: DNS trả thêm
    // địa chỉ IPv6 tiền tố 64:ff9b::/96 (NAT64) cho một số domain ảnh
    // (i.postimg.cc, i.imgur.com, i.ibb.co...), bị Next.js coi là "private ip"
    // và chặn — dù domain đã nằm trong remotePatterns bên dưới. Bật
    // dangerouslyAllowLocalIP chỉ ở dev để bỏ qua đúng bước kiểm tra IP này
    // (domain vẫn phải khớp remotePatterns nên không mở rộng rủi ro); production
    // (Vercel) giữ nguyên vì không gặp lỗi này.
    dangerouslyAllowLocalIP: process.env.NODE_ENV !== 'production',
    // Ảnh dán link ngoài (postimg.cc, imgur, ibb.co...) giờ được tự động tải
    // về, nén và lưu vào Supabase Storage khi lưu khoá học/bài viết (xem
    // resolveImageUrl() trong lib/image-utils.ts) — next/image không còn
    // phải fetch trực tiếp các host ngoài không ổn định gây timeout, nên có
    // thể bật lại Image Optimization (WebP/AVIF/resize theo viewport).
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
