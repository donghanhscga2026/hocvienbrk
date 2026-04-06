'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowLeft, Play, Search, Loader2, Copy, Download, FileSpreadsheet, Check, AlertCircle, Info, X, Youtube, Link2 } from 'lucide-react'

interface VideoResult {
  stt: number
  title: string
  videoId: string
  url: string
  duration: string
  durationSeconds: number
  publishedAt: string
}

export default function FetchLinksPage() {
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
      router.push('/login?redirect=/tools/youtube-links')
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-black text-white shadow-lg sticky top-0 z-50">
        <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/tools" className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-white/10 hover:bg-white/20">
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs font-medium">Về trang công cụ</span>
            </Link>
            <h1 className="text-lg font-bold text-red-500">📥 Lấy link video</h1>
          </div>
        </div>
      </header>

      {/* Notice for non-logged in users */}
      {showNotice && !session && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top fade-in">
          <div className="bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-xl flex items-start gap-4 max-w-md">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-sm">💡 Đăng nhập để sử dụng nhiều tính năng hơn!</p>
                <button onClick={() => setShowNotice(false)} className="text-white/70 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-blue-100 text-xs mb-2">Bạn có thể đăng ký/đăng nhập để truy cập Affiliate, Landing Pages và các công cụ khác.</p>
              <div className="flex gap-2">
                <Link href="/login?redirect=/tools/youtube-links" className="bg-white text-blue-600 px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-50">Đăng nhập</Link>
                <Link href="/register?redirect=/tools/youtube-links" className="bg-blue-500 text-white px-3 py-1 rounded-lg text-xs font-bold hover:bg-blue-400">Đăng ký</Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-4">
          {/* Mode Selection */}
          <div className="bg-gray-50 rounded-xl p-3">
            <label className="block text-sm font-medium text-gray-600 mb-2">
              Chế độ lấy link
            </label>
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

          {/* Type Selection */}
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

          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">
              Link YouTube
            </label>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={type === 'playlist' ? 'https://www.youtube.com/playlist?list=...' : 'https://www.youtube.com/@...'}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              required
            />
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Số video tối đa
              </label>
              <input
                type="text"
                value={maxResultsInput}
                onChange={(e) => setMaxResultsInput(e.target.value)}
                placeholder="50"
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Sắp xếp
              </label>
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

          {/* Duration Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Thời lượng từ (phút)
              </label>
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
              <label className="block text-sm font-medium text-gray-600 mb-1">
                đến (phút)
              </label>
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

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Từ ngày
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Đến ngày
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>

          {/* Submit Button */}
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

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">
                Kết quả: {results.length} video
              </h3>
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

        {/* Empty State */}
        {!loading && results.length === 0 && !error && (
          <div className="text-center py-12 text-gray-400">
            <Play className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nhập link YouTube và bấm "Lấy link video"</p>
          </div>
        )}
      </div>
    </div>
  )
}