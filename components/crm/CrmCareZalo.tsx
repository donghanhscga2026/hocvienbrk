'use client'
import { useEffect, useState } from 'react'
import { ArrowRight, MessageCircle, OctagonX, RefreshCw } from 'lucide-react'

type CommandStatus = 'QUEUED' | 'IN_FLIGHT' | 'SENT' | 'FAILED' | 'HELD' | 'CANCELLED'
type PanelData = {
  state: { killSwitch: boolean; lastHeartbeatAt: string | null; bridgeVersion: string | null; online: boolean }
  dailyLimit: number
  sentToday: number
  counts: Record<CommandStatus, number>
  commands: {
    id: number; studentId: number; studentName: string; courseId: number | null; courseName: string | null
    ruleId: string | null; body: string; status: CommandStatus; error: string | null
    createdAt: string; sentAt: string | null
  }[]
  inbounds: {
    id: number; zaloUserId: string; studentId: number | null; studentName: string | null
    courseId: number | null; courseName: string | null; text: string; crmRequestId: string | null; createdAt: string
  }[]
  canControl: boolean
}

const STATUS_LABEL: Record<CommandStatus, string> = {
  QUEUED: 'Đang chờ gửi',
  IN_FLIGHT: 'Bridge đang gửi',
  SENT: 'Đã gửi',
  FAILED: 'Gửi lỗi',
  HELD: 'Đang bị giữ (tắt khẩn cấp)',
  CANCELLED: 'Đã hủy',
}
const STATUS_CLASS: Record<CommandStatus, string> = {
  QUEUED: 'bg-slate-100 text-slate-700',
  IN_FLIGHT: 'bg-sky-100 text-sky-800',
  SENT: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
  HELD: 'bg-amber-100 text-amber-800',
  CANCELLED: 'bg-slate-100 text-slate-400',
}

function formatTime(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }).format(new Date(iso))
}

