import { sendTransactionalEmail } from '@/lib/brevo'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Email báo phản hồi hỗ trợ cho khách, gửi qua cùng kênh Brevo với email
 * xác minh tài khoản. Nội dung phản hồi nằm ngay trong email để khách chưa
 * có tài khoản (hoặc chưa đăng nhập lại) vẫn đọc được; khách có tài khoản
 * có thêm nút mở trang "Yêu cầu của tôi" để trao đổi tiếp.
 */
export async function sendRequestReplyEmail(input: {
  to: string
  name: string
  reply: string
  requestContent: string
  siteName: string
  myRequestsUrl: string
}): Promise<void> {
  const siteName = input.siteName || 'Wi300'
  const excerpt = input.requestContent.trim().slice(0, 300)
  const subject = `Bạn có phản hồi mới cho yêu cầu hỗ trợ — ${siteName}`
  const htmlContent = [
    `<p>Chào <b>${escapeHtml(input.name || 'bạn')}</b>,</p>`,
    `<p>Người phụ trách trên <b>${escapeHtml(siteName)}</b> đã phản hồi yêu cầu hỗ trợ của bạn:</p>`,
    `<blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #0f766e;background:#f0fdf9;white-space:pre-wrap">${escapeHtml(input.reply)}</blockquote>`,
    excerpt
      ? `<p style="color:#555">Yêu cầu của bạn: <i>${escapeHtml(excerpt)}${input.requestContent.trim().length > 300 ? '…' : ''}</i></p>`
      : '',
    input.myRequestsUrl
      ? `<p><a href="${escapeHtml(input.myRequestsUrl)}" style="display:inline-block;padding:10px 18px;border-radius:10px;background:#0f766e;color:#fff;text-decoration:none;font-weight:600">Xem và trao đổi tiếp</a></p>`
      : '<p>Nếu cần hỗ trợ thêm, bạn có thể gửi yêu cầu mới trên website để người phụ trách tiếp tục giúp bạn.</p>',
    `<p style="color:#888;font-size:12px">Đây là email tự động từ ${escapeHtml(siteName)}. Vui lòng không trả lời trực tiếp email này.</p>`,
  ].join('')
  const textContent = [
    `Chào ${input.name || 'bạn'},`,
    '',
    `Người phụ trách trên ${siteName} đã phản hồi yêu cầu hỗ trợ của bạn:`,
    '',
    input.reply,
    '',
    ...(excerpt ? [`Yêu cầu của bạn: ${excerpt}${input.requestContent.trim().length > 300 ? '…' : ''}`, ''] : []),
    ...(input.myRequestsUrl
      ? [`Xem và trao đổi tiếp: ${input.myRequestsUrl}`]
      : ['Nếu cần hỗ trợ thêm, bạn có thể gửi yêu cầu mới trên website.']),
    '',
    `Email tự động từ ${siteName}. Vui lòng không trả lời trực tiếp email này.`,
  ].join('\n')
  await sendTransactionalEmail({
    sender: {
      name: siteName,
      email: process.env.BREVO_SENDER_EMAIL || 'hocvienbrk@gmail.com',
    },
    to: [{ email: input.to, name: input.name || undefined }],
    subject,
    htmlContent,
    textContent,
    tags: ['support-reply'],
  })
}
