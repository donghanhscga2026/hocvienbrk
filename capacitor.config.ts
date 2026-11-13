import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'vn.giautoandien.app',
  appName: 'MFC',
  webDir: 'capacitor-www',
  server: {
    // Remote mode: web la Next.js SSR + API routes, khong xuat tinh duoc.
    // App nap truc tiep ban web production; sua web la app tu cap nhat theo.
    url: 'https://giautoandien.io.vn',
    androidScheme: 'https',
    cleartext: false,
  },
};

export default config;
