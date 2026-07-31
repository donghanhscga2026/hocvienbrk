'use client'

import React, { useState } from 'react'
import { Link2, Copy, Check, Share2, X } from 'lucide-react'

interface ShareLinkModalProps {
  course: any
  userId: number | null
  isEnrolled: boolean
  onClose: () => void
}

export default function ShareLinkModal({ course, userId, isEnrolled, onClose }: ShareLinkModalProps) {
  const [copied, setCopied] = useState(false)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const shareLink = `${baseUrl}/khoa-hoc/${encodeURIComponent(course.id_khoa)}${userId ? `?ref=${userId}` : ''}`
  const commission = isEnrolled ? '100%' : '50%'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback for older browsers
      const el = document.createElement('textarea')
      el.value = shareLink
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: course.name_lop || course.name_khoa || 'Khóa học',
          text: `Tham gia khóa học cùng tôi!`,
          url: shareLink,
        })
      } catch {}
    }
  }

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          background: '#22242E',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 18px 50px rgba(0,0,0,.5)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(200,107,61,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Link2 size={18} color="var(--accent, #C86B3D)" />
              </div>
              <h3 style={{
                fontFamily: 'Cormorant Garamond, Georgia, serif',
                fontSize: '24px', fontWeight: 700, color: '#F8F1E6', margin: 0,
              }}>
                Link giới thiệu
              </h3>
            </div>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#A8A39C', margin: 0 }}>
              Chia sẻ link này để nhận{' '}
              <strong style={{ color: '#C86B3D' }}>{commission} hoa hồng</strong>{' '}
              khi người được giới thiệu đăng ký thành công.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px', height: '32px', borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#A8A39C', flexShrink: 0, marginLeft: '12px',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Commission badge */}
        <div style={{
          display: 'flex', gap: '12px', marginBottom: '24px',
        }}>
          <div style={{
            flex: 1, padding: '14px', borderRadius: '10px',
            background: isEnrolled ? 'rgba(100, 123, 94, 0.15)' : 'rgba(200,107,61,0.1)',
            border: `1px solid ${isEnrolled ? 'rgba(100,123,94,0.3)' : 'rgba(200,107,61,0.2)'}`,
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: '28px', fontWeight: 700, color: isEnrolled ? '#647B5E' : '#C86B3D', lineHeight: 1 }}>
              {commission}
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#A8A39C', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Hoa hồng của bạn
            </div>
          </div>
          <div style={{
            flex: 1, padding: '14px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', fontWeight: 600, color: '#C8C3BA', lineHeight: 1.4 }}>
              {isEnrolled ? 'Đã kích hoạt ✓' : 'Chưa kích hoạt'}
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#A8A39C', marginTop: '4px' }}>
              {isEnrolled ? 'Hoa hồng tối đa' : 'Kích hoạt để tăng lên 100%'}
            </div>
          </div>
        </div>

        {/* Link box */}
        <div style={{
          background: '#171823',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px',
          padding: '14px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <span style={{
            fontFamily: 'Inter, monospace',
            fontSize: '13px',
            color: '#C8C3BA',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {shareLink}
          </span>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleCopy}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '14px 20px',
              borderRadius: '8px',
              border: 'none',
              background: copied ? '#647B5E' : '#C86B3D',
              color: '#FFF7ED',
              fontFamily: 'Inter, sans-serif',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all .3s ease',
              letterSpacing: '0.02em',
            }}
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            {copied ? 'Đã sao chép!' : 'Sao chép link'}
          </button>

          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <button
              onClick={handleNativeShare}
              style={{
                padding: '14px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent',
                color: '#C8C3BA',
                cursor: 'pointer',
                transition: 'all .3s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontFamily: 'Inter, sans-serif',
                fontSize: '13px',
              }}
            >
              <Share2 size={15} />
              Chia sẻ
            </button>
          )}
        </div>

        {/* Tip */}
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '12px',
          color: '#A8A39C',
          marginTop: '16px',
          textAlign: 'center',
          lineHeight: 1.6,
        }}>
          💡 Link có chứa mã giới thiệu của bạn. Hoa hồng được ghi nhận tự động khi người dùng đăng ký qua link này.
        </p>
      </div>
    </div>
  )
}
