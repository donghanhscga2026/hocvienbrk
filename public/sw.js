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

function pushStore(action) {
  return new Promise((resolve,reject) => {
    const open = indexedDB.open('mfc-push',1)
    open.onupgradeneeded = () => open.result.createObjectStore('state')
    open.onerror = () => reject(open.error)
    open.onsuccess = () => {
      const db = open.result, tx = db.transaction('state','readwrite')
      const store = tx.objectStore('state')
      let result
      action(store,value => { result = value })
      tx.oncomplete = () => { db.close(); resolve(result) }
      tx.onerror = () => { db.close(); reject(tx.error) }
    }
  })
}
function readPushState(key) {
  return pushStore((store,done) => { const request=store.get(key); request.onsuccess=()=>done(request.result) })
}
self.addEventListener('message',event => {
  if (event.data?.type !== 'MFC_PUSH_USER') return
  const userId = event.data.userId
  if (userId !== null && !/^\d+$/.test(userId)) return
  event.waitUntil(pushStore(store => {
    store.put(userId,'user')
  }).then(async () => {
    const notifications = await self.registration.getNotifications()
    for (const notification of notifications) if (notification.data?.userId !== userId) notification.close()
    event.ports[0]?.postMessage({ok:true})
  }).catch(() => event.ports[0]?.postMessage({ok:false})))
})
let pushChain = Promise.resolve()
function lessonUrl(value) {
  try {
    const url = new URL(value,self.location.origin)
    return url.origin === self.location.origin && /^\/courses\/[^/]+\/learn$/.test(url.pathname)
      && !!url.searchParams.get('lesson') ? url.href : null
  } catch { return null }
}
self.addEventListener('push',event => {
  pushChain = pushChain.catch(()=>{}).then(async () => {
    let data
    try { data=event.data?.json() } catch { return }
    if (!data || typeof data.id !== 'string' || data.id.length>128 || typeof data.userId !== 'string'
      || typeof data.body !== 'string' || !lessonUrl(data.url)) return
    if (await readPushState('user') !== data.userId || await readPushState('seen:'+data.id)) return
    await self.registration.showNotification('Bài học mới', {
      body:data.body.slice(0,180),icon:'/pwa/icon-192.png',badge:'/pwa/icon-192.png',
      tag:'lesson:'+data.id,data:{url:lessonUrl(data.url),userId:data.userId}
    })
    await pushStore(store => {
      store.put(Date.now(),'seen:'+data.id)
      const cursor = store.openCursor()
      cursor.onsuccess = () => {
        const row=cursor.result
        if (!row) return
        if (String(row.key).startsWith('seen:') && row.value<Date.now()-7*86400000) row.delete()
        row.continue()
      }
    })
  })
  event.waitUntil(pushChain)
})
self.addEventListener('notificationclick',event => {
  event.notification.close()
  event.waitUntil((async () => {
    const data=event.notification.data, lesson=lessonUrl(data?.url)
    if (!lesson || await readPushState('user') !== data.userId) return
    // Trang khóa học tạo một mục lịch sử thật trước khi chuyển vào bài.
    // Back của điện thoại sẽ trở về khóa học thay vì đóng cửa sổ mới.
    const destination=new URL(lesson)
    const coursePath=destination.pathname.replace(/^\/courses\//,'/khoa-hoc/').replace(/\/learn$/,'')
    const entry=new URL(coursePath,self.location.origin)
    entry.searchParams.set('notificationLesson',destination.searchParams.get('lesson'))
    const url=entry.href

    // Để Chrome chọn app standalone đã cài; focus một tab cùng tên miền
    // trước sẽ bỏ qua bước này và đưa người dùng vào trình duyệt.
    let openError
    try {
      const opened=await self.clients.openWindow(url)
      if (opened) {
        try { await opened.focus() } catch { /* Cửa sổ đã được mở; không mở thêm bản thứ hai. */ }
      }
      return
    } catch (error) { openError=error }

    // Chỉ dùng cửa sổ có sẵn khi trình duyệt từ chối openWindow.
    let windows=[]
    try { windows=await self.clients.matchAll({type:'window',includeUncontrolled:true}) } catch {}
    const sameOrigin=windows.filter(client => {
      try { return new URL(client.url).origin===self.location.origin } catch { return false }
    })
    for (const client of sameOrigin) {
      try {
        // Focus trước navigate để tránh bài học mở ngầm trên Android.
        const active=await client.focus() || client
        if (active.url===url || await active.navigate(url)) return
      } catch { /* Thử cửa sổ kế tiếp nếu cửa sổ này không còn dùng được. */ }
    }
    throw openError
  })())
})
