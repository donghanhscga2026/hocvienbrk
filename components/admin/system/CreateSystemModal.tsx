'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createSystemAction } from '@/app/actions/system-actions'
import { Loader2 } from 'lucide-react'

interface CreateSystemModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateSystemModal({ isOpen, onClose, onSuccess }: CreateSystemModalProps) {
  const [nameSystem, setNameSystem] = useState('')
  const [onSystem, setOnSystem] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await createSystemAction(
        nameSystem,
        onSystem ? parseInt(onSystem) : undefined
      )

      if (result.error) {
        setError(result.error)
      } else {
        alert(result.message || 'Tạo thành công!')
        setNameSystem('')
        setOnSystem('')
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo Hệ Thống Mới</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Tên hệ thống *</label>
            <input
              type="text"
              value={nameSystem}
              onChange={(e) => setNameSystem(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ví dụ: Hệ thống mới"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Mã hệ thống (onSystem)</label>
            <input
              type="number"
              value={onSystem}
              onChange={(e) => setOnSystem(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Để trống để tự động sinh"
            />
            <p className="text-xs text-gray-500 mt-1">Nếu để trống, hệ thống sẽ tự động gán mã lớn nhất + 1</p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => { onClose(); setNameSystem(''); setOnSystem(''); setError('') }}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={loading || !nameSystem.trim()}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Đang tạo...
                </>
              ) : (
                'Tạo hệ thống'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
