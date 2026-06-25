'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import MainHeader from '@/components/layout/MainHeader'
import { Role } from '@prisma/client'
import { Plus, Pencil, Trash2, Loader2, AlertTriangle, Check, X } from 'lucide-react'

interface GuideData {
  id: number
  pagePath: string
  title: string
  script: string | null
  textContent: string | null
  videoUrl: string | null
  agentVideoUrl: string | null
  isActive: boolean
}

interface GuideForm {
  id?: number
  pagePath: string
  title: string
  script: string
  textContent: string
  videoUrl: string
  agentVideoUrl: string
  isActive: boolean
}

const emptyForm: GuideForm = {
  pagePath: '',
  title: '',
  script: '',
  textContent: '',
  videoUrl: '',
  agentVideoUrl: '',
  isActive: true,
}

export default function AssistantGuidePage() {
  const { data: session } = useSession()
  const [guides, setGuides] = useState<GuideData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [displayMode, setDisplayMode] = useState<'icon' | 'avatar'>('icon')
  const [form, setForm] = useState<GuideForm>(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modeSaving, setModeSaving] = useState(false)

  const isAdmin = session?.user?.role === Role.ADMIN

  const loadGuides = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/assistant-guide')
      const json = await res.json()
      if (json.success) setGuides(json.data)
      else setError(json.error || 'Lỗi tải dữ liệu')
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/assistant-guide/config')
      const json = await res.json()
      if (json.success) setDisplayMode(json.data.displayMode)
    } catch {}
  }

  useEffect(() => {
    loadGuides()
    loadConfig()
  }, [])

  const handleSave = async () => {
    if (!form.pagePath || !form.title) return
    setSaving(true)
    try {
      const res = await fetch('/api/assistant-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (json.success) {
        setShowForm(false)
        setForm(emptyForm)
        loadGuides()
      } else {
        setError(json.error || 'Lỗi lưu')
      }
    } catch {
      setError('Lỗi kết nối')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa guide này?')) return
    try {
      const res = await fetch(`/api/assistant-guide?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) loadGuides()
      else setError(json.error || 'Lỗi xóa')
    } catch {
      setError('Lỗi kết nối')
    }
  }

  const handleEdit = (guide: GuideData) => {
    setForm({
      id: guide.id,
      pagePath: guide.pagePath,
      title: guide.title,
      script: guide.script || '',
      textContent: guide.textContent || '',
      videoUrl: guide.videoUrl || '',
      agentVideoUrl: guide.agentVideoUrl || '',
      isActive: guide.isActive,
    })
    setShowForm(true)
  }

  const handleModeToggle = async (mode: 'icon' | 'avatar') => {
    setModeSaving(true)
    try {
      await fetch('/api/assistant-guide/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayMode: mode }),
      })
      setDisplayMode(mode)
    } catch {}
    setModeSaving(false)
  }

  if (!isAdmin) {
    return (
      <main>
        <MainHeader title="Không có quyền truy cập" />
        <div className="container mx-auto px-4 py-20 text-center">
          <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-red-600 mb-2">Không có quyền truy cập</h2>
          <p className="text-gray-600">Chỉ ADMIN mới có thể quản lý Trợ lý ảo.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brk-bg text-brk-on-surface">
      <MainHeader title="Trợ lý ảo" />

      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Trợ lý ảo</h1>
            <p className="text-brk-muted mt-1">Quản lý nội dung hướng dẫn và cấu hình hiển thị</p>
          </div>
          <button
            onClick={() => { setForm(emptyForm); setShowForm(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-brk-primary text-brk-on-primary rounded-lg font-bold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Thêm guide
          </button>
        </div>

        {/* Display Mode Config */}
        <div className="bg-brk-surface rounded-2xl border border-brk-outline shadow-sm p-6 mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-brk-muted mb-4">Chế độ hiển thị header</h2>
          <div className="flex gap-4">
            <button
              onClick={() => handleModeToggle('icon')}
              disabled={modeSaving}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all ${
                displayMode === 'icon'
                  ? 'border-brk-primary bg-brk-primary/10 text-brk-primary'
                  : 'border-brk-outline text-brk-muted hover:border-brk-primary/50'
              }`}
            >
              {displayMode === 'icon' && <Check className="w-4 h-4" />}
              <span className="text-2xl">❓</span>
              <div className="text-left">
                <div className="text-sm font-bold">Icon ?</div>
                <div className="text-xs opacity-70">Dấu hỏi 3D trong header</div>
              </div>
            </button>
            <button
              onClick={() => handleModeToggle('avatar')}
              disabled={modeSaving}
              className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all ${
                displayMode === 'avatar'
                  ? 'border-brk-primary bg-brk-primary/10 text-brk-primary'
                  : 'border-brk-outline text-brk-muted hover:border-brk-primary/50'
              }`}
            >
              {displayMode === 'avatar' && <Check className="w-4 h-4" />}
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                AI
              </div>
              <div className="text-left">
                <div className="text-sm font-bold">Avatar video</div>
                <div className="text-xs opacity-70">Video trợ lý dạng tròn</div>
              </div>
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            {error}
            <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Form Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowForm(false)}>
            <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white shrink-0">
                <h2 className="font-bold">{form.id ? 'Sửa guide' : 'Thêm guide mới'}</h2>
                <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-white/20"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">Page Path *</label>
                  <input
                    value={form.pagePath}
                    onChange={e => setForm({ ...form, pagePath: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="/"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">Tiêu đề *</label>
                  <input
                    value={form.title}
                    onChange={e => setForm({ ...form, title: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                    placeholder="Chào mừng đến với BRK"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">Script (TTS)</label>
                  <textarea
                    value={form.script}
                    onChange={e => setForm({ ...form, script: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                    rows={3}
                    placeholder="Nội dung Text-to-Speech"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">Nội dung text</label>
                  <textarea
                    value={form.textContent}
                    onChange={e => setForm({ ...form, textContent: e.target.value })}
                    className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                    rows={5}
                    placeholder="Nội dung hiển thị trong popup"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase">Video URL</label>
                    <input
                      value={form.videoUrl}
                      onChange={e => setForm({ ...form, videoUrl: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-600 uppercase">Agent Video URL</label>
                    <input
                      value={form.agentVideoUrl}
                      onChange={e => setForm({ ...form, agentVideoUrl: e.target.value })}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
                      placeholder="https://..."
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={e => setForm({ ...form, isActive: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm font-medium text-slate-700">Kích hoạt</span>
                </label>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
                <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-200 rounded-lg hover:bg-slate-300">Hủy</button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.pagePath || !form.title}
                  className="px-4 py-2 text-sm font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {form.id ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Guide List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-brk-primary" />
            <span className="ml-3 text-lg text-brk-muted">Đang tải...</span>
          </div>
        ) : (
          <div className="bg-brk-surface rounded-2xl border border-brk-outline shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-brk-bg border-b border-brk-outline">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-bold">Page Path</th>
                    <th className="px-6 py-4 text-left text-sm font-bold">Tiêu đề</th>
                    <th className="px-6 py-4 text-center text-sm font-bold">Video</th>
                    <th className="px-6 py-4 text-center text-sm font-bold">Kích hoạt</th>
                    <th className="px-6 py-4 text-center text-sm font-bold">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {guides.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-brk-muted">Chưa có guide nào.</td>
                    </tr>
                  ) : (
                    guides.map(guide => (
                      <tr key={guide.id} className="border-b border-brk-outline hover:bg-brk-bg/50 transition-colors">
                        <td className="px-6 py-4">
                          <code className="text-sm font-mono text-brk-primary">{guide.pagePath}</code>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-medium">{guide.title}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          {guide.videoUrl || guide.agentVideoUrl ? (
                            <span className="text-xs text-green-500 font-bold">Có</span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                            guide.isActive ? 'bg-green-500/10 text-green-500' : 'bg-slate-500/10 text-slate-500'
                          }`}>
                            {guide.isActive ? 'Bật' : 'Tắt'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button onClick={() => handleEdit(guide)} className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-500 transition-colors" title="Sửa">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(guide.id)} className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors" title="Xóa">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
