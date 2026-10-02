'use client'

const bindingKey = 'mfc-push-user'
export async function pushId(endpoint: string) {
  const digest = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(endpoint))
  return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('')
}
export async function bindPushWorker(registration: ServiceWorkerRegistration, userId: string | null) {
  const worker = registration.active
  if (!worker) throw new Error('App chưa sẵn sàng. Hãy tải lại trang.')
  await new Promise<void>((resolve,reject) => {
    const channel = new MessageChannel()
    const timer = setTimeout(()=>{channel.port1.close();reject(new Error('Chưa lưu được cài đặt thiết bị. Hãy thử lại.'))},5000)
    channel.port1.onmessage = event => {clearTimeout(timer);channel.port1.close();if (event.data?.ok) resolve(); else reject(new Error('Chưa lưu được cài đặt thiết bị.'))}
    worker.postMessage({type:'MFC_PUSH_USER',userId},[channel.port2])
  })
}
// Xóa ràng buộc trước khi đăng xuất; push đang trên đường tới sẽ không hiện cho tài khoản cũ.
export async function disablePushDevice() {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.getRegistration('/')
  if (!registration) return
  const subscription = await registration.pushManager?.getSubscription()
  await bindPushWorker(registration,null)
  if (subscription) {
    const id = await pushId(subscription.endpoint)
    await subscription.unsubscribe()
    try { await fetch('/api/push/subscriptions',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})}) } catch { /* Browser đã hủy endpoint; server dọn khi nhận 410. */ }
  }
  localStorage.removeItem(bindingKey)
}
export function savePushBinding(userId: string) { localStorage.setItem(bindingKey,userId) }
export async function clearChangedPushAccount(userId: string | null) {
  const previous = localStorage.getItem(bindingKey)
  if (previous && previous!==userId) await disablePushDevice()
}
export async function signOutPushCleanup() {
  try { await disablePushDevice() } catch {
    // Không chặn đăng xuất; cố gắng hủy endpoint nếu service worker chưa hoạt động.
    try { const r=await navigator.serviceWorker?.getRegistration('/'); await (await r?.pushManager?.getSubscription())?.unsubscribe() } catch {}
    localStorage.removeItem(bindingKey)
  }
}
