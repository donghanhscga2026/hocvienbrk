/* App luôn đọc dữ liệu mới từ mạng. Không tạo cache cho API hoặc hồ sơ riêng tư. */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.mode !== 'navigate') return
  event.respondWith(fetch(event.request).catch(() => new Response(
    '<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>MFC - Chưa có kết nối</title><body style="font-family:system-ui;padding:24px;max-width:480px;margin:40px auto"><h1>Chưa có kết nối mạng</h1><p>Hãy bật Wi-Fi hoặc dữ liệu di động để xem thông tin mới.</p><button onclick="location.reload()" style="padding:14px 20px;border:0;border-radius:12px;background:#047857;color:white;font-size:16px">Thử lại</button></body></html>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } }
  )))
})
