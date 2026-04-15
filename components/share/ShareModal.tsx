'use client'

import React, { useState, useEffect } from 'react'
import { X, Link2, Facebook, MessageCircle, Send, Check } from 'lucide-react'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
  course: {
    id_khoa: string
    name_lop: string
  }
  affiliateCode: string | null
  profileSlug?: string | null
}

export default function ShareModal({ isOpen, onClose, course, affiliateCode, profileSlug = null }: ShareModalProps) {
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
      setCopied(false)
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  if (!mounted || !isOpen) return null

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  
  // Multi-profile support: Ưu tiên profileSlug > course.id_khoa
  // Nếu không có cả 2 thì là trang chủ tổng
  const shareSlug = profileSlug || course.id_khoa
  const shareUrl = shareSlug 
    ? (affiliateCode 
        ? `${baseUrl}/${shareSlug}?ref=${encodeURIComponent(affiliateCode)}`
        : `${baseUrl}/${shareSlug}`)
    : (affiliateCode 
        ? `${baseUrl}/?ref=${encodeURIComponent(affiliateCode)}`
        : baseUrl)

  // Title tùy theo loại share
  const shareTitle = profileSlug || course.id_khoa 
    ? `Khóa học: ${course.name_lop} - Học viện BRK`
    : 'Trang cá nhân - Học viện BRK'
  
  const encodedUrl = encodeURIComponent(shareUrl)
  const encodedTitle = encodeURIComponent(shareTitle)

  const shareLinks = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    zalo: `https://zalo.me/share?url=${encodedUrl}`,
    telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleShare = (url: string) => {
    window.open(url, '_blank', 'width=600,height=400,noopener,noreferrer')
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-brk-surface rounded-3xl shadow-2xl border border-brk-outline overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brk-primary/10 flex items-center justify-center">
                <Share2 className="w-5 h-5 text-brk-primary" />
              </div>
              <div>
                <h3 className="text-lg font-black text-brk-on-surface">
                  {profileSlug || course.id_khoa ? 'Chia sẻ khóa học' : 'Chia sẻ link giới thiệu'}
                </h3>
                <p className="text-xs text-brk-muted">Gửi cho bạn bè để nhận hoa hồng</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-brk-background flex items-center justify-center hover:bg-brk-muted/20 transition-colors"
            >
              <X className="w-4 h-4 text-brk-muted" />
            </button>
          </div>

          <div className="mb-6">
            <p className="text-sm font-medium text-brk-on-surface mb-2">{course.name_lop}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-2.5 bg-brk-background rounded-xl border border-brk-outline text-sm font-mono text-brk-muted truncate">
                {shareUrl}
              </div>
              <button
                onClick={handleCopyLink}
                className={`shrink-0 px-4 py-2.5 rounded-xl font-black text-sm transition-all ${
                  copied 
                    ? 'bg-green-500 text-white' 
                    : 'bg-brk-primary text-brk-on-primary hover:brightness-110'
                }`}
              >
                {copied ? (
                  <span className="flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Đã copy
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Link2 className="w-4 h-4" /> Copy
                  </span>
                )}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleShare(shareLinks.facebook)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-[#1877F2] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Facebook className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-bold text-[#1877F2]">Facebook</span>
            </button>

            <button
              onClick={() => handleShare(shareLinks.zalo)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#0068FF]/10 hover:bg-[#0068FF]/20 transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-[#0068FF] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <MessageCircle className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-bold text-[#0068FF]">Zalo</span>
            </button>

            <button
              onClick={() => handleShare(shareLinks.telegram)}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#26A5E4]/10 hover:bg-[#26A5E4]/20 transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-[#26A5E4] flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <Send className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-bold text-[#26A5E4]">Telegram</span>
            </button>
          </div>

          {!affiliateCode && (
            <p className="mt-4 text-center text-xs text-brk-muted">
              Đăng nhập để có link affiliate riêng của bạn
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function Share2(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}
