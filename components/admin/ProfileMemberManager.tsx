'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Trash2, Loader2, Search, User as UserIcon } from 'lucide-react'
import { addProfileMember, removeProfileMember } from '@/app/actions/site-profile-actions'

interface ProfileMember {
  userId: number
  role: string
  user: {
    id: number
    name: string | null
    email: string | null
    image: string | null
  }
}

interface Props {
  profileId: number
  initialMembers: ProfileMember[]
  onUpdate?: () => void
}

export default function ProfileMemberManager({ profileId, initialMembers, onUpdate }: Props) {
  const [members, setMembers] = useState<ProfileMember[]>(initialMembers)

  // Đồng bộ state khi props thay đổi từ cha
  useEffect(() => {
    setMembers(initialMembers)
  }, [initialMembers])

  const [newUserId, setNewUserId] = useState('')
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleAddMember() {
    if (!newUserId) return
    const userId = parseInt(newUserId)
    if (isNaN(userId)) {
      setError('ID người dùng phải là số')
      return
    }

    setAdding(true)
    setError(null)
    try {
      const result = await addProfileMember(profileId, userId)
      if (result.error) {
        setError(result.error)
      } else {
        setNewUserId('')
        // Tạm thời reload hoặc gọi callback
        if (onUpdate) onUpdate()
        // Để UI mượt hơn, chúng ta có thể thêm vào local state nếu action trả về full member info
        // Nhưng hiện tại action chỉ trả về member record (không include user)
        // Nên tốt nhất là load lại toàn bộ profile từ cha
      }
    } catch (err) {
      setError('Lỗi khi kết nối server')
    }
    setAdding(false)
  }

  async function handleRemoveMember(userId: number) {
    if (!confirm('Bạn có chắc chắn muốn xóa cộng sự này?')) return

    setRemoving(userId)
    setError(null)
    try {
      const result = await removeProfileMember(profileId, userId)
      if (result.error) {
        setError(result.error)
      } else {
        setMembers(prev => prev.filter(m => m.userId !== userId))
        if (onUpdate) onUpdate()
      }
    } catch (err) {
      setError('Lỗi khi kết nối server')
    }
    setRemoving(null)
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-2">
        <h2 className="text-lg font-bold text-gray-800">Quản lý Cộng Sự (Associates)</h2>
        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-bold">
          {members.length} thành viên
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-xs p-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Add Member Form */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={newUserId}
            onChange={e => setNewUserId(e.target.value)}
            placeholder="Nhập User ID (ví dụ: 330)"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        </div>
        <button
          onClick={handleAddMember}
          disabled={adding || !newUserId}
          className="bg-orange-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:brightness-110 disabled:opacity-50 transition-all"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Thêm
        </button>
      </div>

      {/* Member List */}
      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
        {members.length === 0 ? (
          <p className="text-center py-6 text-gray-400 text-sm italic">
            Chưa có cộng sự nào tham gia cộng đồng này.
          </p>
        ) : (
          members.map(member => (
            <div 
              key={member.userId} 
              className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group hover:border-orange-200 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden border border-orange-200">
                  {member.user.image ? (
                    <img src={member.user.image} alt={member.user.name || ''} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-5 h-5 text-orange-500" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800">
                    {member.user.name || 'N/A'} 
                    <span className="ml-2 text-[10px] text-gray-400 font-mono">ID: {member.userId}</span>
                  </div>
                  <div className="text-[10px] text-gray-500">{member.user.email || 'No email'}</div>
                </div>
              </div>
              
              <button
                onClick={() => handleRemoveMember(member.userId)}
                disabled={removing === member.userId}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                title="Xóa cộng sự"
              >
                {removing === member.userId ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
              </button>
            </div>
          ))
        )}
      </div>
      
      <p className="text-[10px] text-gray-400 italic">
        * Cộng sự sẽ được hiển thị các khóa học và bài viết của họ trên trang cộng đồng này.
      </p>
    </section>
  )
}
