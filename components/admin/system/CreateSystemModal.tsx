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
      <DialogContent className="sm:max-w-md bg-brk-surface border-brk-outline text-brk-on-surface">
        <DialogHeader>
          <DialogTitle className="text-brk-on-surface">Tạo Hệ Thống Mới</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-brk-on-surface">Tên hệ thống *</label>
            <input
              type="text"
              value={nameSystem}
              onChange={(e) => setNameSystem(e.target.value)}
              className="w-full px-3 py-2 bg-brk-bg border border-brk-outline text-brk-on-surface rounded-lg focus:outline-none focus:ring-2 focus:ring-brk-primary placeholder-brk-muted"
              placeholder="Ví dụ: Hệ thống mới"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-brk-on-surface">Mã hệ thống (onSystem)</label>
            <input
              type="number"
              value={onSystem}
              onChange={(e) => setOnSystem(e.target.value)}
              className="w-full px-3 py-2 bg-brk-bg border border-brk-outline text-brk-on-surface rounded-lg focus:outline-none focus:ring-2 focus:ring-brk-primary placeholder-brk-muted"
              placeholder="Để trống để tự động sinh"
            />
            <p className="text-xs text-brk-muted mt-1">Nếu để trống, hệ thống sẽ tự động gán mã lớn nhất + 1</p>
          </div>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="border-brk-outline text-brk-on-surface hover:bg-brk-bg"
              onClick={() => { onClose(); setNameSystem(''); setOnSystem(''); setError('') }}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !nameSystem.trim()}
              className="bg-brk-primary text-brk-on-primary hover:opacity-90"
            >
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
