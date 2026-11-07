import type { CareRuleId } from './rules'

/**
 * Nội dung nhắc mặc định của Care Engine GĐ1 (bám bản demo đã duyệt).
 * Biến hỗ trợ: {name} {course} {days} {streak} {lesson} {amount} {hours}.
 * Thư viện câu mẫu dùng chung là phạm vi GĐ2 — ở GĐ1 mỗi luật có 1 mẫu
 * chuẩn để bảo đảm giọng thống nhất và kiểm chứng được.
 */
export const CARE_TEMPLATES: Record<CareRuleId, string> = {
  R1: 'Chào {name}, thầy/cô thấy mình đã vào khóa {course} được {days} ngày mà chưa bắt đầu bài đầu tiên. Bài 1 chỉ mất khoảng 15 phút — mình mở học thử ngay hôm nay, vướng chỗ nào cứ nhắn lại đây, thầy/cô hỗ trợ liền nhé!',
  R2: '{name} ơi, chuỗi {streak} ngày học liên tiếp của mình ở khóa {course} đang rất đẹp — đừng để đứt ở {lesson} nhé. Hôm nay nộp bài là giữ được nhịp, thầy/cô chờ bài của mình!',
  R3: 'Lâu rồi chưa thấy {name} xuất hiện trong khóa {course}. Trước đó mình học rất đều — có vướng mắc gì cứ chia sẻ với thầy/cô, mình cùng gỡ để quay lại nhịp học nhé.',
  R4: 'Chào {name}, đăng ký khóa {course} của mình còn 1 bước cuối là hoàn tất thanh toán {amount}. Hoàn tất hôm nay để được kích hoạt và không lỡ buổi học sắp tới nhé — cần hỗ trợ cứ nhắn thầy/cô.',
  R5: 'Học viên {name} đang chờ trả lời yêu cầu hỗ trợ ở khóa {course} đã {hours} giờ — ưu tiên xử lý sớm để giữ niềm tin của học viên.',
  R6: '{name} ơi, mình chưa ghi Điểm A (điểm bắt đầu) cho khóa {course}. Ghi lại hiện trạng hôm nay chỉ mất 3 phút, sau này mới đo được mình đã tiến bộ bao xa.',
}

export type CareTemplateVars = Partial<Record<'name' | 'course' | 'days' | 'streak' | 'lesson' | 'amount' | 'hours', string | number>>

export function fillCareTemplate(template: string, vars: CareTemplateVars): string {
  return template.replace(/\{(name|course|days|streak|lesson|amount|hours)\}/g, (match, key: string) => {
    const value = vars[key as keyof CareTemplateVars]
    return value === undefined || value === null || value === '' ? match : String(value)
  })
}

export function careReminderText(ruleId: CareRuleId, vars: CareTemplateVars): string {
  return fillCareTemplate(CARE_TEMPLATES[ruleId], vars)
}

export function formatMoneyVnd(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ'
}
