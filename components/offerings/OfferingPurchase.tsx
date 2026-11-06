'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
const RegistrationFlowModal = dynamic(() => import('@/components/course-page/RegistrationFlowModal'), { ssr: false })

export default function OfferingPurchase({ course, enrollment, userId, userPhone }: { course: Record<string, unknown>; enrollment: { status: string } | null; userId: number | null; userPhone: string | null }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  return <><button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-brk-primary px-5 text-base font-semibold text-white">{enrollment?.status === 'PENDING' ? 'Tiếp tục thanh toán' : course.productGroup === 'SERVICE' ? 'Đăng ký dịch vụ' : 'Mua / nhận sản phẩm'}</button>{open && <RegistrationFlowModal course={course} initialEnrollment={enrollment} userId={userId} userPhone={userPhone} onClose={() => { setOpen(false); router.refresh() }} onEnrolled={() => router.refresh()} />}</>
}
