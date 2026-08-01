'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Image from 'next/image'
import { X, CheckCircle2, ExternalLink, Loader2, Coins } from 'lucide-react'
import { useSession } from 'next-auth/react'
import AccountAssistantModal from '@/components/auth/AccountAssistantModal'
import { enrollInCourseAction, checkEnrollmentStatusAction, getBrkMbvBalanceAction } from '@/app/actions/course-actions'
import { resolveBankBin } from '@/lib/bank-bin'
import { getClientRef } from '@/lib/affiliate/get-client-ref'

type FlowStep = 'auth' | 'voucher_confirm' | 'payment' | 'thankyou'

interface RegistrationFlowModalProps {
  course: any
  session: any
  userPhone: string | null
  userId: number | null
  initialEnrollment?: any
  onClose: () => void
  onEnrolled?: (enrollment: any) => void
}

export default function RegistrationFlowModal({
  course,
  session,
  userPhone,
  userId,
  initialEnrollment,
  onClose,
  onEnrolled,
}: RegistrationFlowModalProps) {
  const { data: liveSession } = useSession()

  // Determine initial step
  const getInitialStep = (): FlowStep => {
    if (!session && !liveSession) return 'auth'
    if (initialEnrollment?.status === 'ACTIVE') return 'thankyou'
    return 'voucher_confirm'
  }

  const [step, setStep] = useState<FlowStep>(getInitialStep)
  const [enrollment, setEnrollment] = useState<any>(initialEnrollment || null)
  const [enrolling, setEnrolling] = useState(false)
  const [enrollError, setEnrollError] = useState<string | null>(null)
  const [showFullQR, setShowFullQR] = useState(false)
  const [pollingActive, setPollingActive] = useState(false)
  const [hasActivated, setHasActivated] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  // ── Voucher configurations ────────────────────────────────────────────────
  const [voucherBalance, setVoucherBalance] = useState<number>(0)
  const [loadingVoucher, setLoadingVoucher] = useState<boolean>(false)
  const [useVoucher, setUseVoucher] = useState<boolean>(false)
  const [voucherAmountToUse, setVoucherAmountToUse] = useState<number>(0)

  // Effective session = server-passed OR live from hook
  const effectiveSession = session || liveSession
  const effectiveUserId = effectiveSession?.user?.id ? parseInt(effectiveSession.user.id as string) : userId

  // Watch: when liveSession appears (user just logged in), advance to voucher_confirm
  useEffect(() => {
    if (step === 'auth' && liveSession?.user) {
      setStep('voucher_confirm')
    }
  }, [liveSession, step])

  useEffect(() => {
    if (step === 'voucher_confirm' && effectiveSession && course.voucherConfig === 'WALLET') {
      setLoadingVoucher(true)
      getBrkMbvBalanceAction().then((bal) => {
        setVoucherBalance(bal)
        // Default check if they have balance
        if (bal > 0) {
          setUseVoucher(true)
          setVoucherAmountToUse(Math.min(bal, course.phi_coc || 0))
        }
        setLoadingVoucher(false)
      }).catch(() => setLoadingVoucher(false))
    }
  }, [step, effectiveSession, course.phi_coc, course.voucherConfig])

  // ──────────────────────────────────────────────────────────────────────────
  // Enroll & get payment QR
  // ──────────────────────────────────────────────────────────────────────────
  const doEnroll = useCallback(async () => {
    if ((enrollment && enrollment.status === 'ACTIVE') || enrolling) return
    setEnrolling(true)
    setEnrollError(null)
    try {
      const res: any = await enrollInCourseAction(
        course.id,
        getClientRef(),
        useVoucher,
        voucherAmountToUse
      )
      if (res.success) {
        setEnrollment(res.enrollment)
        if (onEnrolled) onEnrolled(res.enrollment)

        // Calculate final effective amount that client expected
        const finalDue = Math.max(0, (course.phi_coc || 0) - (useVoucher ? voucherAmountToUse : 0))

        if (finalDue === 0) {
          setStep('thankyou')
        } else {
          setStep('payment')
          setPollingActive(true)
        }
      } else {
        setEnrollError(res.message || 'Có lỗi xảy ra khi đăng ký')
      }
    } catch (err: any) {
      setEnrollError(err.message || 'Có lỗi xảy ra khi đăng ký')
    } finally {
      setEnrolling(false)
    }
  }, [enrollment, enrolling, course.id, course.phi_coc, useVoucher, voucherAmountToUse, onEnrolled])

  // Poll every 10s for payment verification (only when active)
  useEffect(() => {
    if (!pollingActive || hasActivated) return

    pollingRef.current = setInterval(async () => {
      try {
        const res = await checkEnrollmentStatusAction(course.id)
        if (res.status === 'ACTIVE') {
          setHasActivated(true)
          setPollingActive(false)
          setEnrollment((prev: any) => ({ ...(prev || {}), status: 'ACTIVE' }))
          if (onEnrolled) onEnrolled({ status: 'ACTIVE' })
          setStep('thankyou')
        }
      } catch {}
    }, 10_000)

    // Stop after 30 minutes
    const timeout = setTimeout(() => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }, 30 * 60 * 1000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      clearTimeout(timeout)
    }
  }, [pollingActive, hasActivated, course.id, onEnrolled])

  // ──────────────────────────────────────────────────────────────────────────
  // QR data
  // ──────────────────────────────────────────────────────────────────────────
  const payment = enrollment?.payment
  const finalPaidWithVoucher = useVoucher ? Math.min(voucherBalance, voucherAmountToUse, course.phi_coc || 0) : 0
  const effectiveAmount = payment?.amount ?? Math.max(0, (course.phi_coc || 0) - finalPaidWithVoucher)
  const cleanPhone = userPhone ? userPhone.replace(/\D/g, '').slice(-6) : ''
  const effectiveContent = payment?.transferContent || `SDT ${cleanPhone} HV ${effectiveUserId} COC ${course.id_khoa}`.toUpperCase().slice(0, 50)
  const bankAcc = course.teacherBankAccount
  const bankId = bankAcc ? resolveBankBin(bankAcc.bankName) : ''
  const qrCodeUrl = payment?.qrCodeUrl
    || (bankAcc ? `https://img.vietqr.io/image/${bankId}-${bankAcc.accountNumber}-qr_only.png?amount=${effectiveAmount}&addInfo=${encodeURIComponent(effectiveContent)}&accountName=${encodeURIComponent(bankAcc.accountHolder || '')}` : '')

  // ──────────────────────────────────────────────────────────────────────────
  // Backdrop close
  // ──────────────────────────────────────────────────────────────────────────
  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose()
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)' }}
      onClick={handleBackdrop}
    >
      {/* ── STEP: auth ─────────────────────────────────────────────────────── */}
      {step === 'auth' && (
        <div onClick={e => e.stopPropagation()}>
          <AccountAssistantModal
            onClose={onClose}
          />
        </div>
      )}

      {/* ── STEP: voucher_confirm ──────────────────────────────────────────── */}
      {step === 'voucher_confirm' && (
        <div
          style={{
            background: '#22242E',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            boxShadow: '0 18px 50px rgba(0,0,0,.5)',
            overflow: 'hidden',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 28px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div>
              <h3 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '22px', fontWeight: 700, color: '#F8F1E6', margin: 0 }}>
                Xác nhận đăng ký khóa học
              </h3>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#A8A39C', margin: '4px 0 0' }}>
                {course.name_lop || course.name_khoa}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#A8A39C',
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: '28px' }}>
            {loadingVoucher ? (
              <div style={{ padding: '40px', textAlign: 'center' }}>
                <Loader2 size={32} color="#C86B3D" className="animate-spin mx-auto mb-2" />
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#A8A39C' }}>Đang tải số dư ví MBV...</p>
              </div>
            ) : (
              <>
                {/* Course fee summary */}
                <div style={{
                  background: '#171823',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#C8C3BA' }}>Phí cọc cam kết:</span>
                  <span style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '26px', fontWeight: 700, color: '#F8F1E6' }}>
                    {(course.phi_coc || 0).toLocaleString('vi-VN')} VND
                  </span>
                </div>

                {/* Voucher select box */}
                {course.voucherConfig === 'WALLET' && (
                  <div style={{
                    background: 'rgba(200, 107, 61, 0.04)',
                    border: '1px solid rgba(200, 107, 61, 0.15)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '28px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                      <input
                        type="checkbox"
                        id="useVoucherCheckbox"
                        checked={useVoucher}
                        onChange={(e) => {
                          const active = e.target.checked
                          setUseVoucher(active)
                          if (active) {
                            setVoucherAmountToUse(Math.min(voucherBalance, course.phi_coc || 0))
                          } else {
                            setVoucherAmountToUse(0)
                          }
                        }}
                        disabled={voucherBalance === 0}
                        style={{ width: '18px', height: '18px', cursor: voucherBalance > 0 ? 'pointer' : 'not-allowed' }}
                      />
                      <label
                        htmlFor="useVoucherCheckbox"
                        style={{
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: voucherBalance > 0 ? '#F8F1E6' : '#A8A39C',
                          cursor: voucherBalance > 0 ? 'pointer' : 'not-allowed',
                        }}
                      >
                        Áp dụng ví MBV để giảm học phí
                      </label>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#C8C3BA', marginBottom: useVoucher ? '18px' : '0' }}>
                      <Coins size={14} color="#C86B3D" />
                      <span>Số dư ví MBV khả dụng: <strong>{voucherBalance.toLocaleString('vi-VN')} VND</strong></span>
                    </div>

                    {useVoucher && (
                      <div style={{ borderTop: '1px solid rgba(200, 107, 61, 0.1)', paddingTop: '16px' }}>
                        <label style={{ display: 'block', fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#A8A39C', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Nhập số tiền muốn trừ từ ví MBV:
                        </label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <input
                            type="number"
                            value={voucherAmountToUse || ''}
                            onChange={(e) => {
                              const val = Math.max(0, parseInt(e.target.value) || 0)
                              const maxAllowed = Math.min(voucherBalance, course.phi_coc || 0)
                              setVoucherAmountToUse(Math.min(val, maxAllowed))
                            }}
                            style={{
                              flex: 1,
                              background: '#171823',
                              border: '1px solid rgba(255,255,255,0.08)',
                              borderRadius: '8px',
                              color: '#F8F1E6',
                              padding: '10px 14px',
                              fontSize: '14px',
                              fontWeight: 700,
                              fontFamily: 'Inter, sans-serif',
                              outline: 'none',
                            }}
                          />
                          <span style={{ fontSize: '14px', color: '#C8C3BA', fontWeight: 600 }}>VND</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Final calculation preview */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '28px', fontSize: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#A8A39C' }}>
                    <span>Học phí cọc gốc:</span>
                    <span>{(course.phi_coc || 0).toLocaleString('vi-VN')} VND</span>
                  </div>
                  {course.voucherConfig === 'WALLET' && useVoucher && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#647B5E', fontWeight: 500 }}>
                      <span>Khấu trừ từ ví MBV:</span>
                      <span>-{voucherAmountToUse.toLocaleString('vi-VN')} VND</span>
                    </div>
                  )}
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 700 }}>
                    <span style={{ color: '#F8F1E6' }}>Thanh toán thực tế cần chuyển:</span>
                    <span style={{ color: '#C86B3D' }}>
                      {Math.max(0, (course.phi_coc || 0) - (useVoucher ? voucherAmountToUse : 0)).toLocaleString('vi-VN')} VND
                    </span>
                  </div>
                </div>

                {/* Confirm button */}
                <button
                  onClick={doEnroll}
                  disabled={enrolling}
                  style={{
                    width: '100%',
                    background: 'var(--accent, #C86B3D)',
                    color: '#FFF7ED',
                    fontFamily: 'Inter, sans-serif',
                    fontSize: '16px',
                    fontWeight: 700,
                    padding: '16px 28px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all .2s ease',
                    boxShadow: '0 12px 30px rgba(200, 107, 61, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                  }}
                  onMouseEnter={e => {
                    if (!enrolling) e.currentTarget.style.background = 'var(--accent-hover, #D97949)'
                  }}
                  onMouseLeave={e => {
                    if (!enrolling) e.currentTarget.style.background = 'var(--accent, #C86B3D)'
                  }}
                >
                  {enrolling ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Đang xử lý đăng ký...
                    </>
                  ) : (
                    'Xác nhận & Tiến hành thanh toán'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── STEP: payment ──────────────────────────────────────────────────── */}
      {step === 'payment' && (
        <div
          style={{
            background: '#22242E',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 18px 50px rgba(0,0,0,.5)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 28px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div>
              <h3 style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '22px', fontWeight: 700, color: '#F8F1E6', margin: 0 }}>
                Kích hoạt khóa học
              </h3>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#A8A39C', margin: '4px 0 0' }}>
                {course.name_lop || course.name_khoa}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                width: '32px', height: '32px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'transparent', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#A8A39C',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Enrolling state */}
          {enrolling && (
            <div style={{ padding: '60px 28px', textAlign: 'center' }}>
              <Loader2 size={40} color="#C86B3D" className="animate-spin mx-auto mb-4" />
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#C8C3BA' }}>
                Đang tạo thông tin đăng ký...
              </p>
            </div>
          )}

          {/* Error */}
          {enrollError && !enrolling && (
            <div style={{ padding: '28px', textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚠️</div>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: '#F87171', marginBottom: '20px' }}>
                {enrollError}
              </p>
              <button
                onClick={doEnroll}
                style={{
                  background: '#C86B3D', color: '#FFF7ED',
                  fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 700,
                  padding: '12px 28px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                }}
              >
                Thử lại
              </button>
            </div>
          )}

          {/* QR Payment */}
          {!enrolling && !enrollError && enrollment && (
            <div style={{ padding: '28px' }}>
              {/* Polling indicator */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 16px', borderRadius: '8px',
                background: 'rgba(200,107,61,0.08)',
                border: '1px solid rgba(200,107,61,0.2)',
                marginBottom: '24px',
              }}>
                <div style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: '#C86B3D',
                  animation: 'pulse 2s infinite',
                }} />
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#C86B3D', margin: 0, fontWeight: 500 }}>
                  Hệ thống đang theo dõi thanh toán — tự động kích hoạt sau khi xác nhận
                </p>
              </div>

              {/* Amount */}
              <div style={{
                textAlign: 'center', marginBottom: '24px',
                padding: '20px', borderRadius: '12px',
                background: '#171823', border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '12px', color: '#A8A39C', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  Số tiền cần chuyển thực tế
                </div>
                <div style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', fontSize: '44px', fontWeight: 700, color: '#C86B3D', lineHeight: 1 }}>
                  {effectiveAmount.toLocaleString('vi-VN')}
                </div>
                <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', color: '#C8C3BA', marginTop: '4px' }}>VNĐ</div>
                {finalPaidWithVoucher > 0 && (
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#647B5E', fontWeight: 'bold', marginTop: '6px' }}>
                    * Đã giảm trừ {finalPaidWithVoucher.toLocaleString('vi-VN')} VND bằng ví MBV
                  </div>
                )}
              </div>

              {/* Grid: QR + bank info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                {/* QR */}
                {qrCodeUrl && (
                  <div style={{ textAlign: 'center' }}>
                    <div
                      onClick={() => setShowFullQR(true)}
                      style={{
                        background: 'white', padding: '12px', borderRadius: '12px',
                        cursor: 'zoom-in', display: 'inline-block',
                        boxShadow: '0 12px 30px rgba(0,0,0,.25)',
                      }}
                    >
                      <Image
                        src={qrCodeUrl}
                        alt="QR Code thanh toán"
                        width={160} height={160}
                        style={{ display: 'block' }}
                      />
                    </div>
                    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', color: '#A8A39C', marginTop: '8px' }}>
                      Nhấn để phóng to
                    </p>
                  </div>
                )}

                {/* Bank Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', justifyContent: 'center' }}>
                  {[
                    { label: 'Ngân hàng', value: payment?.bankName || bankAcc?.bankName || 'N/A' },
                    { label: 'Số tài khoản', value: payment?.accountNumber || bankAcc?.accountNumber || 'N/A' },
                    { label: 'Chủ tài khoản', value: bankAcc?.accountHolder || 'N/A' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: '#A8A39C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '2px' }}>
                        {label}
                      </div>
                      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 600, color: '#F8F1E6' }}>
                        {value}
                      </div>
                    </div>
                  ))}

                  {/* Transfer content */}
                  <div>
                    <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '11px', fontWeight: 700, color: '#A8A39C', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>
                      Nội dung chuyển khoản
                    </div>
                    <div style={{
                      fontFamily: 'Inter, monospace',
                      fontSize: '12px', fontWeight: 700, color: '#C86B3D',
                      background: 'rgba(200,107,61,0.1)',
                      border: '1px solid rgba(200,107,61,0.25)',
                      padding: '6px 10px', borderRadius: '6px',
                      wordBreak: 'break-all',
                    }}>
                      {effectiveContent}
                    </div>
                  </div>
                </div>
              </div>

              {/* Warning */}
              <div style={{
                padding: '14px 16px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}>
                <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#C8C3BA', margin: 0, lineHeight: 1.6 }}>
                  🚀 Sau khi chuyển khoản đúng nội dung, hệ thống sẽ <strong style={{ color: '#F8F1E6' }}>tự động kích hoạt trong 10–15 phút</strong>. Bạn có thể đóng cửa sổ này và chờ thông báo.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── STEP: thankyou ─────────────────────────────────────────────────── */}
      {step === 'thankyou' && (
        <div
          style={{
            background: '#22242E',
            border: '1px solid rgba(100,123,94,0.4)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '480px',
            boxShadow: '0 18px 50px rgba(0,0,0,.5)',
            overflow: 'hidden',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Success header */}
          <div style={{
            background: '#647B5E',
            padding: '36px 32px',
            textAlign: 'center',
          }}>
            <CheckCircle2 size={56} color="#F8F1E6" style={{ margin: '0 auto 16px' }} />
            <h3 style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontSize: '32px', fontWeight: 700,
              color: '#F8F1E6', margin: '0 0 8px', lineHeight: 1.15,
            }}>
              Chào mừng bạn!
            </h3>
            <p style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', color: 'rgba(248,241,230,0.85)', margin: 0 }}>
              Đăng ký thành công. Hành trình 100 ngày bắt đầu từ đây.
            </p>
          </div>

          {/* Body */}
          <div style={{ padding: '32px' }}>
            {/* Zalo CTA */}
            {course.link_zalo && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                  <div style={{ fontFamily: 'Inter, sans-serif', fontSize: '13px', color: '#A8A39C', marginBottom: '16px', lineHeight: 1.6 }}>
                    Tham gia nhóm Zalo để nhận hỗ trợ trực tiếp từ giảng viên và cộng đồng học viên.
                  </div>
                  <a
                    href={course.link_zalo}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '10px',
                      background: '#0068ff',
                      color: 'white',
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '16px',
                      fontWeight: 700,
                      padding: '16px 32px',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      boxShadow: '0 12px 30px rgba(0,104,255,0.3)',
                      transition: 'all .3s ease',
                      letterSpacing: '0.02em',
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 48 48" fill="white">
                      <path d="M24 4C13 4 4 12.1 4 22.2c0 5.4 2.6 10.3 6.8 13.7L9 40l7.2-2.1C18.5 39.3 21.2 40 24 40c11 0 20-8.1 20-17.8S35 4 24 4z"/>
                    </svg>
                    Vào nhóm Zalo ngay
                    <ExternalLink size={15} />
                  </a>
                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)', marginBottom: '20px' }} />
              </>
            )}

            {/* Learn CTA */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <a
                href={`/courses/${course.id_khoa}/learn`}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: '#C86B3D',
                  color: '#FFF7ED',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  fontWeight: 700,
                  padding: '14px 20px',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  letterSpacing: '0.02em',
                }}
              >
                Vào học ngay →
              </a>
              <button
                onClick={onClose}
                style={{
                  padding: '14px 18px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: '#A8A39C',
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Full QR overlay ─────────────────────────────────────────────────── */}
      {showFullQR && qrCodeUrl && (
        <div
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.95)' }}
          onClick={() => setShowFullQR(false)}
        >
          <div
            style={{ maxWidth: '360px', width: '100%', background: 'white', borderRadius: '16px', padding: '16px' }}
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={qrCodeUrl}
              alt="QR Code lớn"
              width={330} height={330}
              style={{ display: 'block', width: '100%', height: 'auto' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
            <a
              href={qrCodeUrl}
              download={`QR_${course.id_khoa}.png`}
              style={{
                background: 'white', color: '#171823',
                fontFamily: 'Inter, sans-serif', fontSize: '14px', fontWeight: 700,
                padding: '12px 24px', borderRadius: '8px', textDecoration: 'none',
              }}
            >
              📥 Tải ảnh QR
            </a>
            <button
              onClick={() => setShowFullQR(false)}
              style={{
                background: 'rgba(255,255,255,0.15)', color: 'white',
                fontFamily: 'Inter, sans-serif', fontSize: '14px',
                padding: '12px 24px', borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)', cursor: 'pointer',
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
