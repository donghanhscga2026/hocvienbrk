import type { Metadata } from "next";
import { Be_Vietnam_Pro, Inter } from "next/font/google";
import Script from "next/script";
import prisma from "@/lib/prisma";
import "./globals.css";
import Providers from "./providers";
import PendingSurveyHandler from "@/components/home/PendingSurveyHandler";
import AffiliateTracker from "@/components/AffiliateTracker";

const beVietnamPro = Be_Vietnam_Pro({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["vietnamese", "latin"],
  variable: "--font-be-vietnam-pro",
});

const inter = Inter({
  subsets: ["vietnamese", "latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Cộng đồng BRK - Nâng Tầm Năng Lực",
  description: "Chia sẻ, đào tạo, chuyển hiện thực về Nội tâm, Sức khỏe, Mối quan hệ, Tài chính kinh doanh đầu tư và Công nghệ AI, Xây dựng Nhân hiệu, Affiliate",
};

async function getSiteTheme() {
  try {
    const siteSettings = await prisma.siteSettings.findFirst({
      include: { theme: true },
    })
    return siteSettings?.themeId || 'classic'
  } catch (error) {
    console.error('Error fetching site theme:', error)
    return 'classic'
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteThemeId = await getSiteTheme()

  const INITIAL_SCRIPT = `
(function(){
  var T={"default":{p:"#4EB09B",op:"#FFF",s:"#FFF",b:"#FAE0C7",os:"#333",m:"#FFB6AF",a:"#F28076",o:"#FBC193",d:false},"light":{p:"#41B3A3",op:"#FFF",s:"#FFF",b:"#85DCB0",os:"#2D3142",m:"#E8A87C",a:"#E27D60",o:"#C38D9E",d:false},"dark":{p:"#8B5CF6",op:"#FFF",s:"#1E1E1E",b:"#121212",os:"#F3F4F6",m:"#9CA3AF",a:"#10B981",o:"#333",d:true},"highend":{p:"#EC4899",op:"#FFF",s:"#FFF",b:"#FAF5FF",os:"#4C1D95",m:"#6B7280",a:"#06B6D4",o:"#E9D5FF",d:false},"ocean":{p:"#059669",op:"#FFF",s:"#FFF",b:"#F0FDF4",os:"#064E3B",m:"#475569",a:"#FB923C",o:"#D1FAE5",d:false},"classic":{p:"#4EB09B",op:"#FFF",s:"#FFF",b:"#FAE0C7",os:"#333",m:"#FFB6AF",a:"#F28076",o:"#FBC193",d:false}};
  var r=function(h,a){var x=h.replace("#","");return"rgba("+parseInt(x.substr(0,2),16)+","+parseInt(x.substr(2,2),16)+","+parseInt(x.substr(4,2),16)+","+a+")"};
  var g=function(c){return".bg-brk-surface,.bg-brk-section{background-color:"+c.s+"!important}.bg-brk-background,.bg-brk-bg,.bg-brk-section-alt,body{background-color:"+c.b+"!important}.text-brk-on-surface,.text-brk-section{color:"+c.os+"!important}.text-brk-muted,.text-brk-section-secondary{color:"+c.m+"!important}.text-brk-primary{color:"+c.p+"!important;text-shadow:0 0 10px "+r(c.p,.25)+",0 0 20px "+r(c.p,.25)+"!important}.bg-brk-primary,.bg-brk-secondary{background-color:"+c.p+"!important}.bg-brk-primary:hover{filter:brightness(.9)}.text-brk-on-primary{color:"+c.op+"!important}.text-brk-accent{color:"+c.a+"!important}.bg-brk-accent{background-color:"+c.a+"!important}.border-brk-outline,.border-brk-section{border-color:"+c.o+"!important}.bg-brk-accent-10{background-color:"+r(c.a,.1)+"!important}.bg-brk-accent-20{background-color:"+r(c.a,.2)+"!important}.bg-brk-accent-30{background-color:"+r(c.a,.3)+"!important}.text-brk-bg{color:"+c.b+"!important}.bg-brk-bg{background-color:"+c.b+"!important}.ring-brk-section,.ring-brk-outline{--tw-ring-color:"+c.o+"!important}.border-brk-primary{border-color:"+c.p+"!important}.shadow-brk-primary\\\\/10{box-shadow:0 10px 15px -3px "+r(c.p,.1)+"!important}.shadow-brk-primary\\\\/20{box-shadow:0 10px 15px -3px "+r(c.p,.2)+"!important}.ring-brk-primary{--tw-ring-color:"+r(c.p,.2)+"!important}footer{background-color:"+(c.d?c.b:"#f3f4f6")+"!important}footer p,footer span{color:"+c.m+"!important}"};
  var saved=localStorage.getItem("site-theme")||"${siteThemeId}";
  var custom=localStorage.getItem("site-custom-colors");
  var theme=T[saved]||T["${siteThemeId}"];
  if(saved==="custom"&&custom){try{var cu=JSON.parse(custom);for(var k in cu)theme[k]=cu[k]}catch(e){}}
  var el=document.getElementById("theme-base-css");
  if(!el){el=document.createElement("style");el.id="theme-base-css";document.head.appendChild(el)}
  el.textContent=g(theme);
  document.documentElement.setAttribute("data-theme",saved);
})();
`;

  return (
    <html lang="vi" suppressHydrationWarning>
      <head>
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
        >
          {INITIAL_SCRIPT}
        </Script>
      </head>
      <body
        className={`${beVietnamPro.variable} ${inter.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          {children}
          <AffiliateTracker />
        </Providers>
        <PendingSurveyHandler />
      </body>
    </html>
  );
}
