'use client'

import { useEffect, useRef, useState } from 'react'
import { InstallAppButton } from '@/components/pwa/PwaInstallProvider'
import { bindPushWorker, disablePushDevice, pushId, savePushBinding } from '@/lib/web-push-client'

type Config = { configured: boolean; registered: boolean; publicKey: string | null }
export default function PushDeviceSettings({ userId, onBeforeInstall }: { userId: string; onBeforeInstall: () => void }) {
  const [config,setConfig] = useState<Config | null>(null)
  const [enabled,setEnabled] = useState(false)
  const [supported,setSupported] = useState(false)
  const [needsInstall,setNeedsInstall] = useState(false)
  const [blocked,setBlocked] = useState(false)
  const [busy,setBusy] = useState(false)
  const [error,setError] = useState('')
  const lock = useRef(false)
  useEffect(() => {
    let canceled=false
    const ios=/iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1)
    const standalone=window.matchMedia('(display-mode: standalone)').matches || !!(navigator as Navigator & {standalone?:boolean}).standalone
    setNeedsInstall(ios && !standalone)
    const available=window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    setSupported(available)
    setBlocked(available && Notification.permission==='denied')
    async function load() {
      let subscription: PushSubscription | null=null
      if (available) subscription=await (await navigator.serviceWorker.getRegistration('/'))?.pushManager.getSubscription() ?? null
      const id=subscription ? await pushId(subscription.endpoint) : null
      const response=await fetch('/api/push/subscriptions'+(id ? '?id='+id : ''),{cache:'no-store'})
      const data=await response.json()
      if (!response.ok) throw new Error(data.error || 'Không đọc được cài đặt thiết bị.')
      if (!canceled) {setConfig(data);setEnabled(!!subscription && data.registered && Notification.permission==='granted')}
    }
    void load().catch(e=>{if (!canceled) setError(e.message || 'Không đọc được cài đặt thiết bị.')})
    return ()=>{canceled=true}
  },[userId])
  async function toggle() {
    if (lock.current) return
    lock.current=true;setBusy(true);setError('')
    try {
      if (enabled) {await disablePushDevice();setEnabled(false);return}
      if (!supported || !config?.publicKey) return
      // Xin quyền ngay trong thao tác bấm, trước mọi thao tác chờ mạng.
      const permission=Notification.permission==='default' ? await Notification.requestPermission() : Notification.permission
      if (permission!=='granted') {setBlocked(permission==='denied');throw new Error('Bạn chưa cho phép thông báo trên thiết bị này.')}
      const registration=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'})
      await navigator.serviceWorker.ready
      const key=Uint8Array.from(atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0))
      let subscription=await registration.pushManager.getSubscription()
      if (subscription) {
        const response=await fetch('/api/push/subscriptions?id='+await pushId(subscription.endpoint),{cache:'no-store'})
        const state=await response.json()
        if (!response.ok) throw new Error(state.error || 'Không kiểm tra được thiết bị.')
        if (!state.registered) {await subscription.unsubscribe();subscription=null}
      }
      subscription ??= await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key})
      savePushBinding(userId)
      await bindPushWorker(registration,userId)
      const response=await fetch('/api/push/subscriptions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...subscription.toJSON(),expirationTime:undefined,publicKey:config.publicKey})})
      const data=await response.json()
      if (!response.ok) {await bindPushWorker(registration,null);await subscription.unsubscribe();throw new Error(data.error || 'Không bật được thông báo.')}
      setEnabled(true)
    } catch (e) {setError(e instanceof Error ? e.message : 'Không lưu được cài đặt thiết bị.')}
    finally {lock.current=false;setBusy(false)}
  }
  return <section aria-label="Thông báo trên thiết bị" className="space-y-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-sm">
    <h3 className="font-semibold">Thông báo trên thiết bị này</h3>
    <p className="text-xs text-slate-600">Nhận thông báo bài học mới khi không mở website.</p>
    {needsInstall ? <><p>Trên iPhone/iPad, thêm app vào màn hình chính rồi mở app để bật thông báo.</p><InstallAppButton onBeforeOpen={onBeforeInstall} /></>
      : !supported ? <p>Trình duyệt này chưa hỗ trợ. Hãy thử Chrome, Edge hoặc Safari được cập nhật.</p>
      : !config ? <p>{error ? 'Chưa tải được cài đặt.' : 'Đang kiểm tra thiết bị…'}</p>
      : !config.configured ? <p>Tính năng thông báo trên thiết bị đang được chuẩn bị.</p>
      : blocked ? <p>Bạn đã chặn thông báo. Hãy cho phép trong cài đặt trình duyệt/thiết bị rồi tải lại trang.</p>
      : <button type="button" onClick={toggle} disabled={busy} className="min-h-11 w-full rounded-xl bg-indigo-600 px-3 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Đang lưu…' : enabled ? 'Tắt thông báo trên thiết bị này' : 'Bật thông báo trên thiết bị này'}</button>}
    {enabled && <p role="status" className="text-xs text-green-800">Đã bật cho tài khoản hiện tại trên thiết bị này.</p>}
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </section>
}
