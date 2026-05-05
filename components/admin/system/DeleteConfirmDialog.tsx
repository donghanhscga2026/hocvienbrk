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
import { Loader2, AlertTriangle } from 'lucide-react'
import { deleteSystemTreeAction } from '@/app/actions/system-actions'

interface DeleteConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  system: {
    onSystem: number
    nameSystem: string
    systemCount: number
    closureCount: number
  } | null
  onSuccess: () => void
}

export default function DeleteConfirmDialog({ isOpen, onClose, system, onSuccess }: DeleteConfirmDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    if (!system) return

    setError('')
    setLoading(true)

    try {
      const result = await deleteSystemTreeAction(system.onSystem)

      if (result.error) {
        setError(result.error)
      } else {
        alert(result.message || 'Xóa thành công!')
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setError('')
    onClose()
  }

  if (!system) return null

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md bg-brk-surface border-brk-outline text-brk-on-surface">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            Xác nhận xóa hệ thống
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm font-medium text-red-500 mb-2">
              Bạn đang chuẩn bị xóa hệ thống:
            </p>
            <p className="text-lg font-bold text-red-600">
              {system.nameSystem} (onSystem={system.onSystem})
            </p>
          </div>

          <div className="p-3 bg-brk-bg border border-brk-outline rounded-lg">
            <p className="text-sm text-brk-muted mb-1">Dữ liệu sẽ bị xóa:</p>
            <ul className="text-sm text-brk-on-surface space-y-1">
              <li>• {system.systemCount} nodes trong hệ thống</li>
              <li>• {system.closureCount} closure records</li>
              <li>• 1 bản ghi system tree</li>
            </ul>
          </div>

          <p className="text-sm text-red-500 font-medium italic">
            ⚠️ Hành động này không thể hoàn tác.
          </p>

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-sm">
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="border-brk-outline text-brk-on-surface hover:bg-brk-bg"
            onClick={handleClose}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Đang xóa...
              </>
            ) : (
              'Xác nhận xóa'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
