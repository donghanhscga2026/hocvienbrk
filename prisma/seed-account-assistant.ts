import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const defaultOptions: Record<string, any[]> = {
  initial: [
    { label: 'Tôi chưa có / Tôi không nhớ đã có tài khoản', action: 'next_step:check' },
    { label: 'Tôi đã có tài khoản', action: 'next_step:login_id' },
  ],
  login_id: [
    { label: 'Tôi không nhớ mã học viên', action: 'next_step:check' },
    { label: 'Tiếp tục', action: 'action:check_student_id' },
  ],
  login_confirm: [
    { label: 'Không phải, nhập lại', action: 'action:go_back_login_id' },
    { label: 'Đúng, tiếp tục', action: 'next_step:login_password' },
  ],
  login_password: [
    { label: 'Tôi không nhớ mật khẩu', action: 'action:send_otp' },
    { label: 'Đăng nhập', action: 'action:submit_login' },
  ],
  check: [
    { label: 'Kiểm tra', action: 'action:check_user' },
  ],
  found_account: [],
  register_name: [
    { label: 'Tiếp tục', action: 'action:register_name' },
  ],
  register_email: [
    { label: 'Tiếp tục', action: 'action:register_email' },
  ],
  register_phone: [
    { label: 'Tiếp tục', action: 'action:register_phone' },
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
  register_name: 'Nhập vào họ tên của bạn',
  register_email: 'Nhập vào địa chỉ email của bạn',
  register_phone: 'Nhập số điện thoại của bạn',
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
    { stepKey: 'register_name', order: 60 },
    { stepKey: 'register_email', order: 70 },
    { stepKey: 'register_phone', order: 80 },
    { stepKey: 'forgot_otp', order: 90 },
    { stepKey: 'forgot_new_password', order: 100 },
  ]

  for (const step of steps) {
    await prisma.accountAssistantStep.upsert({
      where: { stepKey: step.stepKey },
      update: {
        question: defaultQuestions[step.stepKey] || null,
        options: defaultOptions[step.stepKey] || [],
        order: step.order,
        isActive: true,
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
