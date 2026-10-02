'use client'

import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { Download, PlusSquare, Share2, X } from 'lucide-react'

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
const InstallContext = createContext<{ installed: boolean; install: () => void }>({ installed: false, install: () => {} })

export default function PwaInstallProvider({ children }: { children: ReactNode }) {
  const pending = useRef<InstallEvent | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const [installed, setInstalled] = useState(false)
  const [ios, setIos] = useState(false)
  const [inApp, setInApp] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const display = window.matchMedia('(display-mode: standalone)')
    const refresh = () => setInstalled(display.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone)
    refresh()
    const ua = navigator.userAgent
    setIos(/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1))
    setInApp(/FBAN|FBAV|Instagram|Zalo|Line\//i.test(ua))
    const beforeInstall = (event: Event) => { event.preventDefault(); pending.current = event as InstallEvent }
    const didInstall = () => { pending.current = null; setInstalled(true); dialog.current?.close() }
    window.addEventListener('beforeinstallprompt', beforeInstall)
    window.addEventListener('appinstalled', didInstall)
    display.addEventListener('change', refresh)
    // Service worker chỉ xử lý màn hình mất mạng; không cache API, tài khoản hay CRM.
    if ('serviceWorker' in navigator && window.isSecureContext && process.env.NODE_ENV === 'production') {
      void navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {})
    }
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall)
      window.removeEventListener('appinstalled', didInstall)
      display.removeEventListener('change', refresh)
    }
  }, [])

  const install = () => {
    if (installed || busy) return
    setError('')
    const event = pending.current
    if (event) {
      pending.current = null
      setBusy(true)
      // Gọi prompt ngay trong thao tác bấm để giữ quyền tương tác của trình duyệt.
      void event.prompt().then(() => event.userChoice).catch(() => {
        setError('Chưa mở được hộp cài đặt. Bạn có thể dùng menu của trình duyệt bên dưới.')
        if (!dialog.current?.open) dialog.current?.showModal()
      }).finally(() => setBusy(false))
    } else if (!dialog.current?.open) dialog.current?.showModal()
  }
  return <InstallContext.Provider value={{ installed, install }}>
    {children}
    <dialog ref={dialog} aria-labelledby="mfc-install-title" className="m-auto max-h-[90dvh] w-[calc(100%_-_1.5rem)] max-w-md overflow-y-auto rounded-2xl bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-black/60">
      <div className="flex items-center gap-3 border-b p-4"><img src="/pwa/icon-192.png" alt="" width={44} height={44} className="rounded-xl" /><h2 id="mfc-install-title" className="min-w-0 flex-1 font-bold">Cài ứng dụng MFC</h2><button type="button" aria-label="Đóng hướng dẫn cài app" onClick={() => dialog.current?.close()} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg hover:bg-slate-100"><X size={20} /></button></div>
      <div className="space-y-4 p-4">
        <p className="text-sm">Thêm MFC vào màn hình chính để lần sau mở bằng biểu tượng app.</p>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {inApp && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Bạn đang mở trong ứng dụng khác. Chọn “Mở bằng trình duyệt” trước; trên iPhone nên mở bằng Safari.</p>}
        {ios ? <ol className="space-y-3 text-sm">
          <li className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"><Share2 className="shrink-0 text-emerald-700" /><span><strong>1. Bấm Chia sẻ</strong><br />Trong Safari, mở menu của trình duyệt rồi chọn biểu tượng Chia sẻ.</span></li>
          <li className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"><PlusSquare className="shrink-0 text-emerald-700" /><span><strong>2. Thêm vào Màn hình chính</strong><br />Cuộn danh sách nếu chưa thấy. Nếu có “Mở dưới dạng ứng dụng web”, hãy bật tùy chọn này.</span></li>
          <li className="flex items-start gap-3 rounded-xl bg-emerald-50 p-3"><Download className="shrink-0 text-emerald-700" /><span><strong>3. Bấm Thêm</strong><br />Giữ tên MFC. Biểu tượng logo sẽ xuất hiện trên màn hình chính.</span></li>
        </ol> : <ol className="list-inside list-decimal space-y-3 rounded-xl bg-slate-50 p-4 text-sm"><li>Mở menu ⋮ hoặc menu của trình duyệt.</li><li>Chọn <strong>Cài ứng dụng</strong> hoặc <strong>Thêm vào màn hình chính</strong>.</li><li>Xác nhận cài MFC. Nếu chưa thấy tùy chọn, mở bằng Chrome hoặc Edge rồi thử lại.</li></ol>}
        <p className="text-xs text-slate-500">App cần kết nối mạng để xem khóa học, thông báo và dữ liệu mới.</p>
        <button type="button" className="min-h-11 w-full rounded-xl bg-emerald-700 px-4 py-2 font-semibold text-white" onClick={() => dialog.current?.close()}>Đã hiểu</button>
      </div>
    </dialog>
  </InstallContext.Provider>
}

export function InstallAppButton({ className = '', onBeforeOpen }: { className?: string; onBeforeOpen?: () => void }) {
  const { installed, install } = useContext(InstallContext)
  if (installed) return null
  return <button type="button" className={'inline-flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm ' + className} onClick={() => { onBeforeOpen?.(); install() }}><Download size={18} className="shrink-0" />Cài ứng dụng MFC</button>
}
