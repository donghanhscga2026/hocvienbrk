'use client'

import { useState, useEffect } from 'react'
import { normalizeRoles } from '@/lib/auth/roles'
import { Plus, Pencil, Trash2, Loader2, AlertTriangle, Check, X, ListOrdered, ArrowUp, ArrowDown } from 'lucide-react'

interface GuideData {
  id: number; pagePath: string; title: string; script: string | null; textContent: string | null; videoUrl: string | null; agentVideoUrl: string | null; isActive: boolean
  roles: string[]; _count: { steps: number }
}

interface GuideForm {
  id?: number; pagePath: string; title: string; script: string; textContent: string; videoUrl: string; agentVideoUrl: string; isActive: boolean
  roles: string[]
}

const emptyForm: GuideForm = { pagePath: '', title: '', script: '', textContent: '', videoUrl: '', agentVideoUrl: '', isActive: true, roles: [] }

const ROLE_OPTIONS = ['ADMIN', 'TEACHER', 'STUDENT', 'AFFILIATE', 'DEVELOPER']

interface StepData {
  id: number; guideId: number; stepOrder: number; title: string; body: string | null; imageUrl: string | null; videoUrl: string | null; targetSelector: string | null; isActive: boolean
}

interface StepForm {
  id?: number; stepOrder: number; title: string; body: string; imageUrl: string; videoUrl: string; targetSelector: string; isActive: boolean
}

const emptyStepForm: StepForm = { stepOrder: 0, title: '', body: '', imageUrl: '', videoUrl: '', targetSelector: '', isActive: true }

