'use server'

import prisma from '@/lib/prisma'

export type ActivityAction =
  | 'LOGIN' | 'LOGIN_FAILED' | 'LOGOUT'
  | 'REGISTER' | 'VERIFY_OTP'
  | 'PASSWORD_CHANGE' | 'PASSWORD_RESET'
  | 'PROFILE_UPDATE'
  | 'ENROLL_FREE' | 'ENROLL_PAID' | 'ENROLL_AFTER_REGISTER' | 'BULK_ENROLL'
  | 'PAYMENT_VERIFIED' | 'PAYMENT_AUTO_VERIFIED' | 'PAYMENT_REJECTED' | 'PAYMENT_REVERTED' | 'ENROLLMENT_CANCELLED'
  | 'LESSON_COMPLETE' | 'LESSON_SUBMIT'
  | 'AFFILIATE_CLICK' | 'AFFILIATE_CONVERSION'
  | 'WALLET_CHANGE'
  | 'SYSTEM_JOIN'
  | 'SURVEY_COMPLETE'
  | 'EMAIL_SENT' | 'EMAIL_FAILED'

export async function logActivity(data: {
  userId: number
  action: ActivityAction
  detail?: string
  metadata?: Record<string, any>
  createdAt?: Date
}): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        detail: data.detail || null,
        metadata: data.metadata || undefined,
        ...(data.createdAt ? { createdAt: data.createdAt } : {}),
      }
    })
  } catch (error) {
    console.error(`[ActivityLog] Failed to log ${data.action} for user #${data.userId}:`, error)
  }
}
