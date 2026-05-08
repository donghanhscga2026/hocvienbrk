'use client'

import { useState, useRef } from 'react'
import { updatePaymentProof } from '@/app/actions/payment-actions'

interface UploadProofModalProps {
    enrollmentId: number
    onClose: () => void
    onSuccess: () => void
}

export default function UploadProofModal({ enrollmentId, onClose, onSuccess }: UploadProofModalProps) {
    const [uploading, setUploading] = useState(false)
    const [preview, setPreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onload = () => setPreview(reader.result as string)
            reader.readAsDataURL(file)
        }
    }

    const handleUpload = async () => {
        const file = fileInputRef.current?.files?.[0]
        if (!file) return

        setUploading(true)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/upload/payment', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                throw new Error('Upload failed')
            }

            const { url } = await response.json()

            const result = await updatePaymentProof(enrollmentId, url)

            if (result.success) {
                onSuccess()
                onClose()
            } else {
                alert('Cập nhật thất bại: ' + result.error)
            }
        } catch (error) {
            console.error('Upload error:', error)
            alert('Upload thất bại. Vui lòng thử lại.')
        } finally {
            setUploading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-brk-surface/60 p-4">
            <div className="bg-brk-surface rounded-2xl p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4 text-brk-on-surface">Upload biên lai chuyển khoản</h3>
                
                <div className="mb-4">
                    <label className="block text-sm font-medium text-brk-muted mb-2">
                        Chọn ảnh biên lai
                    </label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full border border-brk-outline rounded-lg p-2 bg-brk-background"
                    />
                </div>

                {preview && (
                    <div className="mb-4">
                        <p className="text-sm text-brk-muted mb-2">Preview:</p>
                        <div className="relative w-full h-48 border border-brk-outline rounded-lg overflow-hidden">
                            <img src={preview} alt="Preview" className="object-contain w-full h-full" />
                        </div>
                    </div>
                )}

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-brk-outline rounded-lg font-medium hover:bg-brk-background text-brk-on-surface"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!preview || uploading}
                        className="flex-1 px-4 py-2 bg-brk-primary text-brk-on-primary rounded-lg font-medium hover:brightness-110 disabled:opacity-50"
                    >
                        {uploading ? 'Đang tải...' : 'Xác nhận'}
                    </button>
                </div>
            </div>
        </div>
    )
}
