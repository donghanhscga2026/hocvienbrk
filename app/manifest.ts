import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
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
