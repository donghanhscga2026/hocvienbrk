import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import Script from "next/script";
import { unstable_cache } from "next/cache";
import prisma from "@/lib/prisma";
import "./globals.css";
import Providers from "./providers";
import PwaInstallProvider from "@/components/pwa/PwaInstallProvider";
import PendingSurveyHandler from "@/components/home/PendingSurveyHandler";
import AffiliateTracker from "@/components/AffiliateTracker";
import AccountAssistantTrigger from "@/components/auth/AccountAssistantTrigger";
import { getSession } from "@/lib/get-session";
import { getAttentionHighlightSettings } from "@/app/actions/attention-highlight-actions";
import { headers } from 'next/headers'
import { domainContext } from '@/lib/website/domain-context'
import { domainWebsite } from '@/lib/website/presentation-server'
import DomainShell from '@/components/website/DomainShell'
import { DEFAULT_ATTENTION_CONFIG } from '@/lib/attention-highlight-types'
import { websiteTheme, normalizeWebsitePalette } from '@/lib/website/theme'
import { getCurrentSiteProfile, getSiteRuntimeConfig } from "@/lib/site-profile/runtime";

// [OPTIMIZE] font-thin/extralight/light (100/200/300) không có class Tailwind
// nào trong toàn bộ codebase dùng tới (đã kiểm bằng grep) — bỏ để giảm số file
// font tải trên mọi trang. Font Inter cũng đã bỏ hẳn: trước đây tải kèm toàn
// site nhưng chỉ dùng đúng 1 chỗ ở CourseCard.tsx, nay đổi sang dùng chung
// Be Vietnam Pro.
const beVietnamPro = Be_Vietnam_Pro({
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["vietnamese", "latin"],
  variable: "--font-be-vietnam-pro",
});

