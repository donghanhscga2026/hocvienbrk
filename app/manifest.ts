import type { MetadataRoute } from 'next'
import { getCurrentDeploymentBrand } from '@/lib/site-profile/deployment-runtime'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const brand = await getCurrentDeploymentBrand()
  if (brand) return {
    id: '/', name: `${brand.name} — ${brand.tagline}`, short_name: brand.name,
    description: brand.description, lang: 'vi', start_url: '/', scope: '/', display: 'standalone',
    background_color: '#ffffff', theme_color: brand.palette.primary,
    icons: [{ src: brand.iconUrl, sizes: '1280x854', type: 'image/png', purpose: 'any' }],
  }
  return {
    id: '/', name: 'MFC - Dòng chảy Phước Báu', short_name: 'MFC',
    description: 'Học tập, kết nối và chăm sóc học viên trong cộng đồng MFC.',
    lang: 'vi', start_url: '/', scope: '/', display: 'standalone',
    background_color: '#ffffff', theme_color: '#047857',
    icons: [
      { src: '/pwa/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/pwa/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