export default function CrmCareZalo({ revision }: { revision: number }) {
  const [data, setData] = useState<PanelData | null>(null)
  const [error, setError] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    const abort = new AbortController()
    setError('')
    fetch('/api/crm/care-zalo', { cache: 'no-store', signal: abort.signal }).then(async response => {
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Không tải được trạng thái kênh Zalo.')
      if (!abort.signal.aborted) setData(result)
    }).catch(e => { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : 'Không tải được trạng thái kênh Zalo.') })
    return () => abort.abort()
  }, [revision, refresh])

  if (error) return <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}<button className="ml-3 underline" onClick={() => setRefresh(value => value + 1)}>Thử lại</button></div>
  if (!data) return <p role="status" className="p-4 text-sm text-slate-500">Đang tải trạng thái kênh Zalo…</p>

  const toggleKillSwitch = async () => {
    setBusy('kill'); setActionError(''); setNotice('')
    try {
      const response = await fetch('/api/crm/care-zalo', {
        method: 'PATCH', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ killSwitch: !data.state.killSwitch }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || 'Không đổi được công tắc khẩn cấp.')
      setNotice(result.killSwitch
        ? `Đã tắt khẩn cấp toàn kênh — ${result.moved} lệnh đang chờ đã chuyển sang bị giữ.`
        : `Đã mở lại kênh Zalo — ${result.moved} lệnh bị giữ đã quay lại hàng chờ.`)
      setRefresh(value => value + 1)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Không đổi được công tắc khẩn cấp.')
    } finally { setBusy('') }
  }

  const cancelCommand = async (id: number) => {
    setBusy('cancel:' + id); setActionError(''); setNotice('')
    try {
      const response = await fetch('/api/crm/care-zalo/' + id, { method: 'DELETE', cache: 'no-store' })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error || 'Không hủy được lệnh.')
      setNotice('Đã hủy lệnh gửi Zalo #' + id + '.')
      setRefresh(value => value + 1)
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Không hủy được lệnh.')
    } finally { setBusy('') }
  }

  const steps = [
    { title: 'Website (Care Engine)', desc: 'Sinh lệnh gửi từ hàng đợi cần chăm, nhận tin về thành yêu cầu CRM' },
    { title: 'Care Bridge (máy Windows)', desc: 'Tiến trình phụ giữ phiên nick Zalo phụ, lấy lệnh qua API ký HMAC, gửi giãn cách 10–25 giây/tin' },
    { title: 'Nick trợ lý phụ', desc: 'Chỉ nhắn học viên đã ghi danh / đã có hội thoại — không bao giờ dùng nick chính của giảng viên' },
    { title: 'Học viên', desc: 'Nhận nhắc ngay trên Zalo mình dùng mỗi ngày' },
  ]

  return <div className="space-y-5">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs leading-5 text-slate-500">Kênh Zalo không nhúng vào website: một tiến trình phụ riêng (Care Bridge) giữ 1 phiên Zalo của nick trợ lý phụ và trao đổi lệnh với website qua API có ký. Mọi tin học viên nhắn về đều thành yêu cầu hỗ trợ trong CRM.</p>
      <button aria-label="Làm mới trạng thái kênh Zalo" className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border bg-white" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={17} /></button>
    </div>

    <div className="flex flex-wrap items-stretch gap-2">
      {steps.map((step, index) => <div key={step.title} className="flex items-stretch gap-2">
        <div className="min-w-44 flex-1 rounded-xl border border-slate-200 bg-white p-3">
          <p className="text-sm font-semibold text-slate-900">{step.title}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{step.desc}</p>
        </div>
        {index < steps.length - 1 && <ArrowRight size={16} className="self-center shrink-0 text-slate-300" />}
      </div>)}
    </div>

    {actionError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{actionError}</div>}
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}

    <div className="grid items-start gap-4 xl:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Hàng đợi lệnh gửi qua Zalo</h2>
            <span className="text-xs text-slate-400">Chỉ lệnh từ Care Engine mới vào hàng đợi này · trần {data.dailyLimit} lệnh/ngày</span>
          </div>
          <div className="divide-y divide-slate-100">{data.commands.map(command => <article key={command.id} className="space-y-2 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="min-w-0 break-words text-sm text-slate-900">{command.studentName}</strong>
              {command.ruleId && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{command.ruleId}</span>}
              <span className={'rounded-md px-2 py-0.5 text-xs font-semibold ' + STATUS_CLASS[command.status]}>{STATUS_LABEL[command.status]}</span>
              <span className="text-xs text-slate-400">{command.courseName || 'Không gắn khóa'} · Học viên #{command.studentId} · Xếp lúc {formatTime(command.createdAt)}</span>
            </div>
            <p className="line-clamp-2 text-sm leading-6 text-slate-700">“{command.body}”</p>
            {command.error && <p className="text-xs text-red-700">Lỗi: {command.error}</p>}
            {command.sentAt && <p className="text-xs text-slate-400">Đã gửi lúc {formatTime(command.sentAt)}</p>}
            {(command.status === 'QUEUED' || command.status === 'HELD') && <div className="flex justify-end">
              <button disabled={busy !== ''} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-100 disabled:opacity-50" onClick={() => void cancelCommand(command.id)}>Hủy lệnh</button>
            </div>}
          </article>)}{data.commands.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Chưa có lệnh gửi Zalo nào trong phạm vi của bạn. Bấm “Gửi qua Zalo” ở tab Cần chăm hôm nay để xếp lệnh đầu tiên.</p>}</div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
            <h2 className="text-sm font-semibold text-slate-900">Tin Zalo đến → về CRM</h2>
            <span className="text-xs text-slate-400">Tin học viên nhắn vào nick trợ lý tự thành yêu cầu hỗ trợ, giảng viên trả lời ngay trong CRM</span>
          </div>
          <div className="divide-y divide-slate-100">{data.inbounds.map(inbound => <article key={inbound.id} className="space-y-1 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm text-slate-900">{inbound.studentName || 'Chưa khớp học viên'}</strong>
              <span className="rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">Zalo đến · {formatTime(inbound.createdAt)}</span>
              <span className="text-xs text-slate-400">{inbound.courseName || 'Chưa rõ khóa'}{inbound.studentId ? ` · Học viên #${inbound.studentId}` : ' · cần gán tay trong CRM'}</span>
            </div>
            <p className="text-sm leading-6 text-slate-700">“{inbound.text}”</p>
            <p className={'text-xs font-medium ' + (inbound.crmRequestId ? 'text-emerald-700' : 'text-slate-400')}>{inbound.crmRequestId ? 'Đã tạo yêu cầu CRM — xem ở tab Yêu cầu & phản hồi' : 'Chưa tạo yêu cầu'}</p>
          </article>)}{data.inbounds.length === 0 && <p className="p-8 text-center text-sm text-slate-500">Chưa có tin Zalo đến nào. Khi Care Bridge chạy và học viên nhắn vào nick trợ lý, tin sẽ hiện ở đây.</p>}</div>
        </section>
      </div>

      <div className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><MessageCircle size={16} /> Trạng thái Care Bridge</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Kết nối</dt><dd className={'font-semibold ' + (data.state.online ? 'text-emerald-700' : 'text-slate-400')}>{data.state.online ? '● Đang trực tuyến' : '● Chưa thấy nhịp tim'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Nhịp tim gần nhất</dt><dd className="font-medium text-slate-800">{formatTime(data.state.lastHeartbeatAt)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Phiên bản bridge</dt><dd className="font-medium text-slate-800">{data.state.bridgeVersion || '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Đã gửi hôm nay</dt><dd className="font-medium text-slate-800">{data.sentToday} / {data.dailyLimit} tin</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Đang chờ / đang giữ</dt><dd className="font-medium text-slate-800">{data.counts.QUEUED} chờ · {data.counts.HELD} giữ</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-slate-500">Gửi lỗi / đã hủy</dt><dd className="font-medium text-slate-800">{data.counts.FAILED} lỗi · {data.counts.CANCELLED} hủy</dd></div>
          </dl>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold text-red-700"><OctagonX size={16} /> Tắt khẩn cấp toàn kênh</span>
            <button
              type="button" role="switch" aria-checked={data.state.killSwitch} aria-label="Tắt khẩn cấp toàn kênh Zalo"
              disabled={!data.canControl || busy !== ''}
              onClick={() => void toggleKillSwitch()}
              className={(data.state.killSwitch ? 'bg-red-600 ' : 'bg-slate-300 ') + 'relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-50'}
            >
              <span className={(data.state.killSwitch ? 'translate-x-5 ' : 'translate-x-0.5 ') + 'block h-6 w-6 rounded-full bg-white shadow transition-transform'} />
            </button>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {data.canControl
              ? 'Bật tắt khẩn cấp: mọi lệnh chờ bị giữ lại, bridge không lấy được lệnh nào. Tắt đi thì lệnh bị giữ quay lại hàng chờ.'
              : 'Chỉ quản trị viên mới bật/tắt được công tắc này.'}
            {' '}Nick chính của giảng viên không bao giờ nối vào hệ này — chỉ nick trợ lý phụ.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Rào chắn kênh Zalo</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs leading-5 text-slate-600">
            <li>Chỉ gửi cho học viên đã ghi danh hoặc đã có hội thoại — không gửi lạnh cho người lạ.</li>
            <li>Giãn cách 10–25 giây/tin, tối đa 20 tin/phút, không gửi trong khung 21:30–07:00.</li>
            <li>Trần 1 nhắc chăm sóc/ngày/học viên tính liên kênh (app + Zalo), tôn trọng trạng thái đang có người thật xử lý.</li>
            <li>Bridge gặp sự cố → bật tắt khẩn cấp ở panel này, hàng đợi giữ nguyên chờ mở lại.</li>
          </ul>
        </section>
      </div>
    </div>
  </div>
}
