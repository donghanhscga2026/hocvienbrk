/**
 * Seed bài hướng dẫn cho module Trợ lý hướng dẫn (AssistantGuide + AssistantGuideStep).
 *
 * Chế độ dry-run MẶC ĐỊNH: chỉ in ra những gì sẽ thay đổi, KHÔNG ghi DB.
 * Thực thi:           npx tsx prisma/seed-assistant-guides.ts --execute
 * Dry-run:            npx tsx prisma/seed-assistant-guides.ts
 *
 * Cần biến môi trường DATABASE_URL trỏ tới DB muốn seed.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const EXECUTE = process.argv.includes('--execute')

interface SeedStep {
  title: string
  body: string
  imageUrl?: string
  videoUrl?: string
  targetSelector?: string
}

interface SeedGuide {
  pagePath: string
  title: string
  roles: string[] // rỗng = mọi vai trò
  textContent?: string
  steps: SeedStep[]
}

const GUIDES: SeedGuide[] = [
  {
    pagePath: '/tools/bank-accounts',
    title: 'Quản lý tài khoản ngân hàng',
    roles: ['ADMIN'],
    textContent:
      'Trang này quản lý tài khoản ngân hàng nhận học phí của từng giảng viên, ' +
      'kèm key webhook SePay riêng cho từng tài khoản.',
    steps: [
      {
        title: 'Bước 1: Bấm nút Thêm tài khoản',
        body:
          'Ở phía trên bảng danh sách, bấm nút "Thêm tài khoản" màu đen.\n\n' +
          'Mỗi tài khoản ngân hàng gắn với một người dùng (thường là giảng viên). ' +
          'Tiền học phí của các khóa học do giảng viên đó dạy sẽ về đúng tài khoản này, ' +
          'nên cần thêm tài khoản riêng cho từng giảng viên để đối soát không bị lẫn.',
        targetSelector: '[data-help-id="btn-add-bank-account"]',
      },
      {
        title: 'Bước 2: Chọn người dùng và điền số tài khoản',
        body:
          'Gõ mã học viên, tên hoặc email vào ô tìm người dùng rồi chọn đúng người.\n\n' +
          'Điền chủ tài khoản (nên viết hoa), số tài khoản (chỉ gồm chữ số, không dấu cách). ' +
          'Mẹo: nên dùng số tài khoản trùng với số điện thoại đã đăng ký SePay ' +
          'để đối soát tự động khớp nhanh và chính xác nhất.\n\n' +
          'Chọn đúng ngân hàng trong danh sách. Có thể dán thêm link QR code nếu muốn.',
        targetSelector: '[data-help-id="input-account-number"]',
      },
      {
        title: 'Bước 3: Lưu tài khoản',
        body:
          'Bấm nút "Thêm mới" ở cuối form để lưu. Tài khoản mới sẽ hiện ngay trong bảng danh sách.\n\n' +
          'Lưu ý: thêm tài khoản mới chỉ là bước đầu. Để tiền về tự động kích hoạt khóa học, ' +
          'giảng viên còn cần bật cấu hình ở trang Đối soát tự động (/tools/payments/auto-verify).',
        targetSelector: '[data-help-id="btn-save-bank-account"]',
      },
      {
        title: 'Bước 4: Tạo key webhook riêng cho tài khoản',
        body:
          'Ở cột "Key webhook" trên dòng tài khoản vừa tạo, bấm "+ Tạo key".\n\n' +
          'Key chỉ hiện 1 lần duy nhất — copy ngay và gửi cho giảng viên ' +
          'để họ dán vào ô API Key khi tạo webhook trên trang SePay của họ.\n\n' +
          'Từ lúc này, webhook của tài khoản đó chỉ chấp nhận đúng key này. ' +
          'Nếu key bị lộ: bấm "Thu hồi" rồi tạo key mới — các tài khoản khác không bị ảnh hưởng.',
        targetSelector: '[data-help-id="btn-gen-key"]',
      },
    ],
  },
  {
    pagePath: '/tools/payments/auto-verify',
    title: 'Cấu hình đối soát tự động theo khóa học',
    roles: ['ADMIN'],
    textContent:
      'Mỗi khóa học có phí cần một cấu hình để hệ thống tự quét email biến động số dư ' +
      'và tự kích hoạt học viên khi tiền về.',
    steps: [
      {
        title: 'Bước 1: Bấm Thêm cấu hình',
        body:
          'Ở góc phải phía trên trang, bấm nút "Thêm cấu hình".\n\n' +
          'Mỗi khóa học có phí cần 1 cấu hình: hệ thống dùng nó để quét email biến động số dư ' +
          'của đúng tài khoản ngân hàng giảng viên, rồi tự kích hoạt học viên khi tiền về.\n\n' +
          'Lưu ý: khi tạo khóa học có phí, hệ thống đã tự tạo sẵn cấu hình (Sacombank bật sẵn). ' +
          'Trang này dùng để xem, sửa hoặc bật/tắt các cấu hình đó.',
        targetSelector: '[data-help-id="btn-add-autoverify"]',
      },
      {
        title: 'Bước 2: Chọn khóa học',
        body:
          'Chọn khóa học có phí chưa có cấu hình trong danh sách.\n\n' +
          'Tên ngân hàng sẽ tự điền theo tài khoản của giảng viên đang dạy khóa đó — ' +
          'kiểm tra lại cho chắc vì tiền sẽ được quét trên tài khoản này.',
        targetSelector: '[data-help-id="select-course"]',
      },
      {
        title: 'Bước 3: Điền email người gửi và từ khóa',
        body:
          '"Email người gửi" là địa chỉ gửi thông báo biến động số dư của ngân hàng. ' +
          'Mở một email thông báo thật ra xem địa chỉ người gửi là gì rồi điền vào, ' +
          'ví dụ info@sacombank.com.vn.\n\n' +
          '"Từ khóa" (Gmail query) giúp lọc đúng email cần quét, ví dụ "thong bao giao dich".\n\n' +
          'Điền sai hai ô này thì hệ thống quét không ra giao dịch — đây là lỗi hay gặp nhất.',
      },
      {
        title: 'Bước 4: Bật quét và lưu',
        body:
          'Tick chọn "Bật quét tự động" rồi bấm "Lưu cấu hình".\n\n' +
          'Sau này muốn bật/tắt nhanh, bấm nút "Bật"/"Tắt" ngay trên thẻ cấu hình ' +
          'mà không cần mở form sửa.',
        targetSelector: '[data-help-id="btn-save-autoverify"]',
      },
    ],
  },
  {
    pagePath: '/tools/payments/unmatched',
    title: 'Xử lý giao dịch chưa khớp',
    roles: ['ADMIN'],
    textContent:
      'Tiền đã về nhưng hệ thống không tự khớp được enrollment nào ' +
      '(sai nội dung, thiếu tiền, không có đơn chờ). Admin đối soát và gán tay tại đây.',
    steps: [
      {
        title: 'Bước 1: Đọc lý do chưa khớp',
        body:
          'Mỗi thẻ là một giao dịch tiền đã về nhưng hệ thống không tự khớp được với đơn đăng ký nào.\n\n' +
          'Đọc kỹ 3 dòng: số tiền, nội dung chuyển khoản, và "Lý do chưa khớp" (màu cam). ' +
          'Nguyên nhân thường gặp: học viên ghi sai cú pháp chuyển khoản, chuyển thiếu tiền, ' +
          'hoặc không có đơn đăng ký nào đang chờ ở thời điểm tiền về.',
      },
      {
        title: 'Bước 2: Tìm đúng enrollment cần gán',
        body:
          'Đối chiếu số tiền và nội dung chuyển khoản với danh sách đăng ký đang chờ ' +
          '(xem ở trang Quản lý học viên hoặc CRM của khóa học).\n\n' +
          'Khi đã xác định đúng học viên và khóa học, lấy ID của enrollment đó — ' +
          'thường xem được trong trang chi tiết học viên.',
      },
      {
        title: 'Bước 3: Nhập ID enrollment và gán tay',
        body:
          'Nhập ID enrollment vào ô "ID enrollment", rồi bấm "Gán tay + kích hoạt".\n\n' +
          'Hệ thống sẽ gán giao dịch cho enrollment đó và kích hoạt khóa học ngay lập tức.\n\n' +
          'Kiểm tra kỹ ID trước khi bấm — thao tác này kích hoạt thật cho học viên.',
        targetSelector: '[data-help-id="input-enrollment-id"]',
      },
      {
        title: 'Bước 4: Bỏ qua giao dịch không liên quan',
        body:
          'Nếu giao dịch không phải học phí (chuyển nhầm, giao dịch cá nhân của chủ tài khoản...), ' +
          'bấm "Bỏ qua" để ẩn nó khỏi danh sách.\n\n' +
          'Danh sách trống nghĩa là mọi giao dịch đã được đối soát xong.',
      },
    ],
  },
  {
    pagePath: '/account-settings',
    title: 'Nhận học phí tự động trong 3 bước',
    roles: ['INSTRUCTOR', 'TEACHER'],
    textContent:
      'Giảng viên làm 3 bước để học viên chuyển khoản là được tự động kích hoạt, ' +
      'không cần duyệt tay.',
    steps: [
      {
        title: 'Bước 1: Thêm tài khoản nhận tiền của bạn',
        body:
          'Trong mục "Tài khoản nhận tiền", bấm nút "Thêm" và điền tài khoản ngân hàng của chính bạn.\n\n' +
          'Đây là nơi học viên chuyển học phí đến. Khi tạo khóa học, nhớ chọn đúng tài khoản này — ' +
          'hệ thống sẽ tự sinh mã QR đúng tài khoản của bạn cho học viên quét.\n\n' +
          'Mẹo: nên dùng số tài khoản trùng với số điện thoại bạn đăng ký SePay ' +
          'để đối soát khớp nhanh nhất.',
        targetSelector: '[data-help-id="btn-add-my-bank"]',
      },
      {
        title: 'Bước 2: Forward email biến động số dư',
        body:
          'Để hệ thống "thấy" tiền về, bạn cần chuyển tiếp email thông báo biến động số dư ' +
          'về Gmail trung tâm của hệ thống.\n\n' +
          'Cách làm: vào Gmail của bạn → Cài đặt → Bộ lọc → tạo bộ lọc với điều kiện ' +
          'From là địa chỉ email thông báo của ngân hàng bạn (ví dụ Sacombank là info@sacombank.com.vn) ' +
          '→ chọn "Chuyển tiếp tới" địa chỉ Gmail trung tâm (hỏi admin để lấy địa chỉ).\n\n' +
          'Hoặc dùng kênh webhook SePay: tạo webhook trên trang SePay của bạn trỏ về ' +
          'địa chỉ hệ thống cung cấp, rồi dán API key (xin admin cấp) vào ô bảo mật.',
      },
      {
        title: 'Bước 3: Báo admin bật tự động xác minh',
        body:
          'Sau khi xong 2 bước trên, báo cho admin để admin bật "Tự động xác minh" ' +
          'cho khóa học của bạn (trang Đối soát tự động).\n\n' +
          'Từ đó, học viên chuyển khoản đúng cú pháp "SDT ... HV ... COC ..." ' +
          'là được kích hoạt ngay lập tức, bạn không cần duyệt tay từng đơn.',
        targetSelector: '[data-help-id="sepay-3steps"]',
      },
    ],
  },
  {
    pagePath: '/login',
    title: 'Đăng nhập: số điện thoại, mã thành viên, OTP',
    roles: [],
    textContent:
      'Đăng nhập 2 bước: bước 1 kiểm tra số điện thoại hoặc mã thành viên, ' +
      'bước 2 nhập mật khẩu hoặc mã OTP.',
    steps: [
      {
        title: 'Bước 1: Nhập số điện thoại hoặc mã thành viên',
        body:
          'Nhập số điện thoại của bạn (nhận các dạng +84, 84, 0 ở đầu hoặc số trần) ' +
          'hoặc mã thành viên, rồi bấm "Kiểm tra và tiếp tục".\n\n' +
          'Hệ thống sẽ cho biết tài khoản có tồn tại không, đồng thời hiện mã thành viên ' +
          'và email dạng che để bạn nhận ra đúng tài khoản của mình.\n\n' +
          'Nhập sai thông tin ở bước này thì bấm "Nhập lại thông tin" để làm lại.',
        targetSelector: '[data-help-id="btn-check-phone"]',
      },
      {
        title: 'Bước 2: Nhập mật khẩu hoặc mã OTP',
        body:
          'Điền mật khẩu của bạn vào ô chung.\n\n' +
          'Nếu quên mật khẩu: bấm "Gửi mã OTP qua mail" — mã OTP 6 chữ số sẽ được gửi về ' +
          'email bạn đã đăng ký, hiệu lực 10 phút. Lấy mã trong mail rồi điền vào đúng ô này.\n\n' +
          'Tài khoản quản trị có bật xác thực 2 lớp sẽ hiện thêm ô "Mã Authenticator": ' +
          'mở ứng dụng Authenticator trên điện thoại, lấy mã 6 số đang hiện rồi điền vào.',
        targetSelector: '[data-help-id="input-password-otp"]',
      },
      {
        title: 'Bước 3: Bấm Đăng nhập',
        body:
          'Bấm nút "Đăng nhập" để vào hệ thống.\n\n' +
          'Nếu báo sai mật khẩu/OTP quá 5 lần trong 15 phút, tài khoản sẽ bị khóa tạm thời ' +
          'để chống dò mật khẩu — đợi hết thời gian rồi thử lại, hoặc dùng mã OTP mới.',
        targetSelector: '[data-help-id="btn-do-login"]',
      },
    ],
  },
  {
    pagePath: '/tools/courses/new',
    title: 'Tạo khóa học mới',
    roles: ['ADMIN', 'INSTRUCTOR'],
    textContent:
      'Tạo khóa học mới: điền thông tin lớp, cấu hình học phí và tài khoản nhận tiền, rồi bấm tạo.',
    steps: [
      {
        title: 'Bước 1: Điền tên lớp và mã khóa học',
        body:
          'Điền "Tên lớp học" (bắt buộc) — tên hiển thị cho học viên, và "Mã khóa học" (bắt buộc) — ' +
          'mã viết tắt duy nhất của khóa, ví dụ BRK01.\n\n' +
          'Có thể điền thêm "Tên khóa học" nếu muốn tên gọi khác với tên lớp.',
        targetSelector: '[data-help-id="input-class-name"]',
      },
      {
        title: 'Bước 2: Cấu hình học phí và tài khoản nhận tiền',
        body:
          'Xuống mục "Học phí & Thanh toán":\n\n' +
          '- Chọn tài khoản ngân hàng nhận tiền trong danh sách (tài khoản của giảng viên dạy khóa này). ' +
          'Nếu chưa có, thêm trước ở trang Tài khoản ngân hàng.\n' +
          '- Nhập "Học phí (VND)" — số tiền học viên cần chuyển. Để 0 nếu khóa miễn phí.\n' +
          '- Chọn "Dạng phí": miễn phí, phí tùy tâm, phí cam kết, phí đồng hành hoặc phí tối thiểu.\n\n' +
          'Khóa học có phí sẽ được hệ thống tự tạo cấu hình đối soát (Sacombank bật sẵn).',
        targetSelector: '[data-help-id="input-course-fee"]',
      },
      {
        title: 'Bước 3: Bấm Tạo khóa học',
        body:
          'Kiểm tra lại các ô bắt buộc (tên lớp, mã khóa học), rồi bấm "Tạo Khóa học" ở cuối trang.\n\n' +
          'Sau khi tạo, mở khóa học để thêm bài giảng, tài liệu và trang nội dung cho từng buổi học.',
        targetSelector: '[data-help-id="btn-create-course"]',
      },
    ],
  },
  {
    pagePath: '/khoa-hoc/[id]',
    title: 'Đăng ký khóa học và chuyển khoản',
    roles: ['STUDENT'],
    textContent:
      'Cách đăng ký khóa học, quét mã QR chuyển khoản đúng nội dung ' +
      'để được tự động kích hoạt.',
    steps: [
      {
        title: 'Bước 1: Bấm Đăng ký khóa học',
        body:
          'Trên trang khóa học, bấm nút Đăng ký (thường nằm ở đầu trang hoặc cuối trang).\n\n' +
          'Nếu chưa đăng nhập, hệ thống sẽ yêu cầu bạn đăng nhập trước rồi mới tiếp tục được.',
      },
      {
        title: 'Bước 2: Quét mã QR để chuyển khoản',
        body:
          'Sau khi đăng ký, màn hình hiện mã QR cùng số tiền cần chuyển, tên ngân hàng, ' +
          'số tài khoản và chủ tài khoản.\n\n' +
          'Mở app ngân hàng trên điện thoại, quét mã QR — số tiền và nội dung chuyển khoản ' +
          'sẽ được điền tự động, bạn không cần nhập tay.',
      },
      {
        title: 'Bước 3: Ghi đúng nội dung chuyển khoản',
        body:
          'Đây là bước quan trọng nhất. Nội dung chuyển khoản có dạng:\n' +
          'SDT [số điện thoại] HV [mã học viên] COC [mã khóa]\n' +
          'Ví dụ: SDT 0912345678 HV 3773 COC BRK01\n\n' +
          'Quét mã QR thì nội dung tự điền đúng. Nếu chuyển khoản tay, hãy copy chính xác ' +
          'từng ký tự — sai một chữ là hệ thống không tự khớp được, bạn sẽ phải chờ admin gán tay.',
      },
      {
        title: 'Bước 4: Chờ kích hoạt tự động',
        body:
          'Sau khi chuyển khoản đúng nội dung, hệ thống sẽ tự động kích hoạt trong 10-15 phút. ' +
          'Bạn có thể đóng cửa sổ và chờ thông báo — không cần chụp bill gửi cho ai.\n\n' +
          'Quá 30 phút vẫn chưa được kích hoạt: kiểm tra lại nội dung chuyển khoản đã đúng chưa, ' +
          'hoặc liên hệ bộ phận hỗ trợ.',
      },
    ],
  },
  {
    pagePath: '/tools',
    title: 'Tổng quan trang công cụ',
    roles: ['ADMIN'],
    textContent:
      'Trang /tools tập hợp toàn bộ công cụ quản trị và vận hành của hệ thống, ' +
      'hiển thị theo đúng vai trò của bạn.',
    steps: [
      {
        title: 'Bước 1: Hiểu bố cục trang công cụ',
        body:
          'Trang này tập hợp toàn bộ công cụ của hệ thống: quản lý khóa học, học viên, ' +
          'thanh toán, affiliate, email marketing, website...\n\n' +
          'Danh sách bạn thấy đã được lọc theo vai trò — admin thấy đầy đủ nhất, ' +
          'giảng viên và học viên chỉ thấy những công cụ mình được dùng.',
      },
      {
        title: 'Bước 2: Mở công cụ cần dùng',
        body:
          'Mỗi công cụ là một thẻ có tên và mô tả ngắn. Bấm vào thẻ để mở trang tương ứng.\n\n' +
          'Nếu bấm vào công cụ mình không có quyền, hệ thống sẽ báo rõ lý do ' +
          '(chưa đăng nhập hoặc cần vai trò cao hơn) thay vì mở trang trắng.',
      },
      {
        title: 'Bước 3: Nhóm công cụ thanh toán đi theo thứ tự',
        body:
          'Các công cụ thanh toán nên dùng theo đúng thứ tự khi setup cho giảng viên mới:\n\n' +
          '1. Tài khoản ngân hàng — thêm tài khoản và tạo key webhook SePay.\n' +
          '2. Đối soát tự động — bật/tắt quét giao dịch theo từng khóa học.\n' +
          '3. Giao dịch chưa khớp — gán tay những giao dịch hệ thống không tự khớp được.\n\n' +
          'Mỗi trang trong nhóm đều có bài hướng dẫn riêng (bấm nút "?" góc phải).',
      },
    ],
  },
]

async function main() {
  console.log(`Chế độ: ${EXECUTE ? 'THỰC THI (ghi DB)' : 'DRY-RUN (chỉ xem, không ghi)'}`)
  console.log(`Số guide trong seed: ${GUIDES.length}\n`)

  let guidesCreated = 0
  let guidesUpdated = 0
  let stepsWritten = 0

  for (const g of GUIDES) {
    const existing = await prisma.assistantGuide.findFirst({ where: { pagePath: g.pagePath } })
    console.log(`- [${g.pagePath}] "${g.title}" roles=[${g.roles.join(',') || 'mọi vai trò'}] — ${g.steps.length} bước`)
    g.steps.forEach((s, i) => {
      console.log(`    ${i + 1}. ${s.title}${s.targetSelector ? `  🎯 ${s.targetSelector}` : ''}`)
    })
    console.log(`    → ${existing ? `Cập nhật guide #${existing.id} (xóa bước cũ, ghi lại ${g.steps.length} bước)` : 'Tạo guide mới'}`)

    if (!EXECUTE) continue

    const guide = existing
      ? await prisma.assistantGuide.update({
          where: { id: existing.id },
          data: { title: g.title, roles: g.roles, textContent: g.textContent || null, isActive: true },
        })
      : await prisma.assistantGuide.create({
          data: {
            pagePath: g.pagePath,
            title: g.title,
            roles: g.roles,
            textContent: g.textContent || null,
            isActive: true,
          },
        })
    if (existing) guidesUpdated++
    else guidesCreated++

    await prisma.assistantGuideStep.deleteMany({ where: { guideId: guide.id } })
    for (let i = 0; i < g.steps.length; i++) {
      const s = g.steps[i]
      await prisma.assistantGuideStep.create({
        data: {
          guideId: guide.id,
          stepOrder: i,
          title: s.title,
          body: s.body,
          imageUrl: s.imageUrl || null,
          videoUrl: s.videoUrl || null,
          targetSelector: s.targetSelector || null,
          isActive: true,
        },
      })
      stepsWritten++
    }
  }

  console.log('')
  if (EXECUTE) {
    const totalGuides = await prisma.assistantGuide.count()
    const totalSteps = await prisma.assistantGuideStep.count()
    console.log(`Hoàn tất: tạo mới ${guidesCreated} guide, cập nhật ${guidesUpdated} guide, ghi ${stepsWritten} bước.`)
    console.log(`Tổng trong DB: ${totalGuides} guide, ${totalSteps} bước.`)
  } else {
    console.log('Dry-run xong — chưa ghi gì vào DB. Thêm --execute để thực thi.')
  }
}

main()
  .catch(e => {
    console.error('Lỗi:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
