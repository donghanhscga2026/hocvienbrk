import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const defaultOptions: Record<string, any[]> = {
  initial: [
    { label: 'Tôi chưa có / Tôi không nhớ đã có tài khoản', action: 'next_step:check' },
    { label: 'Tôi đã có tài khoản', action: 'next_step:login_id' },
  ],
  login_id: [
    { label: 'Tôi không nhớ mã thành viên', action: 'next_step:check' },
    { label: 'Tiếp tục', action: 'action:check_student_id' },
  ],
  login_confirm: [
    { label: 'Không phải, nhập lại', action: 'action:go_back_login_id' },
    { label: 'Đúng, tiếp tục', action: 'next_step:login_password' },
  ],
  login_password: [
    // B6: đổi từ "Tôi không nhớ mật khẩu" sang khung "OTP ngang hàng với mật khẩu",
    // giống Zalo/Grab — không chỉ là lối thoát khi quên, mà là cách đăng nhập hợp lệ khác.
    { label: 'Đăng nhập bằng mã OTP', action: 'action:send_otp' },
    { label: 'Đăng nhập', action: 'action:submit_login' },
  ],
  check: [
    { label: 'Kiểm tra', action: 'action:check_user' },
  ],
  found_account: [],
  // B5: gộp 3 bước cũ (register_name → register_email → register_phone) thành 1 bước
  // duy nhất "register_info" để giảm phễu đăng ký.
  register_info: [
    { label: 'Tiếp tục', action: 'action:register_info' },
  ],
  register_name: [
    { label: 'Tiếp tục', action: 'action:register_name' },
  ],
  register_email: [
    { label: 'Tiếp tục', action: 'action:register_email' },
  ],
  register_phone: [
    { label: 'Tiếp tục', action: 'action:register_phone' },
  ],
  register_password: [
    { label: 'Tiếp tục', action: 'action:register_password' },
  ],
  register_confirm: [
    { label: 'Xác nhận và đăng nhập', action: 'action:register_confirm' },
  ],
  register_otp: [
    { label: 'Bỏ qua xác minh', action: 'action:skip_register_otp' },
    { label: 'Xác minh ngay', action: 'action:verify_register_otp' },
  ],
  forgot_otp: [
    { label: 'Quay lại đăng nhập', action: 'next_step:login_password' },
    { label: 'Xác nhận OTP', action: 'action:verify_otp' },
  ],
  forgot_new_password: [
    { label: 'Đặt lại mật khẩu', action: 'action:reset_password' },
  ],
}

const defaultQuestions: Record<string, string> = {
  initial: 'Bạn đã có tài khoản đăng nhập chưa?',
  login_id: 'Nhập vào mã học viên của bạn?',
  login_confirm: 'Đây có phải là bạn?',
  login_password: 'Nhập mật khẩu của bạn?',
  check: 'Nhập vào số điện thoại hoặc email của bạn để kiểm tra xem đã tồn tại trong hệ thống đăng ký chưa?',
  found_account: 'Bạn đã có tài khoản',
  register_info: 'Nhập họ tên, email, số điện thoại và mã người giới thiệu (nếu có) để tạo tài khoản',
  register_name: 'Nhập vào họ tên của bạn',
  register_email: 'Nhập vào địa chỉ email của bạn',
  register_phone: 'Nhập số điện thoại của bạn',
  register_password: 'Đặt mật khẩu cho tài khoản của bạn',
  register_confirm: 'Ghi lại thông tin đăng nhập để tránh quên. Nhấn "Xác nhận" để hoàn tất đăng ký!',
  register_otp: 'Nhập mã OTP đã gửi đến email của bạn để xác minh tài khoản, hoặc bỏ qua để đăng nhập ngay.',
  forgot_otp: 'Bạn hãy kiểm tra lại email để nhập mã OTP gửi về cho bạn',
  forgot_new_password: 'Nhập mật khẩu mới của bạn',
}

export async function seedAccountAssistantSteps() {
  const steps = [
    { stepKey: 'initial', order: 0 },
    { stepKey: 'login_id', order: 10 },
    { stepKey: 'login_confirm', order: 20 },
    { stepKey: 'login_password', order: 30 },
    { stepKey: 'check', order: 40 },
    { stepKey: 'found_account', order: 50 },
    { stepKey: 'register_info', order: 60 },
    { stepKey: 'register_password', order: 85 },
    { stepKey: 'register_confirm', order: 87 },
    { stepKey: 'register_otp', order: 89 },
    // BUG có sẵn từ trước: stepKey này được code tham chiếu (renderCustomInput,
    // handleAction) nhưng chưa từng được seed vào DB — khiến sau khi đăng ký xong
    // (bỏ qua/xác minh OTP), modal hiện "Không tìm thấy bước này." không lối thoát.
    { stepKey: 'register_success', order: 90 },
    { stepKey: 'forgot_otp', order: 91 },
    { stepKey: 'forgot_new_password', order: 100 },
    // Giữ lại 3 bước cũ (đã gộp vào register_info) ở trạng thái inactive —
    // không xoá để không mất agentVideoUrl admin đã upload, phòng cần đối chiếu/khôi phục.
    { stepKey: 'register_name', order: 61 },
    { stepKey: 'register_email', order: 62 },
    { stepKey: 'register_phone', order: 63 },
  ]

  for (const step of steps) {
    await prisma.accountAssistantStep.upsert({
      where: { stepKey: step.stepKey },
      update: {
        question: defaultQuestions[step.stepKey] || null,
        options: defaultOptions[step.stepKey] || [],
        order: step.order,
      },
      create: {
        stepKey: step.stepKey,
        question: defaultQuestions[step.stepKey] || null,
        agentVideoUrl: null,
        guideVideoUrl: null,
        guideTitle: null,
        options: defaultOptions[step.stepKey] || [],
        order: step.order,
        isActive: true,
      },
    })
  }

  // Seed tool record for admin management
  await prisma.tool.upsert({
    where: { slug: 'account-assistant' },
    update: {
      name: 'Trợ lý tài khoản',
      description: 'Quản lý nội dung trợ lý tài khoản',
      icon: 'Settings',
      url: '/tools/account-assistant',
      roles: ['ADMIN'],
      order: 99,
      isActive: true,
    },
    create: {
      slug: 'account-assistant',
      name: 'Trợ lý tài khoản',
      description: 'bgPurple500',
      icon: 'Settings',
      url: '/tools/account-assistant',
      roles: ['ADMIN'],
      order: 99,
      isActive: true,
    },
  })

  // Các bước không còn dùng trong code hiện tại — vô hiệu hoá, không xoá dữ liệu
  await prisma.accountAssistantStep.updateMany({
    where: { stepKey: { in: ['found_account', 'register_name', 'register_email', 'register_phone'] } },
    data: { isActive: false },
  })

  console.log('✅ Seed AccountAssistantSteps done')
}

async function main() {
  await seedAccountAssistantSteps()
  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})
