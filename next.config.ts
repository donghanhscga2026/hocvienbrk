import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // 1. Tắt tính năng tối ưu hóa ảnh tạm thời để sửa lỗi 400 Bad Request ngay lập tức
    // Nếu link ảnh của bạn đã được tối ưu (WebP/JPG sẵn), việc này giúp load ảnh nhanh mà không qua bộ lọc của Next.js
    unoptimized: true,

    // 2. Mở khóa toàn bộ các nguồn ảnh (Remote Patterns)
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // Cho phép tất cả các tên miền
      },
      {
        protocol: 'http',
        hostname: '**',
      }
    ],

    // 3. Khai báo các mức chất lượng để tránh lỗi từ phía Component
    qualities: [50, 70, 75, 80, 90],
  },

  // 4. Kích hoạt nén tài nguyên để tăng tốc độ phản hồi
  compress: true,
};

export default nextConfig;