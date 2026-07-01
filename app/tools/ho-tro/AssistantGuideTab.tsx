'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, AlertTriangle, Check, X } from 'lucide-react'

interface GuideData {
  id: number; pagePath: string; title: string; script: string | null; textContent: string | null; videoUrl: string | null; agentVideoUrl: string | null; isActive: boolean
}

interface GuideForm {
  id?: number; pagePath: string; title: string; script: string; textContent: string; videoUrl: string; agentVideoUrl: string; isActive: boolean
}

const emptyForm: GuideForm = { pagePath: '', title: '', script: '', textContent: '', videoUrl: '', agentVideoUrl: '', isActive: true }

export default function AssistantGuideTab() {
  const [guides, setGuides] = useState<GuideData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [displayMode, setDisplayMode] = useState<'icon' | 'avatar'>('icon')
  const [form, setForm] = useState<GuideForm>(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modeSaving, setModeSaving] = useState(false)

  const loadGuides = async () => {
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/assistant-guide')
      const json = await res.json()
      if (json.success) setGuides(json.data)
      else setError(json.error || 'Lỗi tải dữ liệu')
    } catch { setError('Lỗi kết nối') } finally { setLoading(false) }
  }

  const loadConfig = async () => {
    try {
      const res = await fetch('/api/assistant-guide/config')
      const json = await res.json()
      if (json.success) setDisplayMode(json.data.displayMode)
    } catch {}
  }

  useEffect(() => { loadGuides(); loadConfig() }, [])

  const handleSave = async () => {
    if (!form.pagePath || !form.title) return
    setSaving(true)
    try {
      const res = await fetch('/api/assistant-guide', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const json = await res.json()
      if (json.success) { setShowForm(false); setForm(emptyForm); loadGuides() }
      else setError(json.error || 'Lỗi lưu')
    } catch { setError('Lỗi kết nối') } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa guide này?')) return
    try {
      const res = await fetch(`/api/assistant-guide?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) loadGuides()
      else setError(json.error || 'Lỗi xóa')
    } catch { setError('Lỗi kết nối') }
  }

  const handleEdit = (guide: GuideData) => {
    setForm({ id: guide.id, pagePath: guide.pagePath, title: guide.title, script: guide.script || '', textContent: guide.textContent || '', videoUrl: guide.videoUrl || '', agentVideoUrl: guide.agentVideoUrl || '', isActive: guide.isActive })
    setShowForm(true)
  }

  const handleModeToggle = async (mode: 'icon' | 'avatar') => {
    setModeSaving(true)
    try {
      await fetch('/api/assistant-guide/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayMode: mode }) })
      setDisplayMode(mode)
    } catch {} finally { setModeSaving(false) }
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black uppercase tracking-tight">Trợ lý ảo</h1>
          <p className="text-xs text-gray-400 mt-0.5">Quản lý nội dung hướng dẫn và cấu hình hiển thị</p>
        </div>
        <button onClick={() => { setForm(emptyForm); setShowForm(true) }} className="flex items-center gap-2 px-4 py-2 bg-black text-yellow-400 rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-gray-800 transition-all">
          <Plus className="w-4 h-4" /> Thêm guide
        </button>
      </div>

      {/* Display Mode */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-xs font-black uppercase tracking-wide text-gray-400 mb-4">Chế độ hiển thị header</h2>
        <div className="flex gap-4">
          <button onClick={() => handleModeToggle('icon')} disabled={modeSaving} className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all ${displayMode === 'icon' ? 'border-black bg-gray-50 text-black' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
            {displayMode === 'icon' && <Check className="w-4 h-4" />}
            <span className="text-2xl">❓</span>
            <div className="text-left">
              <div className="text-sm font-bold">Icon ?</div>
              <div className="text-xs opacity-70">Dấu hỏi 3D trong header</div>
            </div>
          </button>
          <button onClick={() => handleModeToggle('avatar')} disabled={modeSaving} className={`flex items-center gap-3 px-5 py-3 rounded-xl border-2 transition-all ${displayMode === 'avatar' ? 'border-black bg-gray-50 text-black' : 'border-gray-200 text-gray-400 hover:border-gray-300'}`}>
            {displayMode === 'avatar' && <Check className="w-4 h-4" />}
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">AI</div>
            <div className="text-left">
              <div className="text-sm font-bold">Avatar video</div>
              <div className="text-xs opacity-70">Video trợ lý dạng tròn</div>
            </div>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 rounded-2xl text-red-600 text-sm font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" /> {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-white w-full max-w-2xl max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white shrink-0">
              <h2 className="font-bold">{form.id ? 'Sửa guide' : 'Thêm guide mới'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-white/20"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Page Path *</label>
                <input value={form.pagePath} onChange={e => setForm({ ...form, pagePath: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="/" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Tiêu đề *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="Chào mừng đến với BRK" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Script (TTS)</label>
                <textarea value={form.script} onChange={e => setForm({ ...form, script: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" rows={3} placeholder="Nội dung Text-to-Speech" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Nội dung text</label>
                <textarea value={form.textContent} onChange={e => setForm({ ...form, textContent: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" rows={5} placeholder="Nội dung hiển thị trong popup" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">Video URL</label>
                  <input value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="https://..." />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">Agent Video URL</label>
                  <input value={form.agentVideoUrl} onChange={e => setForm({ ...form, agentVideoUrl: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="https://..." />
                </div>
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                <span className="text-sm font-medium text-slate-700">Kích hoạt</span>
              </label>
            </div>
            <div className="px-6 py-4 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-200 rounded-lg hover:bg-slate-300">Hủy</button>
              <button onClick={handleSave} disabled={saving || !form.pagePath || !form.title} className="px-4 py-2 text-sm font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2">
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
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase text-gray-400">Page Path</th>
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase text-gray-400">Tiêu đề</th>
                  <th className="px-5 py-3 text-center text-[10px] font-black uppercase text-gray-400">Video</th>
                  <th className="px-5 py-3 text-center text-[10px] font-black uppercase text-gray-400">Kích hoạt</th>
                  <th className="px-5 py-3 text-center text-[10px] font-black uppercase text-gray-400">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {guides.length === 0 ? (
                  <tr><td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-xs font-black">Chưa có guide nào.</td></tr>
                ) : (
                  guides.map(guide => (
                    <tr key={guide.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3"><code className="text-sm font-mono text-violet-600">{guide.pagePath}</code></td>
                      <td className="px-5 py-3"><span className="font-medium">{guide.title}</span></td>
                      <td className="px-5 py-3 text-center">{guide.videoUrl || guide.agentVideoUrl ? <span className="text-xs text-green-500 font-bold">Có</span> : <span className="text-xs text-gray-400">—</span>}</td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${guide.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{guide.isActive ? 'Bật' : 'Tắt'}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => handleEdit(guide)} className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(guide.id)} className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
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
  )
}
