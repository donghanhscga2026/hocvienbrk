'use server'

import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'
import { logActivity } from '@/lib/activity-logger'
import { parseFormSchema } from '@/lib/booking/slots'
import {
  BookingError,
  createSession,
  deleteException,
  isExpertRole,
  replaceAvailability,
  setBookingStatus,
  updateSession,
  upsertException,
  type AvailabilityRuleInput,
  type BookingActor,
  type SessionInput,
} from '@/lib/booking/service'

async function requireActor(): Promise<BookingActor> {
  const session = await auth()
  if (!session?.user?.id) throw new BookingError('Bạn cần đăng nhập.', 401)
  const actor: BookingActor = {
    id: Number(session.user.id),
    role: session.user.role || 'STUDENT',
    name: session.user.name || '',
  }
  if (!isExpertRole(actor.role)) throw new BookingError('Bạn không có quyền quản lý lịch hẹn.', 403)
  return actor
}

function fail(error: unknown): { ok: false; error: string } {
  if (error instanceof BookingError) return { ok: false, error: error.message }
  console.error('booking-actions:', error)
  return { ok: false, error: 'Đã có lỗi xảy ra, vui lòng thử lại.' }
}

export interface SaveSessionResult {
  ok: boolean
  error?: string
  id?: number
  code?: string
}

/** Tạo mới hoặc sửa một phiên hẹn. Giáo viên chỉ quản lý phiên của mình;
 *  quản trị viên có thể chỉ định chuyên gia khác qua expertId. */
export async function saveBookingSession(input: {
  id?: number
  expertId?: number
  data: Omit<SessionInput, 'formFields'> & { formFields: unknown }
}): Promise<SaveSessionResult> {
  try {
    const actor = await requireActor()
    const data: SessionInput = { ...input.data, formFields: parseFormSchema(input.data.formFields) }
    const expertId = actor.role === 'ADMIN' && input.expertId ? input.expertId : actor.id
    const saved = input.id
      ? await updateSession(actor, input.id, data)
      : await createSession(actor, expertId, data)
    await logActivity({
      userId: actor.id,
      action: input.id ? 'BOOKING_SESSION_UPDATED' : 'BOOKING_SESSION_CREATED',
      detail: `${input.id ? 'Sửa' : 'Tạo'} phiên hẹn "${saved.title}" (mã ${saved.code})`,
      metadata: { sessionId: saved.id, code: saved.code },
    })
    revalidatePath('/tools/dat-lich')
    return { ok: true, id: saved.id, code: saved.code }
  } catch (error) {
    return fail(error)
  }
}

/** Thay toàn bộ lịch rảnh theo tuần của một chuyên gia. */
export async function saveBookingAvailability(input: {
  expertId?: number
  rules: AvailabilityRuleInput[]
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireActor()
    const expertId = actor.role === 'ADMIN' && input.expertId ? input.expertId : actor.id
    const rules = (input.rules || []).map((r) => ({
      weekday: Math.trunc(Number(r.weekday)),
      startMin: Math.trunc(Number(r.startMin)),
      endMin: Math.trunc(Number(r.endMin)),
    }))
    await replaceAvailability(actor, expertId, rules)
    revalidatePath('/tools/dat-lich')
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}

/** Thêm/sửa một ngày ngoại lệ (nghỉ cả ngày hoặc mở khung giờ riêng). */
export async function saveBookingException(input: {
  expertId?: number
  dateVN: string
  isOff: boolean
  startMin?: number | null
  endMin?: number | null
  note?: string
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireActor()
    const expertId = actor.role === 'ADMIN' && input.expertId ? input.expertId : actor.id
    await upsertException(actor, expertId, input)
    revalidatePath('/tools/dat-lich')
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}

export async function removeBookingException(input: {
  expertId?: number
  dateVN: string
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireActor()
    const expertId = actor.role === 'ADMIN' && input.expertId ? input.expertId : actor.id
    await deleteException(actor, expertId, input.dateVN)
    revalidatePath('/tools/dat-lich')
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}

/** Chuyển trạng thái một lịch hẹn: xác nhận / hủy / hoàn thành / vắng mặt. */
export async function changeBookingStatus(input: {
  bookingId: number
  next: 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW'
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const actor = await requireActor()
    await setBookingStatus(actor, input.bookingId, input.next)
    await logActivity({
      userId: actor.id,
      action: 'BOOKING_STATUS_CHANGED',
      detail: `Chuyển lịch hẹn #${input.bookingId} sang ${input.next}`,
      metadata: { bookingId: input.bookingId, next: input.next },
    })
    revalidatePath('/tools/dat-lich')
    return { ok: true }
  } catch (error) {
    return fail(error)
  }
}
