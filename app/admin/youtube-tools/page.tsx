'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Youtube, Link2, RefreshCw, Trash2, Check, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff, Globe, Lock, FileText } from 'lucide-react'

interface YouTubeVideo {
  id: string
  title: string
  description: string
  thumbnail: string
  status: 'public' | 'private' | 'unlisted' | 'draft'
  madeForKids: boolean
}

interface ChannelInfo {
  title: string
  id: string
}

export default function YouTubeToolsPage() {
  const searchParams = useSearchParams()
  const [connected, setConnected] = useState(false)
  const [channel, setChannel] = useState<ChannelInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'private' | 'unlisted'>('all')
  const [publishing, setPublishing] = useState(false)
  const [publishProgress, setPublishProgress] = useState({ current: 0, total: 0 })
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/youtube/status')
      const data = await res.json()
      setConnected(data.connected)
      setChannel(data.channel)
    } catch (err) {
      console.error('Status check failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchVideos = useCallback(async () => {
    if (!connected) return
    setLoading(true)
    try {
      const res = await fetch(`/api/youtube/videos?filter=${filter}`)
      const data = await res.json()
      if (data.videos) {
        setVideos(data.videos)
      }
      if (data.error) {
        setMessage({ type: 'error', text: data.error })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Không thể tải danh sách video' })
    } finally {
      setLoading(false)
    }
  }, [connected, filter])

  useEffect(() => {
    checkStatus()
  }, [checkStatus])

  useEffect(() => {
    if (connected) {
      fetchVideos()
    }
  }, [connected, fetchVideos])

  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    
    if (success === 'connected') {
      setMessage({ type: 'success', text: 'Đã kết nối YouTube thành công!' })
      checkStatus()
    }
    if (error) {
      setMessage({ type: 'error', text: `Lỗi: ${error}` })
    }
  }, [searchParams, checkStatus])

  const handleDisconnect = async () => {
    if (!confirm('Bạn có chắc muốn hủy kết nối YouTube?')) return
    
    try {
      await fetch('/api/youtube/status', { method: 'DELETE' })
      setConnected(false)
      setChannel(null)
      setVideos([])
      setSelectedIds(new Set())
      setMessage({ type: 'success', text: 'Đã hủy kết nối YouTube' })
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi khi hủy kết nối' })
    }
  }

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  const selectAll = () => {
    if (selectedIds.size === videos.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(videos.map(v => v.id)))
    }
  }

  const selectAllNonPublic = () => {
    const nonPublicIds = videos.filter(v => v.status !== 'public').map(v => v.id)
    setSelectedIds(new Set(nonPublicIds))
  }

  const handlePublish = async () => {
    if (selectedIds.size === 0) return
    
    if (!confirm(`Publish ${selectedIds.size} video(s) lên công khai?`)) return

    setPublishing(true)
    setPublishProgress({ current: 0, total: selectedIds.size })
    setMessage(null)

    try {
      const response = await fetch('/api/youtube/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds: Array.from(selectedIds) }),
      })

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) throw new Error('No reader available')

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.status === 'processing' || data.status === 'success' || data.status === 'failed') {
                setPublishProgress({ current: data.current, total: data.total })
              }
              
              if (data.done) {
                if (data.success > 0) {
                  setMessage({
                    type: 'success',
                    text: `Đã publish thành công ${data.success}/${data.total} video!`
                  })
                  setSelectedIds(new Set())
                  fetchVideos()
                }
                if (data.failed > 0) {
                  setMessage({
                    type: 'error',
                    text: `Thất bại: ${data.failed} video. ${data.errors?.[0] || ''}`
                  })
                }
                if (data.error) {
                  setMessage({ type: 'error', text: `Lỗi: ${data.error}` })
                }
              }
            } catch (e) {
              console.error('Parse error:', e)
            }
          }
        }
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Lỗi khi gọi API' })
    } finally {
      setPublishing(false)
      setPublishProgress({ current: 0, total: 0 })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'private':
        return <Lock className="w-4 h-4 text-red-500" />
      case 'unlisted':
        return <Eye className="w-4 h-4 text-yellow-500" />
      case 'public':
        return <Globe className="w-4 h-4 text-green-500" />
      default:
        return <FileText className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'private': return 'Riêng tư'
      case 'unlisted': return 'Không liệt kê'
      case 'public': return 'Công khai'
      default: return status
    }
  }

  if (loading && !connected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-2" />
        <p className="text-xs font-black uppercase">Đang tải...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-32">
      <Link href="/admin" className="inline-flex items-center gap-2 text-xs font-black text-gray-400 uppercase hover:text-red-600 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Admin
      </Link>

      {/* HEADER */}
      <div className="bg-gradient-to-r from-red-600 to-red-700 rounded-[2rem] p-6 text-white">
        <div className="flex items-center gap-3">
          <Youtube className="w-10 h-10" />
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">YouTube Tools</h1>
            <p className="text-red-100 text-sm">Quản lý video hàng loạt</p>
          </div>
        </div>
      </div>

      {/* MESSAGE */}
      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* NOT CONNECTED */}
      {!connected && (
        <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100 text-center">
          <Youtube className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-black text-gray-900 mb-2">Kết nối YouTube</h2>
          <p className="text-gray-500 text-sm mb-6">
            Đăng nhập với tài khoản Google để quản lý video trên kênh của bạn
          </p>
          <a
            href="/api/youtube/auth"
            className="inline-flex items-center gap-2 px-6 py-4 bg-red-600 text-white font-black uppercase tracking-widest rounded-xl hover:bg-red-700 transition-all"
          >
            <Link2 className="w-5 h-5" />
            Kết nối với Google
          </a>
        </div>
      )}

      {/* CONNECTED */}
      {connected && (
        <>
          {/* CHANNEL INFO */}
          <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <Youtube className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 font-bold uppercase">Kênh đã kết nối</p>
                  <p className="font-black text-gray-900">{channel?.title || 'YouTube Channel'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={fetchVideos}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 text-xs font-bold rounded-xl hover:bg-gray-200 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Làm mới
                </button>
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-xl hover:bg-red-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  Hủy kết nối
                </button>
              </div>
            </div>
          </div>

          {/* VIDEO LIST */}
          <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
            {/* FILTER & ACTIONS */}
            <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
              <div className="flex gap-2">
                {(['all', 'private', 'unlisted'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                      filter === f
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f === 'all' ? 'Tất cả' : f === 'private' ? 'Riêng tư' : 'Không liệt kê'}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-4">
                <button
                  onClick={selectAllNonPublic}
                  className="text-xs font-bold text-gray-500 hover:text-red-600"
                >
                  Chọn video cần publish
                </button>
                <button
                  onClick={handlePublish}
                  disabled={selectedIds.size === 0 || publishing}
                  className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white font-bold text-sm rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang publish... ({publishProgress.current}/{publishProgress.total})
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4" />
                      Publish ({selectedIds.size})
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* VIDEO LIST */}
            {loading ? (
              <div className="p-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">Đang tải video...</p>
              </div>
            ) : videos.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-2" />
                <p className="font-bold text-gray-900">Tuyệt vời!</p>
                <p className="text-sm text-gray-500">Không có video nào ở trạng thái này</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className={`p-4 flex items-start gap-4 hover:bg-gray-50 transition-colors ${
                      selectedIds.has(video.id) ? 'bg-red-50' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(video.id)}
                      onChange={() => toggleSelect(video.id)}
                      className="w-5 h-5 mt-1 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    
                    {video.thumbnail && (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        className="w-24 h-[54px] object-cover rounded-lg shrink-0"
                      />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(video.status)}
                        <span className={`text-[10px] font-bold uppercase ${
                          video.status === 'private' ? 'text-red-500' :
                          video.status === 'unlisted' ? 'text-yellow-500' : 'text-green-500'
                        }`}>
                          {getStatusLabel(video.status)}
                        </span>
                        {video.madeForKids && (
                          <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
                            Made for Kids
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-gray-900 text-sm line-clamp-2">{video.title}</p>
                      <p className="text-xs text-gray-400 mt-1">ID: {video.id}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
              <p className="text-xs text-gray-400 font-bold uppercase">Tổng video</p>
              <p className="text-3xl font-black text-gray-900">{videos.length}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-lg border border-gray-100">
              <p className="text-xs text-gray-400 font-bold uppercase">Đã chọn</p>
              <p className="text-3xl font-black text-red-600">{selectedIds.size}</p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}