'use client'

import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { Download, PlusSquare, Share2, X } from 'lucide-react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { clearChangedPushAccount } from '@/lib/web-push-client'
import { useWi300Brand } from '@/components/wi300/Wi300BrandContext'

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
const InstallContext = createContext<{ installed: boolean; busy: boolean; install: () => void }>({ installed: false, busy: false, install: () => {} })

export default function PwaInstallProvider({ children }: { children: ReactNode }) {
  const brand = useWi300Brand()
  const appName = brand?.name || 'MFC'
  const { data: session, status } = useSession()
  useEffect(() => {
    if (status !== 'loading') void clearChangedPushAccount(session?.user?.id != null ? String(session.user.id) : null).catch(() => {})
  }, [status, session?.user?.id])
  const pending = useRef<InstallEvent | null>(null)
  const prompting = useRef(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const [installed, setInstalled] = useState(false)
  const [canInstall, setCanInstall] = useState(false)
  const [ios, setIos] = useState(false)
  const [inApp, setInApp] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const display = window.matchMedia('(display-mode: standalone)')
    const refresh = () => setInstalled(display.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone)
    refresh()
    // State giúp hộp hướng dẫn đang mở cũng nhận được nút Cài ngay.
    const beforeInstall = (event: Event) => {
      event.preventDefault()
      pending.current = event as InstallEvent
      setCanInstall(true)
      setError('')
    }
    const didInstall = () => {
      pending.current = null
      setCanInstall(false)
      setInstalled(true)
      dialog.current?.close()
    }
    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', didInstall)
    display.addEventListener('change', refresh)
    // Service worker xử lý mất mạng và thông báo; không cache API, tài khoản hay CRM.
    if ('serviceWorker' in navigator && window.isSecureContext && process.env.NODE_ENV === 'production') {
      void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {})
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall)
      window.removeEventListener('appinstalled', didInstall)
      display.removeEventListener('change', refresh)
      pending.current = null
    }
  }, [])

  const install = () => {
    if (installed || prompting.current) return
    const ua = navigator.userAgent
    setIos(/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
    setInApp(/FBAN|FBAV|Instagram|Zalo|Line\//i.test(ua))
    setError('')
    const event = pending.current
    if (!event) {
      if (!dialog.current?.open) dialog.current?.showModal()
      return
    }
    // Mỗi event chỉ dùng một lần. Ref khóa ngay để chặn bấm liên tục.
    pending.current = null
    prompting.current = true
    setCanInstall(false)
    setBusy(true)
    dialog.current?.close()
    const failed = () => {
      setError('Chưa mở được hộp cài đặt. Bạn có thể dùng menu của trình duyệt bên dưới.')
      if (!dialog.current?.open) dialog.current?.showModal()
    }
    const finished = () => { prompting.current = false; setBusy(false) }
    try {
      // Gọi ngay trong thao tác bấm để giữ quyền tương tác của trình duyệt.
      void event.prompt().then(() => event.userChoice).catch(failed).finally(finished)
    } catch {
      failed()
      finished()
    }
  }

  return <InstallContext.Provider value={{ installed, busy, install }}>
    {children}
    <dialog ref={dialog} aria-labelledby="mfc-install-title" className="m-auto max-h-[90dvh] w-[calc(100%_-_1.5rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-black/60">
      <div className="flex items-center gap-3 border-b p-4"><Image src={brand?.iconUrl || '/pwa/icon-192.png'} alt="" width={44} height={44} unoptimized className="rounded-xl" /><h2 id="mfc-install-title" className="min-w-0 flex-1 font-bold">Cài ứng dụng {appName}</h2><button type="button" aria-label="Đóng hướng dẫn cài app" onClick={() => dialog.current?.close()} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-slate-100"><X size={20} /></button></div>
      <div className="space-y-4 p-4">
        <p className="text-sm">Thêm {appName} vào màn hình chính để lần sau mở bằng biểu tượng app.</p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {canInstall ? <div className="space-y-3 rounded-xl bg-emerald-50 p-4"><p role="status" className="text-sm text-emerald-900">Trình duyệt đã sẵn sàng. Bấm Cài ngay rồi xác nhận trong hộp cài đặt.</p><button type="button" disabled={busy} onClick={install} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white disabled:opacity-60"><Download size={20} />Cài ngay</button></div> : <>
          {inApp && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Bạn đang mở trong ứng dụng khác. Chọn “Mở bằng trình duyệt” trước; trên iPhone nên mở bằng Safari.</p>}
          {ios ? <ol className="space-y-3 text-sm">
            <li className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"><Share2 className="shrink-0 text-emerald-700" /><span><strong>1. Bấm Chia sẻ</strong><br />Trong Safari, mở menu của trình duyệt rồi chọn biểu tượng Chia sẻ.</span></li>
            <li className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"><PlusSquare className="shrink-0 text-emerald-700" /><span><strong>2. Thêm vào Màn hình chính</strong><br />Cuộn danh sách nếu chưa thấy. Nếu có “Mở dưới dạng ứng dụng web”, hãy bật tùy chọn này.</span></li>
            <li className="flex items-start gap-3 rounded-xl bg-emerald-50 p-3"><Download className="shrink-0 text-emerald-700" /><span><strong>3. Bấm Thêm</strong><br />Giữ tên {appName}. Biểu tượng logo sẽ xuất hiện trên màn hình chính.</span></li>
          </ol> : <div className="space-y-3 text-sm"><p role="status" className="rounded-xl bg-emerald-50 p-3 text-emerald-900">Trình duyệt chưa bật cài trực tiếp. Hãy mở bằng Chrome hoặc Edge và sử dụng trang một lát. Khi có thể cài, nút Cài ngay sẽ hiện tại đây.</p><ol className="list-inside list-decimal space-y-3 rounded-xl bg-slate-50 p-4"><li>Mở menu ⋮ hoặc menu của trình duyệt.</li><li>Chọn <strong>Cài ứng dụng</strong> hoặc <strong>Thêm vào màn hình chính</strong>.</li><li>Xác nhận cài {appName}. Nếu app đã có trên máy, mở bằng biểu tượng trên màn hình chính.</li></ol></div>}
        </>}
        <p className="text-xs text-slate-500">App cần kết nối mạng để xem khóa học, thông báo và dữ liệu mới.</p>
        <button type="button" className="min-h-11 w-full rounded-xl border border-slate-200 px-4 py-2 font-semibold hover:bg-slate-50" onClick={() => dialog.current?.close()}>Đóng hướng dẫn</button>
      </div>
    </dialog>
  </InstallContext.Provider>
}

export function InstallAppButton({ className = '', onBeforeOpen, appName }: { className?: string; onBeforeOpen?: () => void; appName?: string }) {
  const brand = useWi300Brand()
  const { installed, busy, install } = useContext(InstallContext)
  if (installed) return null
  return <button type="button" disabled={busy} aria-busy={busy} className={'inline-flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm disabled:opacity-60 ' + className} onClick={() => { onBeforeOpen?.(); install() }}><Download size={18} className="shrink-0" />{busy ? 'Đang mở cài đặt…' : `Cài ứng dụng ${appName || brand?.name || 'MFC'}`}</button>
}
