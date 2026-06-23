'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import MainHeader from '@/components/layout/MainHeader'
import { Loader2, Save, Eye, EyeOff, PlayCircle, RefreshCw, Upload } from 'lucide-react'

interface Step {
  id: number
  stepKey: string
  question: string | null
  agentVideoUrl: string | null
  guideVideoUrl: string | null
  guideTitle: string | null
  options: any
  order: number
  isActive: boolean
}

export default function AccountAssistantAdminPage() {
  const { data: session, status } = useSession()
  const [steps, setSteps] = useState<Step[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')

  const isAdmin = session?.user?.role === 'ADMIN'

  const fetchSteps = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/account-assistant-steps')
      const json = await res.json()
      if (json.steps) setSteps(json.steps)
    } catch {
      setMessageType('error')
      setMessage('Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) fetchSteps()
  }, [status, isAdmin])

  const handleSave = async (step: Step) => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/admin/account-assistant-steps', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(step),
      })
      const json = await res.json()
      if (json.success) {
        setMessageType('success')
        setMessage('Đã lưu!')
        setEditId(null)
      } else {
        setMessageType('error')
        setMessage(json.error || 'Lỗi khi lưu')
      }
    } catch {
      setMessageType('error')
      setMessage('Lỗi kết nối')
    } finally {
      setSaving(false)
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MainHeader title="QUẢN LÝ TRỢ LÝ" toolSlug="settings" />
        <div className="p-4 max-w-lg mx-auto text-center pt-12">
          <p className="text-gray-500 text-sm">Bạn không có quyền truy cập trang này.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader title="QUẢN LÝ TRỢ LÝ" toolSlug="account-assistant" />

      <div className="max-w-3xl mx-auto p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Các bước Trợ lý tài khoản</h2>
          <button onClick={fetchSteps} className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {message && (
          <div className={`p-3 rounded-xl text-sm ${messageType === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-4">
            {steps.map(step => (
              <StepCard
                key={step.id}
                step={step}
                isEditing={editId === step.id}
                onEdit={() => setEditId(step.id)}
                onCancel={() => setEditId(null)}
                onSave={(updated) => handleSave(updated)}
                saving={saving}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function StepCard({
  step,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  saving,
}: {
  step: Step
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: (step: Step) => void
  saving: boolean
}) {
  const [form, setForm] = useState({ ...step })
  const [uploadingField, setUploadingField] = useState<'agent' | 'guide' | null>(null)
  const agentFileRef = useRef<HTMLInputElement>(null)
  const guideFileRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (field: 'agent' | 'guide', file: File) => {
    setUploadingField(field)
    const fd = new FormData()
    fd.append('video', file)
    try {
      const res = await fetch('/api/admin/upload-video', { method: 'POST', body: fd })
      const json = await res.json()
      if (json.url) {
        setForm(f => ({ ...f, [field === 'agent' ? 'agentVideoUrl' : 'guideVideoUrl']: json.url }))
      }
    } catch {} finally {
      setUploadingField(null)
    }
  }

  useEffect(() => {
    setForm({ ...step })
  }, [step])

  if (!isEditing) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4" onClick={onEdit}>
        <div className="flex items-start justify-between gap-3 cursor-pointer">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">#{step.order}</span>
              <span className="text-xs font-mono text-violet-600 bg-violet-50 px-2 py-0.5 rounded">{step.stepKey}</span>
              {!step.isActive && <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded">Ẩn</span>}
            </div>
            <p className="text-sm font-semibold text-gray-800 truncate">{step.question || '(Không có câu hỏi)'}</p>
            <div className="flex items-center gap-3 mt-1.5">
              {step.agentVideoUrl && <span className="text-[10px] text-blue-500 flex items-center gap-1"><Eye className="h-3 w-3" /> Video Agent</span>}
              {step.guideVideoUrl && <span className="text-[10px] text-emerald-500 flex items-center gap-1"><PlayCircle className="h-3 w-3" /> Hướng dẫn</span>}
              <span className="text-[10px] text-gray-400">{step.options ? `${JSON.parse(JSON.stringify(step.options)).length || 0} lựa chọn` : '0 lựa chọn'}</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">#{step.order}</span>
          <span className="text-xs font-mono text-violet-600 bg-violet-50 px-2 py-0.5 rounded">{step.stepKey}</span>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Câu hỏi</label>
        <textarea
          value={form.question || ''}
          onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
          rows={2}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Video Agent (MP4/YouTube URL)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.agentVideoUrl || ''}
              onChange={e => setForm(f => ({ ...f, agentVideoUrl: e.target.value }))}
              placeholder="URL video..."
              className="flex-1 min-w-0 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <input
              type="file"
              accept=".mp4,.webm"
              ref={agentFileRef}
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) {
                  handleUpload('agent', file)
                  e.target.value = ''
                }
              }}
            />
            <button
              type="button"
              onClick={() => agentFileRef.current?.click()}
              disabled={uploadingField === 'agent'}
              className="shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 hover:text-violet-600 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {uploadingField === 'agent' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              MP4
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Video Hướng dẫn (MP4/YouTube URL)</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.guideVideoUrl || ''}
              onChange={e => setForm(f => ({ ...f, guideVideoUrl: e.target.value }))}
              placeholder="URL video..."
              className="flex-1 min-w-0 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
            />
            <input
              type="file"
              accept=".mp4,.webm"
              ref={guideFileRef}
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0]
                if (file) {
                  handleUpload('guide', file)
                  e.target.value = ''
                }
              }}
            />
            <button
              type="button"
              onClick={() => guideFileRef.current?.click()}
              disabled={uploadingField === 'guide'}
              className="shrink-0 rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 hover:text-violet-600 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {uploadingField === 'guide' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              MP4
            </button>
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Tiêu đề video hướng dẫn</label>
        <input
          type="text"
          value={form.guideTitle || ''}
          onChange={e => setForm(f => ({ ...f, guideTitle: e.target.value }))}
          placeholder="Hướng dẫn đăng nhập"
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Options (JSON)</label>
        <textarea
          value={typeof form.options === 'string' ? form.options : JSON.stringify(form.options, null, 2)}
          onChange={e => {
            try {
              const parsed = JSON.parse(e.target.value)
              setForm(f => ({ ...f, options: parsed }))
            } catch {
              setForm(f => ({ ...f, options: e.target.value }))
            }
          }}
          rows={3}
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-xs font-mono focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
            className="rounded border-gray-300 text-violet-600 focus:ring-violet-500"
          />
          <span className="text-xs font-medium text-gray-500">Kích hoạt</span>
        </label>
      </div>

      <div className="flex items-center gap-2 justify-end pt-2 border-t border-gray-100">
        <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 transition-colors">
          Hủy
        </button>
        <button
          onClick={() => onSave(form)}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50 flex items-center gap-1"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Lưu
        </button>
      </div>
    </div>
  )
}
