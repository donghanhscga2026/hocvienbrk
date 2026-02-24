import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["vietnamese", "latin"],
  variable: "--font-be-vietnam-pro",
});

export const metadata: Metadata = {
  title: "Học Viện BRK - Nâng Tầm Năng Lực",
  description: "Học viện đào tạo thực chiến về AI, Nhân hiệu và Affiliate",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body
        className={`${beVietnamPro.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