export default function AssistantGuideTab() {
  const [guides, setGuides] = useState<GuideData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [displayMode, setDisplayMode] = useState<'icon' | 'avatar'>('icon')
  const [form, setForm] = useState<GuideForm>(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [modeSaving, setModeSaving] = useState(false)
  const [stepsGuide, setStepsGuide] = useState<GuideData | null>(null)

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
    if (!confirm('Xóa guide này? Toàn bộ các bước bên trong cũng bị xóa theo.')) return
    try {
      const res = await fetch(`/api/assistant-guide?id=${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) loadGuides()
      else setError(json.error || 'Lỗi xóa')
    } catch { setError('Lỗi kết nối') }
  }

  const handleEdit = (guide: GuideData) => {
    setForm({ id: guide.id, pagePath: guide.pagePath, title: guide.title, script: guide.script || '', textContent: guide.textContent || '', videoUrl: guide.videoUrl || '', agentVideoUrl: guide.agentVideoUrl || '', isActive: guide.isActive, roles: normalizeRoles(guide.roles || []) })
    setShowForm(true)
  }

  const toggleRole = (role: string) => {
    setForm(f => ({ ...f, roles: f.roles.includes(role) ? f.roles.filter(r => r !== role) : [...f.roles, role] }))
  }

  const handleModeToggle = async (mode: 'icon' | 'avatar') => {
    setModeSaving(true)
    try {
      await fetch('/api/assistant-guide/config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayMode: mode }) })
      setDisplayMode(mode)
    } catch {} finally { setModeSaving(false) }
  }

  return (
    <div className="max-w-5xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black uppercase tracking-tight">Trợ lý hướng dẫn</h1>
          <p className="text-xs text-gray-400 mt-0.5">Quản lý bài hướng dẫn theo từng trang + từng bước + chế độ "Dẫn tôi làm"</p>
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
                <input value={form.pagePath} onChange={e => setForm({ ...form, pagePath: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="/tools/bank-accounts" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Tiêu đề *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="VD: Thêm tài khoản ngân hàng từng bước" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Vai trò được xem <span className="normal-case font-normal text-slate-400">(bỏ trống = mọi vai trò)</span></label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {ROLE_OPTIONS.map(r => (
                    <button key={r} type="button" onClick={() => toggleRole(r)}
                      className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${form.roles.includes(r) ? 'border-violet-600 bg-violet-50 text-violet-700' : 'border-slate-200 text-slate-400 hover:border-slate-300'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Script (TTS)</label>
                <textarea value={form.script} onChange={e => setForm({ ...form, script: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" rows={3} placeholder="Nội dung Text-to-Speech" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Nội dung text <span className="normal-case font-normal text-slate-400">(hiện khi guide chưa có bước nào)</span></label>
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

      {/* Steps Manager Modal */}
      {stepsGuide && (
        <GuideStepsManager guide={stepsGuide} onClose={() => { setStepsGuide(null); loadGuides() }} />
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
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase text-gray-400">Vai trò</th>
                  <th className="px-5 py-3 text-center text-[10px] font-black uppercase text-gray-400">Bước</th>
                  <th className="px-5 py-3 text-center text-[10px] font-black uppercase text-gray-400">Kích hoạt</th>
                  <th className="px-5 py-3 text-center text-[10px] font-black uppercase text-gray-400">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {guides.length === 0 ? (
                  <tr><td colSpan={6} className="px-5 py-12 text-center text-gray-400 text-xs font-black">Chưa có guide nào.</td></tr>
                ) : (
                  guides.map(guide => (
                    <tr key={guide.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3"><code className="text-sm font-mono text-violet-600">{guide.pagePath}</code></td>
                      <td className="px-5 py-3"><span className="font-medium">{guide.title}</span></td>
                      <td className="px-5 py-3">
                        {(!guide.roles || guide.roles.length === 0)
                          ? <span className="text-xs text-gray-400">Tất cả</span>
                          : <span className="text-xs font-bold text-violet-600">{guide.roles.join(', ')}</span>}
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${guide._count.steps > 0 ? 'bg-violet-50 text-violet-600' : 'bg-gray-100 text-gray-400'}`}>
                          {guide._count.steps} bước
                        </span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${guide.isActive ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{guide.isActive ? 'Bật' : 'Tắt'}</span>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setStepsGuide(guide)} title="Quản lý các bước" className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center hover:bg-violet-100 transition-all"><ListOrdered className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleEdit(guide)} title="Sửa guide" className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDelete(guide.id)} title="Xóa guide" className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
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

function GuideStepsManager({ guide, onClose }: { guide: GuideData; onClose: () => void }) {
  const [steps, setSteps] = useState<StepData[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<StepForm>(emptyStepForm)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/assistant-guide/steps?guideId=${guide.id}&includeInactive=1`)
      const json = await res.json()
      if (json.success) setSteps(json.data)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/assistant-guide/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, guideId: guide.id }),
      })
      const json = await res.json()
      if (json.success) { setShowForm(false); setForm(emptyStepForm); load() }
    } catch {}
    setSaving(false)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa bước này?')) return
    await fetch(`/api/assistant-guide/steps?id=${id}`, { method: 'DELETE' })
    load()
  }

  const handleEdit = (s: StepData) => {
    setForm({ id: s.id, stepOrder: s.stepOrder, title: s.title, body: s.body || '', imageUrl: s.imageUrl || '', videoUrl: s.videoUrl || '', targetSelector: s.targetSelector || '', isActive: s.isActive })
    setShowForm(true)
  }

  const move = async (s: StepData, dir: -1 | 1) => {
    const sorted = [...steps].sort((a, b) => a.stepOrder - b.stepOrder)
    const i = sorted.findIndex(x => x.id === s.id)
    const j = i + dir
    if (j < 0 || j >= sorted.length) return
    const a = sorted[i], b = sorted[j]
    const put = (st: StepData, order: number) =>
      fetch('/api/assistant-guide/steps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: st.id, guideId: guide.id, title: st.title, stepOrder: order }),
      })
    await Promise.all([put(a, b.stepOrder), put(b, a.stepOrder)])
    load()
  }

  const sorted = [...steps].sort((a, b) => a.stepOrder - b.stepOrder)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-3xl max-h-[88vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white shrink-0">
          <div>
            <h2 className="font-bold">Các bước hướng dẫn</h2>
            <p className="text-xs text-white/70">{guide.pagePath} — {guide.title}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <button
            onClick={() => { setForm({ ...emptyStepForm, stepOrder: steps.length }); setShowForm(v => !v) }}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700"
          >
            <Plus className="w-4 h-4" /> Thêm bước
          </button>

          {showForm && (
            <div className="border-2 border-violet-200 rounded-2xl p-5 space-y-4 bg-violet-50/50">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-600 uppercase">Tiêu đề bước *</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="VD: Bước 1: Mở form thêm tài khoản" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">Thứ tự</label>
                  <input type="number" value={form.stepOrder} onChange={e => setForm({ ...form, stepOrder: Number(e.target.value) })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Nội dung</label>
                <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} rows={4} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none" placeholder="Giải thích chi tiết từng thao tác, kể cả thuật ngữ khó..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">Ảnh minh họa (URL)</label>
                  <input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="https://..." />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase">Video (URL / YouTube)</label>
                  <input value={form.videoUrl} onChange={e => setForm({ ...form, videoUrl: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder="https://youtube.com/..." />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 uppercase">Target selector <span className="normal-case font-normal text-slate-400">(cho chế độ "Dẫn tôi làm" — VD: [data-help-id="btn-add"])</span></label>
                <input value={form.targetSelector} onChange={e => setForm({ ...form, targetSelector: e.target.value })} className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500" placeholder='[data-help-id="btn-add"]' />
              </div>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} className="rounded" />
                <span className="text-sm font-medium text-slate-700">Hiển thị bước này</span>
              </label>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowForm(false); setForm(emptyStepForm) }} className="px-4 py-2 text-sm font-bold text-slate-600 bg-slate-200 rounded-lg hover:bg-slate-300">Hủy</button>
                <button onClick={handleSave} disabled={saving || !form.title.trim()} className="px-4 py-2 text-sm font-bold text-white bg-violet-600 rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2">
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {form.id ? 'Cập nhật bước' : 'Thêm bước'}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : sorted.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">Chưa có bước nào. Bấm "Thêm bước" để bắt đầu.</p>
          ) : (
            <div className="space-y-3">
              {sorted.map((s, i) => (
                <div key={s.id} className={`border rounded-2xl p-4 ${s.isActive ? 'border-slate-200 bg-white' : 'border-dashed border-slate-300 bg-slate-50 opacity-60'}`}>
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-violet-600 text-white text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-slate-800">{s.title}</p>
                      {s.body && <p className="text-xs text-slate-500 mt-1 line-clamp-2 whitespace-pre-line">{s.body}</p>}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {s.imageUrl && <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">🖼️ Có ảnh</span>}
                        {s.videoUrl && <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">🎬 Có video</span>}
                        {s.targetSelector && <span className="text-[10px] font-bold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-mono">🎯 {s.targetSelector}</span>}
                        {!s.isActive && <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Đang ẩn</span>}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => move(s, -1)} disabled={i === 0} title="Lên" className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button onClick={() => move(s, 1)} disabled={i === sorted.length - 1} title="Xuống" className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center hover:bg-slate-200 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => handleEdit(s)} title="Sửa" className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(s.id)} title="Xóa" className="w-8 h-8 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t shrink-0 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 text-sm font-bold text-white bg-slate-800 rounded-lg hover:bg-slate-700">Xong</button>
        </div>
      </div>
    </div>
  )
}
