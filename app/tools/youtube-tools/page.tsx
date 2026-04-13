'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Play, Search, Loader2, Copy, Download, FileSpreadsheet, Check, AlertCircle, Info, X, Youtube, Link2, RefreshCw, Trash2, CheckCircle2, Eye, Globe, Lock, FileText } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'

interface VideoResult {
  stt: number
  title: string
  videoId: string
  url: string
  duration: string
  durationSeconds: number
  publishedAt: string
}

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

function FetchLinksTab() {
  const router = useRouter()
  const { data: session } = useSession()
  const [showNotice, setShowNotice] = useState(false)
  const [url, setUrl] = useState('')
  const [type, setType] = useState<'playlist' | 'channel'>('playlist')
  const [mode, setMode] = useState<'public' | 'private'>('public')
  const [ytConnected, setYtConnected] = useState(false)
  const [ytLoading, setYtLoading] = useState(false)
  const [maxResultsInput, setMaxResultsInput] = useState('50')
  const [minDuration, setMinDuration] = useState('')
  const [maxDuration, setMaxDuration] = useState('')
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc'>('date_desc')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<VideoResult[]>([])
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    checkYouTubeConnection()
  }, [session])

  const checkYouTubeConnection = async () => {
    if (!session?.user) return
    try {
      const res = await fetch('/api/youtube/status')
      const data = await res.json()
      setYtConnected(data.connected)
    } catch (err) {
      setYtConnected(false)
    }
  }

  const handleConnectYouTube = async () => {
    if (!session?.user) {
      router.push('/login?redirect=/tools/youtube-tools')
      return
    }
    window.location.href = '/api/youtube/auth'
  }

  const handleModeChange = (newMode: 'public' | 'private') => {
    setMode(newMode)
    if (newMode === 'private' && !ytConnected) {
      handleConnectYouTube()
    }
  }

  const maxResults = parseInt(maxResultsInput) || 50

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResults([])

    try {
      const res = await fetch('/api/admin/youtube/fetch-videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          type,
          mode,
          maxResults,
          minDuration: minDuration ? parseInt(minDuration) : undefined,
          maxDuration: maxDuration ? parseInt(maxDuration) : undefined,
          sortBy,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error?.includes('Chưa kết nối tài khoản YouTube')) {
          setError('Bạn cần kết nối tài khoản YouTube để dùng chế độ Riêng tư. ' + 
            'Vui lòng đăng nhập và kết nối YouTube tại trang YouTube Tools.')
        } else {
          setError(data.error || 'Lỗi không xác định')
        }
        return
      }

      setResults(data.results || [])
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối')
    } finally {
      setLoading(false)
    }
  }

  const copyAllLinks = () => {
    const links = results.map(r => r.url).join('\n')
    navigator.clipboard.writeText(links)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const exportCSV = () => {
    const headers = ['STT', 'Tiêu đề', 'Link', 'Thời lượng', 'Ngày đăng']
    const rows = results.map(r => [r.stt, r.title, r.url, r.duration, r.publishedAt])
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `youtube-videos-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const exportToGoogleSheet = () => {
    const sheetUrl = `https://docs.google.com/spreadsheets/create?usp=sharing&title=YouTube%20Videos%20${new Date().toISOString().split('T')[0]}`
    window.open(sheetUrl, '_blank')
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-4">
        <div className="bg-gray-50 rounded-xl p-3">
          <label className="block text-sm font-medium text-gray-600 mb-2">Chế độ lấy link</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="public"
                checked={mode === 'public'}
                onChange={() => setMode('public')}
                className="w-4 h-4 text-green-500"
              />
              <span className="font-medium text-gray-700">🔓 Công khai</span>
              <span className="text-xs text-gray-400">(Không cần đăng nhập)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="mode"
                value="private"
                checked={mode === 'private'}
                onChange={() => handleModeChange('private')}
                className="w-4 h-4 text-blue-500"
              />
              <span className="font-medium text-gray-700">🔒 Riêng tư</span>
              <span className="text-xs text-gray-400">(Cần kết nối YouTube)</span>
            </label>
          </div>
          {mode === 'private' && !ytConnected && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg flex items-center gap-3">
              <Youtube className="w-5 h-5 text-red-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Cần kết nối tài khoản YouTube</p>
                <button
                  type="button"
                  onClick={handleConnectYouTube}
                  disabled={ytLoading}
                  className="text-xs text-red-600 font-bold hover:underline mt-1"
                >
                  {ytLoading ? 'Đang kết nối...' : 'Click để kết nối ngay'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="type"
              value="playlist"
              checked={type === 'playlist'}
              onChange={() => setType('playlist')}
              className="w-4 h-4 text-red-500"
            />
            <span className="font-medium text-gray-700">Playlist</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="type"
              value="channel"
              checked={type === 'channel'}
              onChange={() => setType('channel')}
              className="w-4 h-4 text-red-500"
            />
            <span className="font-medium text-gray-700">Kênh</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Link YouTube</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={type === 'playlist' ? 'https://www.youtube.com/playlist?list=...' : 'https://www.youtube.com/@...'}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Số video tối đa</label>
            <input
              type="text"
              value={maxResultsInput}
              onChange={(e) => setMaxResultsInput(e.target.value)}
              placeholder="50"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Sắp xếp</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date_desc' | 'date_asc')}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            >
              <option value="date_desc">Mới nhất</option>
              <option value="date_asc">Cũ nhất</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Thời lượng từ (phút)</label>
            <input
              type="number"
              value={minDuration}
              onChange={(e) => setMinDuration(e.target.value)}
              placeholder="0"
              min={0}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">đến (phút)</label>
            <input
              type="number"
              value={maxDuration}
              onChange={(e) => setMaxDuration(e.target.value)}
              placeholder="60"
              min={0}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Từ ngày</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Đến ngày</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !url}
          className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang lấy link...
            </>
          ) : (
            <>
              <Search className="w-5 h-5" />
              Lấy link video
            </>
          )}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900">Kết quả: {results.length} video</h3>
            <div className="flex gap-2">
              <button
                onClick={copyAllLinks}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                Copy All
              </button>
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 rounded-lg text-sm font-medium text-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={exportToGoogleSheet}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 hover:bg-green-200 rounded-lg text-sm font-medium text-green-700 transition-colors"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Sheet
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {results.map((video) => (
              <div
                key={video.videoId}
                className="p-4 border-b border-gray-50 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-red-100 text-red-600 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                    {video.stt}
                  </span>
                  <div className="flex-1 min-w-0">
                    <a
                      href={video.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-gray-900 hover:text-red-600 line-clamp-2"
                    >
                      {video.title}
                    </a>
                    <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                      <span>{video.url}</span>
                      <span>•</span>
                      <span>{video.duration}</span>
                      <span>•</span>
                      <span>{video.publishedAt}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && results.length === 0 && !error && (
        <div className="text-center py-12 text-gray-400">
          <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nhập link YouTube và bấm "Lấy link video"</p>
        </div>
      )}
    </div>
  )
}

function VideoManagerTab() {
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
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${
          message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

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

      {connected && (
        <>
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

          <div className="bg-white rounded-[2rem] shadow-xl border border-gray-100 overflow-hidden">
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

function VideoManagerContent() {
  return <VideoManagerTab />
}

function VideoManagerWithSuspense() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[400px] text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-2" />
        <p className="text-xs font-black uppercase">Đang tải...</p>
      </div>
    }>
      <VideoManagerContent />
    </Suspense>
  )
}

export default function YouTubeToolsPage() {
  const [activeTab, setActiveTab] = useState<'links' | 'manager'>('links')

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <MainHeader title="YOUTUBE TOOLS" toolSlug="youtube-tools" />

      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 mb-6 flex">
          <button
            onClick={() => setActiveTab('links')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'links'
                ? 'bg-red-500 text-white'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            📥 Lấy Link
          </button>
          <button
            onClick={() => setActiveTab('manager')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
              activeTab === 'manager'
                ? 'bg-red-500 text-white'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            🎬 Quản lý Video
          </button>
        </div>

        {activeTab === 'links' ? <FetchLinksTab /> : <VideoManagerWithSuspense />}
      </div>
    </div>
  )
}