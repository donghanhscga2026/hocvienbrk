'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface EmailConfig {
  emailsBeforePauseMin: number
  emailsBeforePauseMax: number
  pauseDurationMin: number
  pauseDurationMax: number
  interEmailDelayMin: number
  interEmailDelayMax: number
  enableTelegramAlert: boolean
  telegramChatId: string
  enableRandomMessageFooter: boolean
}

export default function EmailSettingsClient() {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const [config, setConfig] = useState<EmailConfig>({
    emailsBeforePauseMin: 30,
    emailsBeforePauseMax: 50,
    pauseDurationMin: 10,
    pauseDurationMax: 30,
    interEmailDelayMin: 2,
    interEmailDelayMax: 8,
    enableTelegramAlert: true,
    telegramChatId: '-1003871041367',
    enableRandomMessageFooter: false
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await fetch('/api/admin/email-config')
      if (res.ok) {
        const data = await res.json()
        setConfig({
          ...data.config,
          enableRandomMessageFooter: data.config.enableRandomMessageFooter || false
        })
      }
    } catch (error) {
      console.error('Error fetching config:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    setToast(null)

    try {
      const res = await fetch('/api/admin/email-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      })

      if (res.ok) {
        setToast({ type: 'success', text: 'Đã lưu cài đặt!' })
        setTimeout(() => setToast(null), 3000)
      } else {
        setToast({ type: 'error', text: 'Lưu thất bại' })
      }
    } catch {
      setToast({ type: 'error', text: 'Đã xảy ra lỗi' })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Đang tải...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-black text-white shadow-lg sticky top-0 z-50">
        <div className="flex items-center justify-between p-3 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs font-medium">Quay ra</span>
            </Link>
            <h1 className="text-lg font-bold text-yellow-400">Email MKT</h1>
          </div>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-yellow-400 hover:bg-yellow-500 text-black font-bold text-sm rounded-lg px-3 py-2"
          >
            {isSaving ? '...' : '💾 Lưu'}
          </Button>
        </div>
        {/* Sub Navigation */}
        <div className="flex gap-1 px-4 pb-3 overflow-x-auto">
          <Link href="/admin/campaigns" className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white/70 hover:bg-white/20">
            📋 Chiến dịch
          </Link>
          <Link href="/admin/email-senders" className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/10 text-white/70 hover:bg-white/20">
            📡 Tài Khoản
          </Link>
          <Link href="/admin/email-settings" className="px-3 py-1.5 rounded-full text-xs font-bold bg-orange-500 text-white">
            ⚙️ Cấu Hình
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {toast && (
          <div className={`mb-4 flex items-center gap-1 p-4 rounded-xl ${
            toast.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-700' 
              : 'bg-red-50 border border-red-200 text-red-700'
          }`}>
            <span className="font-medium">{toast.text}</span>
          </div>
        )}

        {/* Batch Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-2">
          <h2 className="font-bold text-gray-900 mb-4">📤 Batch & Pause</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pause sau (emails)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={20}
                  max={100}
                  value={config.emailsBeforePauseMin}
                  onChange={(e) => setConfig({ ...config, emailsBeforePauseMin: parseInt(e.target.value) || 30 })}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  min={20}
                  max={100}
                  value={config.emailsBeforePauseMax}
                  onChange={(e) => setConfig({ ...config, emailsBeforePauseMax: parseInt(e.target.value) || 50 })}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Thời gian pause (phút)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={config.pauseDurationMin}
                  onChange={(e) => setConfig({ ...config, pauseDurationMin: parseInt(e.target.value) || 10 })}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="number"
                  min={5}
                  max={60}
                  value={config.pauseDurationMax}
                  onChange={(e) => setConfig({ ...config, pauseDurationMax: parseInt(e.target.value) || 30 })}
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Delay Settings */}
        <div className="bg-white rounded-2xl border border-gray-100 p-2">
          <h2 className="font-bold text-gray-900 mb-4">⏱️ Delay giữa emails</h2>
          
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={30}
              value={config.interEmailDelayMin}
              onChange={(e) => setConfig({ ...config, interEmailDelayMin: parseInt(e.target.value) || 2 })}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            />
            <span className="text-gray-400">-</span>
            <input
              type="number"
              min={1}
              max={30}
              value={config.interEmailDelayMax}
              onChange={(e) => setConfig({ ...config, interEmailDelayMax: parseInt(e.target.value) || 8 })}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            />
            <span className="text-gray-500 text-sm">giây</span>
          </div>
        </div>

        {/* Random Footer */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                ✉️ Footer Ngẫu Nhiên
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                Tự động thêm 1 message ngẫu nhiên vào cuối mỗi email
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold ${config.enableRandomMessageFooter ? 'text-green-600' : 'text-gray-400'}`}>
                {config.enableRandomMessageFooter ? 'Có' : 'Không'}
              </span>
              <button
                type="button"
                onClick={() => setConfig({ ...config, enableRandomMessageFooter: !config.enableRandomMessageFooter })}
                className={`relative w-12 h-7 rounded-full transition-colors ${
                  config.enableRandomMessageFooter ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  config.enableRandomMessageFooter ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Telegram */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enableTelegram"
              checked={config.enableTelegramAlert}
              onChange={(e) => setConfig({ ...config, enableTelegramAlert: e.target.checked })}
              className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
            />
            <label htmlFor="enableTelegram" className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Bell className="h-4 w-4" />
              Thông báo Telegram
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
