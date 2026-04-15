'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { Shield, AlertCircle } from 'lucide-react'
import MainHeader from '@/components/layout/MainHeader'
import { getSiteProfileAdminById, updateSiteProfile } from '@/app/actions/site-profile-actions'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function EditSiteProfilePage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === 'ADMIN'
  const profileId = parseInt(id)
  
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Form state
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [heroImage, setHeroImage] = useState('')
  const [heroOverlay, setHeroOverlay] = useState(0.3)
  const [messageContent, setMessageContent] = useState('')
  const [messageDetail, setMessageDetail] = useState('')
  const [accentColor, setAccentColor] = useState('#f59e0b')
  const [backgroundColor, setBackgroundColor] = useState('')
  const [isActive, setIsActive] = useState(false)
  const [showCommunity, setShowCommunity] = useState(true)
  const [showAllCourses, setShowAllCourses] = useState(true)
  const [coursesTitle, setCoursesTitle] = useState('')
  const [allCoursesTitle, setAllCoursesTitle] = useState('')
  const [communityTitle, setCommunityTitle] = useState('')
  const [metaTitle, setMetaTitle] = useState('')
  const [metaDescription, setMetaDescription] = useState('')
  const [metaImage, setMetaImage] = useState('')
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null)
  const [communityCategoryId, setCommunityCategoryId] = useState<number | null>(null)
  const [greetingMessages, setGreetingMessages] = useState({
    morning: '',
    afternoon: '',
    evening: ''
  })

  // Data for selects
  const [surveys, setSurveys] = useState<any[]>([])
  const [postCategories, setPostCategories] = useState<any[]>([])

  useEffect(() => {
    if (isAdmin) {
      loadProfile()
    } else {
      setLoading(false)
    }
  }, [profileId, isAdmin])

  async function loadProfile() {
    try {
      const data = await getSiteProfileAdminById(profileId)
      if (data) {
        setProfile(data)
        setTitle(data.title || '')
        setSubtitle(data.subtitle || '')
        setHeroImage(data.heroImage || '')
        setHeroOverlay(data.heroOverlay || 0.3)
        setMessageContent(data.messageContent || '')
        setMessageDetail(data.messageDetail || '')
        setAccentColor(data.accentColor || '#f59e0b')
        setBackgroundColor(data.backgroundColor || '')
        setIsActive(data.isActive || false)
        setShowCommunity(data.showCommunity !== false)
        setShowAllCourses(data.showAllCourses !== false)
        setCoursesTitle(data.coursesTitle || '')
        setAllCoursesTitle(data.allCoursesTitle || '')
        setCommunityTitle(data.communityTitle || '')
        setMetaTitle(data.metaTitle || '')
        setMetaDescription(data.metaDescription || '')
        setMetaImage(data.metaImage || '')
        setSelectedSurveyId(data.selectedSurveyId || null)
        setCommunityCategoryId(data.communityCategoryId || null)
        
        // Greeting messages
        const defaultGreetings = {
          morning: 'Chúc ngày mới an vui, giàu toàn diện',
          afternoon: 'Chúc buổi chiều năng lượng, thuận lợi',
          evening: 'Chúc buổi tối hạnh phúc, bình yên'
        }
        const savedGreetings = (data as any).greetingMessages || defaultGreetings
        setGreetingMessages(savedGreetings)
        
        // Load surveys và categories
        loadSelectData()
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    }
    setLoading(false)
  }

  async function loadSelectData() {
    try {
      const [surveysRes, categoriesRes] = await Promise.all([
        fetch('/api/admin/surveys?fields=id,title'),
        fetch('/api/admin/post-categories?fields=id,name')
      ])
      const surveysData = await surveysRes.json()
      const categoriesData = await categoriesRes.json()
      if (surveysData.data) setSurveys(surveysData.data)
      if (categoriesData.data) setPostCategories(categoriesData.data)
    } catch (error) {
      console.error('Error loading select data:', error)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const result = await updateSiteProfile(profileId, {
      title: title || undefined,
      subtitle: subtitle || undefined,
      heroImage: heroImage || undefined,
      heroOverlay: heroOverlay || undefined,
      messageContent: messageContent || undefined,
      messageDetail: messageDetail || undefined,
      accentColor: accentColor || undefined,
      backgroundColor: backgroundColor || undefined,
      isActive,
      showCommunity,
      showAllCourses,
      coursesTitle: coursesTitle || undefined,
      allCoursesTitle: allCoursesTitle || undefined,
      communityTitle: communityTitle || undefined,
      metaTitle: metaTitle || undefined,
      metaDescription: metaDescription || undefined,
      metaImage: metaImage || undefined,
      selectedSurveyId: selectedSurveyId || undefined,
      communityCategoryId: communityCategoryId || undefined,
      greetingMessages: greetingMessages,
    })

    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Đã lưu thay đổi!' })
      setTimeout(() => setMessage(null), 3000)
    }
    setSaving(false)
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MainHeader title="CHỈNH SỬA PROFILE" />
        <div className="p-4 max-w-lg mx-auto">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-amber-800 mb-2">Cần đăng nhập</h2>
            <Link
              href="/login"
              className="inline-block px-6 py-2 bg-amber-500 text-white rounded-xl font-medium hover:bg-amber-600 transition-colors"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50">
        <MainHeader title="CHỈNH SỬA PROFILE" />
        <div className="p-4 max-w-lg mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <Shield className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-red-800 mb-2">Không có quyền truy cập</h2>
            <Link
              href="/tools/site-profiles"
              className="inline-block px-6 py-2 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
            >
              Quay lại
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Đang tải...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Profile không tìm thấy</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <MainHeader title={`CHỈNH SỬA: ${profile.slug}`} />

      <div className="max-w-4xl mx-auto p-6">
        <form onSubmit={handleSubmit} className="space-y-8">
          {message && (
            <div className={`rounded-xl p-4 text-sm ${
              message.type === 'success' 
                ? 'bg-green-500/20 border border-green-500 text-green-500'
                : 'bg-red-500/20 border border-red-500 text-red-500'
            }`}>
              {message.text}
            </div>
          )}

          {/* Basic Info */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">
              Thông tin cơ bản
            </h2>
            
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">Slug</label>
                <input
                  type="text"
                  value={profile.slug}
                  disabled
                  className="w-full bg-gray-100 border border-gray-200 rounded-xl px-4 py-2 text-gray-400 font-mono"
                />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={e => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-gray-800">
                  Kích hoạt
                </label>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">Tiêu đề</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="NGÂN HÀNG PHƯỚC BÁU"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-800"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">Subtitle</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={e => setSubtitle(e.target.value)}
                  placeholder="Tri thức là sức mạnh"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-800"
                />
              </div>
            </div>
          </section>

          {/* Hero Section */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">
              Hero Section
            </h2>
            
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Ảnh nền (URL)</label>
              <input
                type="url"
                value={heroImage}
                onChange={e => setHeroImage(e.target.value)}
                placeholder="https://..."
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-800 font-mono text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">
                Độ mờ overlay: {Math.round(heroOverlay * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={heroOverlay}
                onChange={e => setHeroOverlay(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Thông điệp</label>
              <textarea
                value={messageContent}
                onChange={e => setMessageContent(e.target.value)}
                placeholder="Học hôm nay, thành công ngày mai"
                rows={2}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-800"
              />
            </div>

            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Chi tiết thông điệp</label>
              <textarea
                value={messageDetail}
                onChange={e => setMessageDetail(e.target.value)}
                placeholder="Mô tả chi tiết..."
                rows={3}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-800"
              />
            </div>
          </section>

          {/* Survey Section */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">
              Khảo sát
            </h2>
            
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Chọn khảo sát hiển thị</label>
              <select
                value={selectedSurveyId || ''}
                onChange={e => setSelectedSurveyId(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-800"
              >
                <option value="">Mặc định (hiển thị tất cả)</option>
                {surveys.map(survey => (
                  <option key={survey.id} value={survey.id}>{survey.title}</option>
                ))}
              </select>
            </div>
          </section>

          {/* Greeting Messages Section */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">
              Lời chào mừng (theo thời gian)
            </h2>
            <p className="text-xs text-gray-500">
              Cấu hình lời chào hiển thị trên trang chủ. Để trống để dùng mặc định.
            </p>
            
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Buổi sáng (5h - 12h)</label>
              <input
                type="text"
                value={greetingMessages.morning}
                onChange={e => setGreetingMessages(prev => ({ ...prev, morning: e.target.value }))}
                placeholder="Chúc ngày mới an vui, giàu toàn diện"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-800"
              />
            </div>
            
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Buổi chiều (12h - 18h)</label>
              <input
                type="text"
                value={greetingMessages.afternoon}
                onChange={e => setGreetingMessages(prev => ({ ...prev, afternoon: e.target.value }))}
                placeholder="Chúc buổi chiều năng lượng, thuận lợi"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-800"
              />
            </div>
            
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Buổi tối (18h - 5h)</label>
              <input
                type="text"
                value={greetingMessages.evening}
                onChange={e => setGreetingMessages(prev => ({ ...prev, evening: e.target.value }))}
                placeholder="Chúc buổi tối hạnh phúc, bình yên"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-800"
              />
            </div>
          </section>

          {/* Appearance */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">
              Giao diện
            </h2>
            
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">Màu accent</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    className="w-12 h-10 rounded border border-gray-200"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={e => setAccentColor(e.target.value)}
                    placeholder="#f59e0b"
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-800 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-1">Màu nền</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={backgroundColor || '#ffffff'}
                    onChange={e => setBackgroundColor(e.target.value)}
                    className="w-12 h-10 rounded border border-gray-200"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={e => setBackgroundColor(e.target.value)}
                    placeholder="Để trống = mặc định"
                    className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-800 font-mono"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Content Sections */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">
              Nội dung
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="showCommunity"
                  checked={showCommunity}
                  onChange={e => setShowCommunity(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="showCommunity" className="text-sm font-medium text-gray-800">
                  Hiển thị Bảng tin
                </label>
              </div>
              {showCommunity && (
                <>
                  <input
                    type="text"
                    value={communityTitle}
                    onChange={e => setCommunityTitle(e.target.value)}
                    placeholder="Tiêu đề Bảng tin"
                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-800"
                  />
                  {postCategories.length > 0 && (
                    <div>
                      <label className="block text-xs font-black text-gray-500 uppercase mb-1">Chuyên mục Bản tin</label>
                      <select
                        value={communityCategoryId || ''}
                        onChange={e => setCommunityCategoryId(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-800"
                      >
                        <option value="">Tất cả chuyên mục</option>
                        {postCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="showAllCourses"
                  checked={showAllCourses}
                  onChange={e => setShowAllCourses(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="showAllCourses" className="text-sm font-medium text-gray-800">
                  Hiển thị Tất cả khóa học
                </label>
              </div>
              {showAllCourses && (
                <input
                  type="text"
                  value={allCoursesTitle}
                  onChange={e => setAllCoursesTitle(e.target.value)}
                  placeholder="Tiêu đề phần khóa học"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-800"
                />
              )}
            </div>
          </section>

          {/* SEO */}
          <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2">
              SEO
            </h2>
            
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Meta Title</label>
              <input
                type="text"
                value={metaTitle}
                onChange={e => setMetaTitle(e.target.value)}
                placeholder="Tiêu đề SEO"
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-800"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Meta Description</label>
              <textarea
                value={metaDescription}
                onChange={e => setMetaDescription(e.target.value)}
                placeholder="Mô tả SEO..."
                rows={2}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-800"
              />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase mb-1">Meta Image</label>
              <input
                type="url"
                value={metaImage}
                onChange={e => setMetaImage(e.target.value)}
                placeholder="https://..."
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2 text-gray-800 font-mono text-sm"
              />
            </div>
          </section>

          {/* Actions */}
          <div className="flex gap-4">
            <a
              href={`/${profile.slug}`}
              target="_blank"
              className="flex-1 bg-white border border-gray-200 text-gray-800 py-4 rounded-xl font-black uppercase text-center hover:bg-gray-50 transition-colors"
            >
              Xem trang
            </a>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-orange-500 text-white py-4 rounded-xl font-black uppercase disabled:opacity-50 hover:brightness-110 transition-all"
            >
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