export async function generateMetadata(): Promise<Metadata> {
  const domain=await domainContext()
  if(domain){
    const doc=await domainWebsite(domain.profile)
    const config=getSiteRuntimeConfig(domain.profile)
    const name=config.branding.name || doc?.name || domain.profile.title || domain.hostname
    return {metadataBase:new URL('https://'+domain.hostname),title:{default:name,template:'%s | '+name},description:doc?.description || '',applicationName:name,icons:config.branding.faviconUrl?{icon:config.branding.faviconUrl,apple:config.branding.faviconUrl}:undefined,openGraph:{title:name,description:doc?.description || '',siteName:name,url:'https://'+domain.hostname,type:'website'}}
  }
  const profile = await getCurrentSiteProfile()
  const runtimeConfig = profile ? getSiteRuntimeConfig(profile) : null
  const brandName = runtimeConfig?.branding.name || profile?.title || 'MFC'
  const title = profile?.metaTitle || brandName || 'MFC - Dòng chảy Phước Báu'
  const description = profile?.metaDescription || profile?.subtitle
    || 'Chia sẻ, đào tạo, chuyển hiện thực về Nội tâm, Sức khỏe, Mối quan hệ, Tài chính kinh doanh đầu tư và Công nghệ AI, Xây dựng Nhân hiệu, Affiliate'
  const image = profile?.metaImage || profile?.heroImage || '/og-image.png'
  const primaryDomain = profile?.domains.find(domain => domain.isPrimary)?.hostname
    || profile?.domains[0]?.hostname
  const url = primaryDomain ? `https://${primaryDomain}` : undefined

  return {
    title: { default: title, template: `%s | ${title}` },
    applicationName: brandName,
    appleWebApp: { capable: true, title: brandName, statusBarStyle: 'default' },
    icons: runtimeConfig?.branding.faviconUrl
      ? { icon: runtimeConfig.branding.faviconUrl, apple: runtimeConfig.branding.faviconUrl }
      : { apple: '/pwa/apple-touch-icon.png' },
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'vi_VN',
      url,
      siteName: brandName || title,
      images: [{ url: image, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  }
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#047857" };

const getThemePaletteMap = unstable_cache(
  async () => {
    try {
      const themes = await prisma.theme.findMany({ select: { id: true, colors: true } })
      return Object.fromEntries(themes.map(theme => [theme.id, theme.colors]))
    } catch (error) {
      console.error('Error fetching theme palettes:', error)
      return {}
    }
  },
  ['site-theme-palettes'],
  { tags: ['site-theme', 'site-profile'], revalidate: 3600 },
)

function compactThemePalette(colors: unknown) {
  const palette = normalizeWebsitePalette(colors)
  return {
    p: palette.primary || '#4EB09B', op: palette.onPrimary || '#ffffff',
    s: palette.surface || '#ffffff', b: palette.background || '#FAE0C7',
    os: palette.foreground || '#333333', m: palette.muted || '#765F5C',
    a: palette.accent || '#F28076', o: palette.outline || '#FBC193', d: false,
  }
}


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const domain=await domainContext()
  if(domain) {
    const [doc,session]=await Promise.all([domainWebsite(domain.profile),getSession()])
    const path=(await headers()).get('x-website-path') || '/'
    const config=getSiteRuntimeConfig(domain.profile)
    const brand={palette:domain.profile.theme?.colors,logoUrl:config.branding.logoUrl,tools:config.modules.tools,name:config.branding.name || doc?.name || domain.profile.title || domain.hostname,color:doc?.color || '#7c3aed',background:doc?.background || '#ffffff',ownerId:domain.profile.userId,footerText:domain.profile.footerText,courses:domain.courses,crm:domain.crm,affiliate:domain.affiliate}
    const theme=websiteTheme(brand.color,brand.background,brand.palette)
    return <html lang="vi" data-website-theme={theme.dark ? 'dark' : 'light'} style={theme.style}><body className={`${beVietnamPro.variable} antialiased`}><Providers session={session} website attentionHighlight={{config:DEFAULT_ATTENTION_CONFIG,items:[]}}><DomainShell brand={brand} pages={doc?.pages.map(p=>({title:p.title,slug:p.slug}))} path={path}>{children}{domain.affiliate && <AffiliateTracker />}</DomainShell></Providers></body></html>
  }
  const [siteProfile, themeRows] = await Promise.all([
    getCurrentSiteProfile(),
    getThemePaletteMap(),
  ])
  const runtimeConfig = siteProfile ? getSiteRuntimeConfig(siteProfile) : null
  const siteThemeId = siteProfile?.themeId || 'classic'
  const palettes = Object.fromEntries(
    Object.entries(themeRows).map(([id, colors]) => [id, compactThemePalette(colors)]),
  )
  const profilePalette = compactThemePalette(siteProfile?.theme?.colors)
  const session = await getSession()
  const attentionHighlight = await getAttentionHighlightSettings()

  const INITIAL_SCRIPT = `
(function(){
  var T=${JSON.stringify(palettes)};
  var PROFILE=${JSON.stringify(profilePalette)};
  var PROFILE_ID=${JSON.stringify(siteThemeId)};
  var ALLOW_OVERRIDE=${runtimeConfig?.theme.allowUserOverride === true ? 'true' : 'false'};
  var r=function(h,a){if(typeof h!=="string"||!/^#[0-9a-f]{6}$/i.test(h))return h;var x=h.replace("#","");return"rgba("+parseInt(x.substr(0,2),16)+","+parseInt(x.substr(2,2),16)+","+parseInt(x.substr(4,2),16)+","+a+")"};
  var g=function(c){return".bg-brk-surface,.bg-brk-section{background-color:"+c.s+"!important}.bg-brk-background,.bg-brk-bg,.bg-brk-section-alt,body{background-color:"+c.b+"!important}.text-brk-on-surface,.text-brk-section{color:"+c.os+"!important}.text-brk-muted,.text-brk-section-secondary{color:"+c.m+"!important}.text-brk-primary{color:"+c.p+"!important;text-shadow:0 0 10px "+r(c.p,.25)+",0 0 20px "+r(c.p,.25)+"!important}.bg-brk-primary,.bg-brk-secondary{background-color:"+c.p+"!important}.bg-brk-primary:hover{filter:brightness(.9)}.text-brk-on-primary{color:"+c.op+"!important}.text-brk-accent{color:"+c.a+"!important}.bg-brk-accent{background-color:"+c.a+"!important}.border-brk-outline,.border-brk-section{border-color:"+c.o+"!important}.bg-brk-accent-10{background-color:"+r(c.a,.1)+"!important}.bg-brk-accent-20{background-color:"+r(c.a,.2)+"!important}.bg-brk-accent-30{background-color:"+r(c.a,.3)+"!important}.text-brk-bg{color:"+c.b+"!important}.bg-brk-bg{background-color:"+c.b+"!important}.ring-brk-section,.ring-brk-outline{--tw-ring-color:"+c.o+"!important}.border-brk-primary{border-color:"+c.p+"!important}.shadow-brk-primary\\\\/10{box-shadow:0 10px 15px -3px "+r(c.p,.1)+"!important}.shadow-brk-primary\\\\/20{box-shadow:0 10px 15px -3px "+r(c.p,.2)+"!important}.ring-brk-primary{--tw-ring-color:"+r(c.p,.2)+"!important}footer{background-color:"+c.b+"!important}footer p,footer span{color:"+c.m+"!important}"};
  var saved=ALLOW_OVERRIDE?(localStorage.getItem("site-theme")||PROFILE_ID):PROFILE_ID;
  var theme=T[saved]||PROFILE;
  if(ALLOW_OVERRIDE&&saved==="custom"){
    var custom=localStorage.getItem("site-custom-colors");
    if(custom){try{var cu=JSON.parse(custom);for(var k in cu){if(k in theme)theme[k]=cu[k]}}catch(e){}}
  }
  var el=document.getElementById("theme-base-css");
  if(!el){el=document.createElement("style");el.id="theme-base-css";document.head.appendChild(el)}
  el.textContent=g(theme);
  document.documentElement.setAttribute("data-theme",saved);
  document.documentElement.setAttribute("data-site-profile",${JSON.stringify(siteProfile?.slug || 'default')});
})();
`;


  return (
    <html lang="vi" suppressHydrationWarning>
      <body
        className={`${beVietnamPro.variable} antialiased`}
        suppressHydrationWarning
      >
        <Script
          id="theme-initializer"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: INITIAL_SCRIPT }}
        />
        <Providers session={session} attentionHighlight={attentionHighlight}>
          <PwaInstallProvider>
          {children}
          {runtimeConfig?.modules.affiliate !== false && <AffiliateTracker />}
          <AccountAssistantTrigger />
          </PwaInstallProvider>
        </Providers>
        {runtimeConfig?.modules.surveys !== false && <PendingSurveyHandler />}
      </body>
    </html>
  );
}
