'use client'

import { useRef, useState } from 'react'
import { Pencil, X, Save, Loader2, Bold, Palette, Type, Smile, Image as ImageIcon } from 'lucide-react'
import {
    formatLessonContent,
    wrapSelection,
    insertAtCursor,
    COLOR_PRESETS,
    SIZE_PRESETS,
    EMOJI_PRESETS,
} from '@/lib/comment-format'

interface LessonContentBoxProps {
    content: string | null
    imageUrl?: string | null
    canEdit: boolean
    /** framed = khung trắng toàn màn hình (bài học TEXT), inline = khối gọn dưới video */
    variant: 'framed' | 'inline'
    onSave: (content: string, imageUrl: string | null) => Promise<{ success: boolean; message?: string }>
}

export default function LessonContentBox({ content, imageUrl, canEdit, variant, onSave }: LessonContentBoxProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [draftContent, setDraftContent] = useState(content || '')
    const [draftImageUrl, setDraftImageUrl] = useState<string | null>(imageUrl || null)
    const [activePopover, setActivePopover] = useState<'color' | 'size' | 'emoji' | null>(null)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [uploadError, setUploadError] = useState('')
    const [saving, setSaving] = useState(false)
    const [saveError, setSaveError] = useState('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const isDirty = draftContent.trim() !== (content || '').trim() || (draftImageUrl || null) !== (imageUrl || null)

    function startEdit() {
        setDraftContent(content || '')
        setDraftImageUrl(imageUrl || null)
        setSaveError('')
        setIsEditing(true)
    }

    function cancelEdit() {
        setIsEditing(false)
        setActivePopover(null)
        setDraftContent(content || '')
        setDraftImageUrl(imageUrl || null)
        setSaveError('')
        setUploadError('')
    }

    function applyFormat(kind: 'bold' | { color: string } | { size: string } | { emoji: string }) {
        const ta = textareaRef.current
        if (!ta) return
        const start = ta.selectionStart ?? draftContent.length
        const end = ta.selectionEnd ?? draftContent.length

        let result
        if (kind === 'bold') {
            result = wrapSelection(draftContent, start, end, '**', '**', 'chữ đậm')
        } else if ('color' in kind) {
            result = wrapSelection(draftContent, start, end, `{{c:${kind.color}}}`, '{{/c}}', 'chữ màu')
        } else if ('size' in kind) {
            result = wrapSelection(draftContent, start, end, `{{s:${kind.size}}}`, '{{/s}}', 'chữ cỡ khác')
        } else {
            result = insertAtCursor(draftContent, start, end, kind.emoji)
        }

        setDraftContent(result.text)
        setActivePopover(null)
        requestAnimationFrame(() => {
            ta.focus()
            ta.setSelectionRange(result.cursorStart, result.cursorEnd)
        })
    }

    async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return

        setUploadError('')
        setUploadingImage(true)
        try {
            const formData = new FormData()
            formData.append('file', file)
            const res = await fetch('/api/upload/lesson', { method: 'POST', body: formData })
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Tải ảnh thất bại')
            setDraftImageUrl(data.url)
        } catch (err: any) {
            setUploadError(err.message || 'Tải ảnh thất bại')
        } finally {
            setUploadingImage(false)
        }
    }

    async function handleSave() {
        setSaving(true)
        setSaveError('')
        try {
            const result = await onSave(draftContent.trim(), draftImageUrl)
            if (result.success) {
                setIsEditing(false)
                setActivePopover(null)
            } else {
                setSaveError(result.message || 'Lưu thất bại. Vui lòng thử lại.')
            }
        } finally {
            setSaving(false)
        }
    }

    const framed = variant === 'framed'

    if (!isEditing) {
        const hasContent = !!(content && content.trim())
        const hasImage = !!imageUrl
        // Khung "inline" (dưới video) chỉ hiện khi có gì để hiện hoặc có quyền sửa —
        // khung "framed" (chiếm trọn khung nội dung bài TEXT) luôn hiện như trước giờ.
        if (!framed && !hasContent && !hasImage && !canEdit) return null

        return (
            <div className={framed
                ? 'absolute inset-0 bg-white overflow-y-auto p-6'
                : 'relative border border-zinc-800 rounded-xl bg-zinc-900/30 p-3'
            }>
                {canEdit && (
                    <button
                        type="button"
                        onClick={startEdit}
                        title="Sửa nội dung"
                        className={framed
                            ? 'absolute top-3 right-3 z-10 w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center shadow-sm transition-colors'
                            : 'absolute top-2 right-2 z-10 w-7 h-7 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors'
                        }
                    >
                        <Pencil className="w-3.5 h-3.5" />
                    </button>
                )}
                {hasContent ? (
                    <div
                        className={framed
                            ? 'text-gray-900 text-base leading-relaxed pr-10'
                            : 'text-zinc-300 text-sm leading-relaxed text-justify pr-8 [&_a]:font-bold'
                        }
                        dangerouslySetInnerHTML={{ __html: formatLessonContent(content || '') }}
                    />
                ) : canEdit ? (
                    <p className={framed ? 'text-gray-400 text-sm italic pr-10' : 'text-zinc-500 text-sm italic pr-8'}>
                        Chưa có nội dung — bấm biểu tượng bút để thêm.
                    </p>
                ) : null}
                {hasImage && (
                    <img
                        src={imageUrl!}
                        alt="Hình ảnh bài học"
                        className={framed
                            ? 'mt-3 max-w-full max-h-[420px] rounded-lg border border-gray-200 object-contain cursor-zoom-in'
                            : 'mt-2 max-w-[200px] max-h-[200px] rounded-lg border border-zinc-800 object-cover cursor-zoom-in'
                        }
                        onClick={() => window.open(imageUrl!, '_blank')}
                    />
                )}
            </div>
        )
    }

    return (
        <div className={framed
            ? 'absolute inset-0 bg-white overflow-y-auto p-4 flex flex-col'
            : 'relative border border-zinc-700 rounded-xl bg-zinc-900 p-3 flex flex-col'
        }>
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={handleImageFileChange}
            />
            <div className="flex items-center justify-between gap-2 mb-2 shrink-0">
                <div className="relative flex items-center gap-1 flex-wrap">
                    <button type="button" onClick={() => applyFormat('bold')} title="In đậm" className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors">
                        <Bold className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setActivePopover(p => p === 'color' ? null : 'color')} title="Màu chữ" className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors">
                        <Palette className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setActivePopover(p => p === 'size' ? null : 'size')} title="Cỡ chữ" className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors">
                        <Type className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => setActivePopover(p => p === 'emoji' ? null : 'emoji')} title="Emoji" className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors">
                        <Smile className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingImage}
                        title="Chèn ảnh"
                        className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center transition-colors disabled:opacity-40"
                    >
                        {uploadingImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    </button>

                    {activePopover === 'color' && (
                        <div className="absolute top-full left-0 mt-1 z-20 flex gap-1.5 p-2 bg-white border border-gray-200 rounded-xl shadow-xl">
                            {COLOR_PRESETS.map(c => (
                                <button
                                    key={c.key}
                                    type="button"
                                    title={c.label}
                                    onClick={() => applyFormat({ color: c.key })}
                                    className="w-6 h-6 rounded-full border border-gray-200 hover:scale-110 transition-transform"
                                    style={{ backgroundColor: c.hex }}
                                />
                            ))}
                        </div>
                    )}
                    {activePopover === 'size' && (
                        <div className="absolute top-full left-9 mt-1 z-20 flex gap-1.5 p-2 bg-white border border-gray-200 rounded-xl shadow-xl">
                            {SIZE_PRESETS.map(s => (
                                <button
                                    key={s.key}
                                    type="button"
                                    onClick={() => applyFormat({ size: s.key })}
                                    className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    )}
                    {activePopover === 'emoji' && (
                        <div className="absolute top-full left-16 mt-1 z-20 grid grid-cols-5 gap-1 p-2 bg-white border border-gray-200 rounded-xl shadow-xl w-[190px]">
                            {EMOJI_PRESETS.map(emoji => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => applyFormat({ emoji })}
                                    className="text-lg hover:bg-gray-100 rounded-lg py-0.5 transition-colors"
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {isDirty && (
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center gap-1 bg-yellow-400 hover:bg-yellow-300 text-black text-xs font-bold px-3 py-1.5 rounded-lg shadow-lg transition-colors disabled:opacity-40"
                        >
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Lưu
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={saving}
                        className={framed
                            ? 'flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors'
                            : 'flex items-center gap-1 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors'
                        }
                    >
                        <X className="w-3.5 h-3.5" /> ĐÓNG
                    </button>
                </div>
            </div>

            {(draftImageUrl || uploadingImage) && (
                <div className={framed
                    ? 'flex items-center gap-2 mb-2 pl-2 pr-2 py-1.5 rounded-xl bg-gray-100 shrink-0'
                    : 'flex items-center gap-2 mb-2 pl-2 pr-2 py-1.5 rounded-xl bg-zinc-800 shrink-0'
                }>
                    {uploadingImage ? (
                        <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                    ) : (
                        <img src={draftImageUrl!} alt="preview" className="w-10 h-10 rounded-lg object-cover" />
                    )}
                    <span className={framed ? 'text-xs text-gray-600 flex-1' : 'text-xs text-zinc-300 flex-1'}>
                        {uploadingImage ? 'Đang tải ảnh...' : 'Đã đính kèm ảnh'}
                    </span>
                    {!uploadingImage && (
                        <button type="button" onClick={() => setDraftImageUrl(null)} className={framed
                            ? 'shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-colors'
                            : 'shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors'
                        }>
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            )}
            {uploadError && <p className="text-[11px] text-red-500 mb-2 shrink-0">{uploadError}</p>}

            <textarea
                ref={textareaRef}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="Nhập nội dung bài học..."
                rows={framed ? 12 : 5}
                className={framed
                    ? 'flex-1 w-full bg-white text-base text-gray-800 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400/50 leading-relaxed'
                    : 'flex-1 w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-white resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400/50 leading-relaxed'
                }
                disabled={saving}
            />
            {saveError && <p className="text-[11px] text-red-500 mt-2 shrink-0">{saveError}</p>}
        </div>
    )
}
