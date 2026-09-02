'use client'

import { Plus, Trash2 } from 'lucide-react'
import type { LessonPartDraft, LessonPartType } from '@/lib/course/lesson-parts'

const PART_TYPE_LABELS: Record<LessonPartType, string> = {
    VIDEO: 'Video (YouTube, Vimeo, MP4...)',
    DOCS: 'Tài liệu (Docs)',
    TEXT: 'Văn bản (Text)',
}

interface LessonPartsEditorProps {
    parts: LessonPartDraft[]
    onChange: (parts: LessonPartDraft[]) => void
    extraDescription: string
    onExtraDescriptionChange: (value: string) => void
}

export function LessonPartsEditor({ parts, onChange, extraDescription, onExtraDescriptionChange }: LessonPartsEditorProps) {
    const hasTextPart = parts.some(p => p.type === 'TEXT')

    const updatePart = (index: number, patch: Partial<LessonPartDraft>) => {
        onChange(parts.map((p, i) => (i === index ? { ...p, ...patch } : p)))
    }

    const addPart = () => {
        onChange([...parts, { type: 'VIDEO', title: '', value: '' }])
    }

    const removePart = (index: number) => {
        if (parts.length <= 1) return
        onChange(parts.filter((_, i) => i !== index))
    }

    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase text-gray-400 ml-1">
                    Học phần trong bài ({parts.length})
                </label>
                <button
                    type="button"
                    onClick={addPart}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-bold hover:bg-blue-100 transition-all"
                >
                    <Plus className="w-3 h-3" /> Thêm học phần
                </button>
            </div>

            {parts.length > 1 && (
                <p className="text-[10px] text-gray-400 italic -mt-1 ml-1">
                    Nếu có học phần Văn bản, phần đó luôn hiển thị đầu tiên trong danh sách phát — không phụ thuộc thứ tự sắp xếp ở đây.
                </p>
            )}

            <div className="space-y-2.5">
                {parts.map((part, index) => (
                    <div key={index} className="bg-gray-50 border border-gray-100 rounded-2xl p-3 space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 shrink-0 rounded-lg bg-gray-900 text-yellow-400 text-[10px] font-black flex items-center justify-center">
                                {index + 1}
                            </span>
                            <select
                                value={part.type}
                                onChange={(e) => updatePart(index, { type: e.target.value as LessonPartType })}
                                className="flex-1 min-w-0 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold outline-none"
                            >
                                <option value="VIDEO">{PART_TYPE_LABELS.VIDEO}</option>
                                <option value="DOCS">{PART_TYPE_LABELS.DOCS}</option>
                                <option value="TEXT">{PART_TYPE_LABELS.TEXT}</option>
                            </select>
                            {parts.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removePart(index)}
                                    className="w-7 h-7 shrink-0 rounded-lg bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-100 transition-all"
                                    title="Xóa học phần"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {part.type !== 'TEXT' && (
                            <input
                                type="text"
                                value={part.title}
                                onChange={(e) => updatePart(index, { title: e.target.value })}
                                placeholder={`Tiêu đề học phần (mặc định: Phần ${index + 1})`}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                            />
                        )}

                        {part.type === 'TEXT' ? (
                            <textarea
                                value={part.value}
                                onChange={(e) => updatePart(index, { value: e.target.value })}
                                rows={6}
                                placeholder="Nhập nội dung văn bản..."
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs outline-none resize-y"
                            />
                        ) : (
                            <input
                                type="text"
                                value={part.value}
                                onChange={(e) => updatePart(index, { value: e.target.value })}
                                placeholder={part.type === 'DOCS' ? 'https://docs.google.com/...' : 'https://youtube.com, vimeo.com, fb.com, .mp4...'}
                                className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none"
                            />
                        )}
                    </div>
                ))}
            </div>

            {!hasTextPart && (
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-gray-400 ml-1">Mô tả thêm (hiện dưới video/tài liệu)</label>
                    <textarea
                        value={extraDescription}
                        onChange={(e) => onExtraDescriptionChange(e.target.value)}
                        rows={3}
                        placeholder="Không bắt buộc..."
                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm outline-none resize-y"
                    />
                </div>
            )}
        </div>
    )
}
