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
import { normalizeRoles } from '../lib/auth/roles'

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
        imageUrl: '/help/login-s1.jpg',
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
  {
    pagePath: '/register',
    title: 'Đăng ký tài khoản mới',
    roles: [],
    textContent: 'Tạo tài khoản mới: điền thông tin, xác minh OTP rồi đăng nhập.',
    steps: [
      {
        title: 'Bước 1: Điền thông tin đăng ký',
        body:
          'Điền họ tên, địa chỉ email, số điện thoại và mật khẩu.\n\n' +
          'Số điện thoại: nhập số Việt Nam (bỏ số 0 ở đầu, ví dụ 912345678), nên dùng số có Zalo/Telegram ' +
          'để nhận mã OTP nhanh nhất. Email cần xác minh sau khi đăng ký — nhập đúng email bạn đang dùng. ' +
          'Mật khẩu phải đạt tiêu chuẩn (đủ độ dài, có chữ và số).\n\n' +
          'Nếu bạn bấm link giới thiệu của ai đó, ô "Mã giới thiệu" sẽ tự điền sẵn và hiện tên người giới thiệu.',
        imageUrl: '/help/register-s1.jpg',
      },
      {
        title: 'Bước 2: Bấm Đăng ký',
        body: 'Kiểm tra lại thông tin rồi bấm nút "Đăng ký".',
        imageUrl: '/help/register-s2.jpg',
        targetSelector: '[data-help-id="btn-register"]',
      },
      {
        title: 'Bước 3: Xác minh OTP',
        body:
          'Mã OTP 6 số sẽ được gửi đến email của bạn (hoặc qua Telegram Bot — làm theo hướng dẫn trên màn hình).\n\n' +
          'Nhập mã OTP vào ô xác minh để kích hoạt tài khoản, sau đó bạn sẽ được tự động đăng nhập.',
      },
    ],
  },
  {
    pagePath: '/forgot-password',
    title: 'Quên mật khẩu: lấy lại mật khẩu',
    roles: [],
    textContent: 'Quên mật khẩu? Lấy mã xác minh qua email rồi đặt mật khẩu mới.',
    steps: [
      {
        title: 'Bước 1: Nhập email và gửi mã xác minh',
        body:
          'Nhập đúng email bạn đã dùng để đăng ký tài khoản, rồi bấm "Gửi mã xác minh".\n\n' +
          'Hệ thống sẽ gửi mã xác minh về email đó. Kiểm tra cả hộp thư rác nếu không thấy.',
        imageUrl: '/help/forgot-s1.jpg',
        targetSelector: '[data-help-id="btn-send-reset-code"]',
      },
      {
        title: 'Bước 2: Nhập mã xác minh',
        body:
          'Mở email, lấy mã xác minh và nhập vào trang. Mã có hiệu lực giới hạn — ' +
          'nếu hết hạn, bấm gửi lại mã mới.',
      },
      {
        title: 'Bước 3: Đặt mật khẩu mới',
        body:
          'Nhập mật khẩu mới 2 lần (mật khẩu và xác nhận) cho khớp nhau, rồi bấm "Đặt lại mật khẩu".\n\n' +
          'Xong! Quay lại trang đăng nhập và đăng nhập bằng mật khẩu mới.',
      },
    ],
  },
  {
    pagePath: '/complete-profile',
    title: 'Hoàn thiện hồ sơ',
    roles: [],
    textContent: 'Bổ sung thông tin hồ sơ còn thiếu để dùng đầy đủ tính năng.',
    steps: [
      {
        title: 'Bước 1: Điền thông tin còn thiếu',
        body:
          'Trang này hiện các thông tin hồ sơ bạn chưa bổ sung (tên, số điện thoại, mật khẩu...).\n\n' +
          'Điền đầy đủ và chính xác — tên và số điện thoại dùng để đối soát thanh toán ' +
          'và liên lạc khi cần.',
      },
      {
        title: 'Bước 2: Lưu hồ sơ',
        body:
          'Bấm nút lưu ở cuối form để hoàn tất.\n\n' +
          'Sau khi hoàn thiện hồ sơ, bạn có thể đăng ký khóa học và dùng đầy đủ tính năng.',
        targetSelector: '[data-help-id="btn-save-profile"]',
      },
    ],
  },
  {
    pagePath: '/admin/security/mfa',
    title: 'Bật xác thực 2 lớp (MFA)',
    roles: ['ADMIN'],
    textContent: 'Bật MFA cho tài khoản quản trị bằng ứng dụng Authenticator.',
    steps: [
      {
        title: 'Bước 1: Bấm Thiết lập Authenticator',
        body:
          'Bấm nút "Thiết lập Authenticator". Hệ thống sẽ sinh một khóa bí mật và mã QR.\n\n' +
          'Cài sẵn ứng dụng Google Authenticator hoặc Microsoft Authenticator trên điện thoại.',
        targetSelector: '[data-help-id="btn-setup-mfa"]',
      },
      {
        title: 'Bước 2: Thêm khóa vào ứng dụng',
        body:
          'Mở ứng dụng Authenticator, chọn thêm tài khoản bằng cách nhập khóa thiết lập ' +
          '(hoặc quét mã QR hiện trên màn hình).\n\n' +
          'Ứng dụng sẽ hiện mã 6 số thay đổi mỗi 30 giây.',
      },
      {
        title: 'Bước 3: Nhập mã để kích hoạt',
        body:
          'Nhập mã 6 số đang hiện trong ứng dụng vào ô xác nhận, rồi bấm "Xác nhận và bật MFA".\n\n' +
          'Từ nay mỗi lần đăng nhập, ngoài mật khẩu bạn cần nhập thêm mã từ ứng dụng. ' +
          'Muốn tắt thì quay lại trang này và bấm "Xác nhận và tắt MFA".',
      },
    ],
  },
  {
    pagePath: '/tools/payments',
    title: 'Tổng quan quản lý thanh toán',
    roles: ['ADMIN'],
    textContent: 'Trung tâm quản lý thanh toán: theo dõi giao dịch, đối soát tay và cấu hình tự động.',
    steps: [
      {
        title: 'Bước 1: Theo dõi giao dịch tiền về',
        body:
          'Trang này liệt kê các giao dịch thanh toán của hệ thống. ' +
          'Bạn xem được số tiền, nội dung chuyển khoản, trạng thái khớp/không khớp của từng giao dịch.',
      },
      {
        title: 'Bước 2: Xử lý giao dịch chưa khớp',
        body:
          'Bấm nút "Giao dịch chưa khớp (đối soát tay)" màu cam ở đầu trang để sang trang xử lý ' +
          'những giao dịch tiền đã về nhưng hệ thống không tự khớp được — gán tay vào đúng enrollment.',
        targetSelector: '[data-help-id="link-unmatched"]',
      },
      {
        title: 'Bước 3: Cấu hình tự động xác minh',
        body:
          'Bấm nút "Cấu hình tự động xác minh" màu xanh để sang trang bật/tắt quét giao dịch ' +
          'tự động theo từng khóa học.\n\n' +
          'Quy trình chuẩn khi setup giảng viên mới: Tài khoản ngân hàng → Đối soát tự động → ' +
          'xử lý Giao dịch chưa khớp (nếu có).',
        targetSelector: '[data-help-id="link-auto-verify"]',
      },
    ],
  },
  {
    pagePath: '/tools/vouchers',
    title: 'Quản lý voucher',
    roles: ['ADMIN'],
    textContent: 'Tạo và quản lý mã voucher giảm giá, gắn với khóa học.',
    steps: [
      {
        title: 'Bước 1: Bấm Tạo Voucher mới',
        body:
          'Bấm nút "Tạo Voucher mới" ở góc phải phía trên trang để mở form tạo voucher.',
        targetSelector: '[data-help-id="btn-create-voucher"]',
      },
      {
        title: 'Bước 2: Điền thông tin voucher',
        body:
          'Điền các thông tin:\n\n' +
          '- Mã voucher (bắt buộc): mã ngắn gọn, viết hoa không dấu, ví dụ VIP001.\n' +
          '- Tên (bắt buộc): tên hiển thị, ví dụ "Voucher VIP MB1".\n' +
          '- Loại: All Access (dùng chung), VIP hoặc CASH.\n' +
          '- Giá trị (đ): số tiền được giảm.\n' +
          '- Thời hạn (ngày): bỏ trống nghĩa là không giới hạn.\n\n' +
          'Rồi bấm "Tạo" để lưu.',
      },
      {
        title: 'Bước 3: Gắn voucher với khóa học',
        body:
          'Ở mỗi dòng voucher, bấm nút "Khóa" để mở quản lý liên kết: chọn voucher này ' +
          'được tặng kèm (award) hoặc được chấp nhận (accepted) ở những khóa học nào.\n\n' +
          'Muốn xóa voucher thì bấm biểu tượng thùng rác và xác nhận 2 lần.',
      },
    ],
  },
  {
    pagePath: '/tools/courses',
    title: 'Quản lý khóa học',
    roles: ['ADMIN'],
    textContent: 'Danh sách toàn bộ khóa học: tạo mới, sửa, xem trang nội dung, quản lý học phí.',
    steps: [
      {
        title: 'Bước 1: Tìm khóa học',
        body:
          'Dùng ô tìm kiếm để lọc theo tên lớp, mã khóa hoặc giảng viên.\n\n' +
          'Mỗi dòng hiện thông tin cơ bản: tên lớp, mã khóa, giảng viên, học phí và trạng thái.',
      },
      {
        title: 'Bước 2: Tạo khóa học mới',
        body:
          'Bấm nút "+" màu vàng ở đầu trang để sang trang tạo khóa học mới.\n\n' +
          'Có bài hướng dẫn chi tiết từng bước ở trang tạo khóa học (bấm nút "?" ở đó).',
        targetSelector: '[data-help-id="link-new-course"]',
      },
      {
        title: 'Bước 3: Quản lý nội dung và học phí',
        body:
          'Ở mỗi dòng khóa học có các nút thao tác:\n\n' +
          '- Xem trang nội dung (biểu tượng trang): mở trình soạn thảo nội dung từng buổi học.\n' +
          '- Sửa: mở lại form tạo để chỉnh thông tin, học phí, tài khoản nhận tiền.\n' +
          '- Xem trang bán: mở trang khóa học mà học viên nhìn thấy.',
      },
    ],
  },
  {
    pagePath: '/tools/courses/[id]/lib-access',
    title: 'Cấp quyền truy cập tài liệu',
    roles: ['ADMIN'],
    textContent: 'Cấp quyền xem tài liệu khóa học cho email cụ thể.',
    steps: [
      {
        title: 'Bước 1: Nhập email cần cấp quyền',
        body:
          'Nhập địa chỉ email của người cần xem tài liệu vào ô "Thêm Email".\n\n' +
          'Người này không cần là học viên của khóa — phù hợp khi muốn chia sẻ tài liệu ' +
          'cho khách mời, trợ giảng hoặc đối tác.',
      },
      {
        title: 'Bước 2: Bấm Thêm',
        body:
          'Bấm nút "Thêm" để cấp quyền. Email sẽ xuất hiện trong danh sách bên dưới.\n\n' +
          'Muốn thu hồi thì bấm nút xóa ở dòng email đó.',
        targetSelector: '[data-help-id="btn-add-lib-email"]',
      },
    ],
  },
  {
    pagePath: '/tools/courses/pages/[id]',
    title: 'Soạn trang nội dung khóa học',
    roles: ['ADMIN'],
    textContent: 'Soạn nội dung hiển thị cho từng trang/bài của khóa học.',
    steps: [
      {
        title: 'Bước 1: Chọn trang cần soạn',
        body:
          'Danh sách hiện các trang nội dung của khóa học. Bấm vào trang muốn chỉnh sửa.',
      },
      {
        title: 'Bước 2: Soạn nội dung',
        body:
          'Dùng trình soạn thảo để viết nội dung: văn bản, hình ảnh, video, file đính kèm.\n\n' +
          'Nội dung nên chia theo buổi học để học viên dễ theo dõi.',
      },
      {
        title: 'Bước 3: Xuất bản',
        body:
          'Bấm xuất bản để nội dung hiện với học viên. Có thể lưu nháp và xuất bản sau.\n\n' +
          'Kiểm tra lại bằng cách mở trang khóa học ở chế độ xem trước.',
      },
    ],
  },
  {
    pagePath: '/tools/courses/templates',
    title: 'Mẫu khóa học',
    roles: ['ADMIN'],
    textContent: 'Dùng mẫu có sẵn để tạo khóa học nhanh.',
    steps: [
      {
        title: 'Bước 1: Chọn mẫu phù hợp',
        body:
          'Duyệt danh sách mẫu khóa học theo loại: workshop, khóa dài ngày, thử thách...\n\n' +
          'Mỗi mẫu đã có sẵn cấu trúc buổi học, nội dung gợi ý và cấu hình học phí mẫu.',
      },
      {
        title: 'Bước 2: Tạo khóa từ mẫu',
        body:
          'Bấm dùng mẫu để tạo khóa học mới với toàn bộ cấu trúc được copy sang.\n\n' +
          'Sau đó chỉnh lại tên lớp, mã khóa, giảng viên, học phí và nội dung cho phù hợp.',
      },
    ],
  },
  {
    pagePath: '/khoa-hoc',
    title: 'Khám phá khóa học',
    roles: [],
    textContent: 'Xem danh sách khóa học đang mở và chọn khóa phù hợp.',
    steps: [
      {
        title: 'Bước 1: Duyệt danh sách khóa học',
        body:
          'Trang hiện các khóa học đang mở đăng ký, mỗi thẻ có tên lớp, mô tả ngắn, ' +
          'học phí và thông tin giảng viên.',
      },
      {
        title: 'Bước 2: Xem chi tiết khóa học',
        body:
          'Bấm vào khóa học để xem chi tiết: nội dung các buổi, lịch học, học phí, ' +
          'chính sách và đánh giá của học viên cũ.',
      },
      {
        title: 'Bước 3: Đăng ký',
        body:
          'Bấm nút Đăng ký trên trang chi tiết để bắt đầu luồng đăng ký và thanh toán.\n\n' +
          'Có bài hướng dẫn chi tiết ở trang chi tiết khóa học (bấm nút "?" ở đó).',
      },
    ],
  },
  {
    pagePath: '/courses/[id]/learn',
    title: 'Học khóa học của bạn',
    roles: ['STUDENT'],
    textContent: 'Cách học: xem video, đọc tài liệu, theo dõi tiến độ.',
    steps: [
      {
        title: 'Bước 1: Chọn bài học',
        body:
          'Danh sách bài học hiện theo thứ tự. Bấm vào bài muốn học để mở trình phát.\n\n' +
          'Nên học theo đúng thứ tự vì kiến thức các buổi liên quan nhau.',
      },
      {
        title: 'Bước 2: Xem video và tài liệu',
        body:
          'Xem video bài giảng ngay trong trình phát. Tài liệu đính kèm (nếu có) ' +
          'hiện bên dưới video để tải về hoặc đọc trực tiếp.',
      },
      {
        title: 'Bước 3: Theo dõi tiến độ',
        body:
          'Hệ thống tự ghi nhận bài bạn đã xem. Bài hoàn thành sẽ được đánh dấu ' +
          'để bạn biết mình đang học tới đâu.',
      },
    ],
  },
  {
    pagePath: '/tools/crm',
    title: 'CRM chăm sóc khách hàng',
    roles: ['ADMIN'],
    textContent: 'Quản lý và chăm sóc khách hàng tiềm năng theo pipeline.',
    steps: [
      {
        title: 'Bước 1: Hiểu không gian làm việc CRM',
        body:
          'CRM hiển thị danh sách khách hàng được phân công cho bạn, sắp xếp theo giai đoạn ' +
          '(mới, đang tư vấn, đã đăng ký...).\n\n' +
          'Nếu báo "chưa được cấp quyền", liên hệ quản trị viên để được phân công.',
      },
      {
        title: 'Bước 2: Chăm sóc từng khách',
        body:
          'Bấm vào khách hàng để xem lịch sử tương tác, ghi chú và cập nhật giai đoạn.\n\n' +
          'Ghi chú đầy đủ sau mỗi lần liên lạc để người khác tiếp quản cũng nắm được tình hình.',
      },
      {
        title: 'Bước 3: Chuyển giai đoạn',
        body:
          'Khi khách tiến triển (ví dụ từ "đang tư vấn" sang "đã đăng ký"), ' +
          'kéo hoặc cập nhật giai đoạn cho đúng để báo cáo chính xác.',
      },
    ],
  },
  {
    pagePath: '/tools/students',
    title: 'Quản lý học viên',
    roles: ['ADMIN'],
    textContent: 'Tìm kiếm, xem chi tiết và quản lý học viên.',
    steps: [
      {
        title: 'Bước 1: Tìm học viên',
        body:
          'Dùng ô tìm kiếm để tìm theo tên, số điện thoại hoặc email.\n\n' +
          'Kết quả hiện ngay khi gõ, không cần bấm tìm.',
      },
      {
        title: 'Bước 2: Xem chi tiết học viên',
        body:
          'Bấm vào học viên để xem chi tiết: thông tin cá nhân, mã thành viên, ' +
          'các khóa đã đăng ký và trạng thái từng enrollment.',
      },
      {
        title: 'Bước 3: Lấy ID enrollment khi cần',
        body:
          'Khi cần gán tay giao dịch ở trang "Giao dịch chưa khớp", lấy ID enrollment ' +
          'tại trang chi tiết này — đó là con số cần nhập vào ô "ID enrollment".',
      },
    ],
  },
  {
    pagePath: '/tools/my-site/manage',
    title: 'Quản trị website cá nhân',
    roles: ['ADMIN', 'INSTRUCTOR'],
    textContent: 'Quản lý website cá nhân: trang, giao diện, tên miền, form.',
    steps: [
      {
        title: 'Bước 1: Hiểu các mục quản trị',
        body:
          'Mục "Website của tôi" gồm: Trang (danh sách trang), Giao diện (màu sắc, bố cục), ' +
          'Tên miền (domain riêng), Form (form thu thập thông tin), Dữ liệu.\n\n' +
          'Mỗi mục là một trang con — bấm vào để quản lý chi tiết.',
      },
      {
        title: 'Bước 2: Chỉnh sửa trang',
        body:
          'Vào mục Trang, chọn trang muốn sửa để mở trình chỉnh sửa.\n\n' +
          'Thay đổi được lưu tự động hoặc theo nút lưu tùy trang — kiểm tra lại ' +
          'bằng cách mở website ở chế độ xem trước.',
      },
      {
        title: 'Bước 3: Gắn tên miền riêng',
        body:
          'Vào mục Tên miền để thêm domain riêng cho website của bạn.\n\n' +
          'Làm theo hướng dẫn trỏ DNS được hiện trên trang — thường mất vài giờ để có hiệu lực.',
      },
    ],
  },
  {
    pagePath: '/tools/landings/new',
    title: 'Tạo landing page mới',
    roles: ['ADMIN'],
    textContent: 'Tạo trang landing giới thiệu sản phẩm/khóa học.',
    steps: [
      {
        title: 'Bước 1: Điền thông tin cơ bản',
        body:
          'Điền tiêu đề, đường dẫn (slug) và mô tả ngắn cho landing page.\n\n' +
          'Đường dẫn nên ngắn gọn, không dấu, ví dụ "khoa-hoc-brk01".',
      },
      {
        title: 'Bước 2: Soạn nội dung',
        body:
          'Thêm các khối nội dung: tiêu đề lớn, lợi ích, hình ảnh, video, ' +
          'đánh giá học viên và nút kêu gọi hành động.\n\n' +
          'Sắp xếp theo thứ tự: thu hút → chứng minh → kêu gọi đăng ký.',
      },
      {
        title: 'Bước 3: Xuất bản',
        body:
          'Bấm xuất bản để landing page hoạt động với đường dẫn đã đặt.\n\n' +
          'Có thể sửa lại bất cứ lúc nào mà không mất đường dẫn.',
      },
    ],
  },
  {
    pagePath: '/tools/pages',
    title: 'Quản lý trang',
    roles: ['ADMIN'],
    textContent: 'Tạo và quản lý các trang nội dung của website.',
    steps: [
      {
        title: 'Bước 1: Xem danh sách trang',
        body:
          'Danh sách hiện tất cả trang: trang chủ, giới thiệu, chính sách...\n\n' +
          'Mỗi trang hiện trạng thái (đã xuất bản hay nháp) và đường dẫn.',
      },
      {
        title: 'Bước 2: Tạo hoặc sửa trang',
        body:
          'Bấm tạo mới hoặc bấm vào trang có sẵn để mở trình soạn thảo.\n\n' +
          'Soạn nội dung xong thì xuất bản để hiện ra website.',
      },
    ],
  },
  {
    pagePath: '/tools/posts',
    title: 'Đăng bài viết cộng đồng',
    roles: ['ADMIN'],
    textContent: 'Viết và quản lý bài đăng trên bảng tin cộng đồng.',
    steps: [
      {
        title: 'Bước 1: Bấm Đăng bài',
        body:
          'Bấm nút "Đăng bài" ở góc phải phía trên để mở form viết bài.',
        targetSelector: '[data-help-id="btn-new-post"]',
      },
      {
        title: 'Bước 2: Viết nội dung',
        body:
          'Nhập tiêu đề và nội dung bài viết. Có thể đính kèm hình ảnh minh họa.\n\n' +
          'Viết ngắn gọn, rõ ý — bài dài nên chia đoạn và dùng tiêu đề phụ.',
      },
      {
        title: 'Bước 3: Đăng hoặc lưu',
        body:
          'Bấm "Đăng bài viết" để đăng ngay lên bảng tin.\n\n' +
          'Muốn sửa bài đã đăng thì bấm nút "Sửa" ở bài viết đó.',
      },
    ],
  },
  {
    pagePath: '/tools/site-profiles/new',
    title: 'Tạo hồ sơ site mới',
    roles: ['ADMIN'],
    textContent: 'Tạo hồ sơ website mới cho thương hiệu/chi nhánh.',
    steps: [
      {
        title: 'Bước 1: Điền thông tin hồ sơ',
        body:
          'Điền tên thương hiệu, mô tả, logo và thông tin liên hệ cho site mới.\n\n' +
          'Thông tin này hiện ở header, footer và trang giới thiệu của site.',
      },
      {
        title: 'Bước 2: Cấu hình giao diện',
        body:
          'Chọn màu sắc, ảnh bìa phù hợp với thương hiệu.\n\n' +
          'Có thể xem trước giao diện trước khi lưu.',
      },
      {
        title: 'Bước 3: Lưu và kích hoạt',
        body:
          'Lưu hồ sơ. Sau đó vào mục Tên miền để gắn domain cho site này nếu cần.',
      },
    ],
  },
  {
    pagePath: '/tools/settings',
    title: 'Cài đặt hệ thống',
    roles: ['ADMIN'],
    textContent: 'Cấu hình chung: giao diện, thông báo và các tùy chọn hệ thống.',
    steps: [
      {
        title: 'Bước 1: Chọn mục cài đặt',
        body:
          'Trang cài đặt chia thành các mục: chung, giao diện (theme), tooltip...\n\n' +
          'Bấm vào từng mục để xem các tùy chọn bên trong.',
      },
      {
        title: 'Bước 2: Thay đổi và lưu',
        body:
          'Thay đổi giá trị rồi bấm lưu. Một số cài đặt áp dụng ngay, ' +
          'một số cần tải lại trang mới có hiệu lực.',
      },
    ],
  },
  {
    pagePath: '/tools/wi-appearance',
    title: 'Chỉnh giao diện Wi',
    roles: ['ADMIN'],
    textContent: 'Tùy chỉnh giao diện hiển thị của nền tảng Wi.',
    steps: [
      {
        title: 'Bước 1: Xem trước giao diện',
        body:
          'Trang hiện bản xem trước giao diện trên các kích thước màn hình ' +
          '(máy tính, máy tính bảng, điện thoại).',
      },
      {
        title: 'Bước 2: Chỉnh sửa',
        body:
          'Thay đổi màu sắc, logo, bố cục theo ý muốn. Mọi thay đổi hiện ngay ' +
          'trên bản xem trước để bạn kiểm tra.',
      },
      {
        title: 'Bước 3: Lưu bản chính thức',
        body:
          'Khi ưng ý, bấm lưu để áp dụng cho toàn bộ nền tảng.\n\n' +
          'Hệ thống giữ bản nháp riêng nên bạn có thể thử nghiệm thoải mái.',
      },
    ],
  },
  {
    pagePath: '/support',
    title: 'Gửi yêu cầu hỗ trợ',
    roles: [],
    textContent: 'Cần giúp đỡ? Gửi yêu cầu hỗ trợ tại đây.',
    steps: [
      {
        title: 'Bước 1: Mô tả vấn đề',
        body:
          'Điền form hỗ trợ: chọn loại vấn đề và mô tả chi tiết điều bạn đang gặp.\n\n' +
          'Mô tả càng cụ thể (đang làm gì, thấy lỗi gì, từ khi nào) thì được hỗ trợ càng nhanh.',
      },
      {
        title: 'Bước 2: Gửi và theo dõi',
        body:
          'Bấm gửi. Yêu cầu của bạn được chuyển cho bộ phận phù hợp.\n\n' +
          'Bấm "Xem yêu cầu của tôi" để theo dõi trạng thái xử lý.\n\n' +
          'Lưu ý: câu hỏi về bài học nên gửi từ trong khóa học để giáo viên tiếp nhận đúng nội dung.',
      },
    ],
  },
  {
    pagePath: '/my-space',
    title: 'Không gian cá nhân của bạn',
    roles: [],
    textContent: 'Trang tổng hợp: khóa học đang học, tiến độ, thông báo.',
    steps: [
      {
        title: 'Bước 1: Xem khóa học đang học',
        body:
          'Danh sách các khóa bạn đã đăng ký, kèm tiến độ học từng khóa.\n\n' +
          'Bấm vào khóa để tiếp tục học từ bài đang dở.',
      },
      {
        title: 'Bước 2: Theo dõi thông báo',
        body:
          'Các thông báo mới (kích hoạt khóa học, bài học mới, tin nhắn...) hiện ở đây.\n\n' +
          'Nên kiểm tra thường xuyên để không bỏ lỡ.',
      },
    ],
  },
  {
    pagePath: '/tools/affiliate',
    title: 'Tiếp thị liên kết (Affiliate)',
    roles: ['ADMIN', 'AFFILIATE'],
    textContent: 'Chia sẻ link giới thiệu, theo dõi click/chuyển đổi và hoa hồng.',
    steps: [
      {
        title: 'Bước 1: Lấy link giới thiệu',
        body:
          'Mỗi chiến dịch affiliate có một link giới thiệu riêng của bạn.\n\n' +
          'Bấm nút "Copy" để sao chép link, rồi chia sẻ lên Facebook, Zalo, website...\n\n' +
          'Ai bấm vào link của bạn và đăng ký thì được tính là giới thiệu của bạn.',
        targetSelector: '[data-help-id="btn-copy-affiliate-link"]',
      },
      {
        title: 'Bước 2: Theo dõi hiệu quả',
        body:
          'Các tab Clicks và Conversions cho biết có bao nhiêu người bấm link ' +
          'và bao nhiêu người đã chuyển đổi thành đăng ký/học viên.',
      },
      {
        title: 'Bước 3: Nhận hoa hồng',
        body:
          'Hoa hồng được tính theo chính sách từng chiến dịch và hiện ở tab Payouts.\n\n' +
          'Đủ điều kiện rút thì tạo yêu cầu rút tiền theo hướng dẫn trên trang.',
      },
    ],
  },
  {
    pagePath: '/tools/email-mkt',
    title: 'Gửi email marketing',
    roles: ['ADMIN', 'INSTRUCTOR'],
    textContent: 'Tạo và gửi chiến dịch email cho học viên/khách hàng.',
    steps: [
      {
        title: 'Bước 1: Bấm Tạo Mới',
        body:
          'Bấm nút "+ Tạo Mới" ở góc phải để sang trang soạn chiến dịch email mới.',
      },
      {
        title: 'Bước 2: Soạn email',
        body:
          'Điền tiêu đề email (dòng này quyết định người ta có mở mail không), ' +
          'chọn danh sách người nhận và soạn nội dung.\n\n' +
          'Nội dung nên ngắn gọn, có 1 lời kêu gọi hành động rõ ràng.',
      },
      {
        title: 'Bước 3: Gửi hoặc lên lịch',
        body:
          'Kiểm tra lại danh sách nhận và nội dung, rồi bấm gửi ngay hoặc đặt lịch gửi.\n\n' +
          'Sau khi gửi, quay lại trang danh sách để xem tỉ lệ mở và bấm link.',
      },
    ],
  },
  {
    pagePath: '/tools/youtube-tools',
    title: 'Công cụ YouTube',
    roles: ['ADMIN', 'INSTRUCTOR'],
    textContent: 'Kết nối YouTube và dùng các công cụ hỗ trợ video.',
    steps: [
      {
        title: 'Bước 1: Kết nối tài khoản YouTube',
        body:
          'Nếu thấy thông báo "Cần kết nối tài khoản YouTube", bấm "Click để kết nối ngay" ' +
          'và cho phép quyền truy cập.\n\n' +
          'Kết nối xong mới dùng được các công cụ bên dưới.',
      },
      {
        title: 'Bước 2: Dùng công cụ',
        body:
          'Chọn công cụ cần dùng (tải video, lấy thông tin...) và làm theo hướng dẫn từng mục.\n\n' +
          'Kết quả thường cho tải về hoặc copy để dùng tiếp.',
      },
    ],
  },
  {
    pagePath: '/tools/brk/wallet',
    title: 'Ví BRK của bạn',
    roles: [],
    textContent: 'Xem số dư, lịch sử giao dịch ví BRK.',
    steps: [
      {
        title: 'Bước 1: Xem số dư và lịch sử',
        body:
          'Trang hiện số dư ví BRK hiện tại và lịch sử các giao dịch cộng/trừ.\n\n' +
          'BRK dùng để trừ khi thanh toán khóa học (nếu khóa học cho phép) và nhận thưởng.',
      },
      {
        title: 'Bước 2: Hiểu các loại giao dịch',
        body:
          'Mỗi dòng lịch sử ghi rõ loại giao dịch (thưởng, trừ khi mua khóa, hoàn...), ' +
          'số tiền và thời gian.\n\n' +
          'Thắc mắc về giao dịch nào thì đối chiếu với trang mua khóa/voucher tương ứng.',
      },
    ],
  },
  {
    pagePath: '/tools/genealogy',
    title: 'Cây hệ thống',
    roles: ['ADMIN'],
    textContent: 'Xem sơ đồ cây hệ thống thành viên theo tuyến dưới.',
    steps: [
      {
        title: 'Bước 1: Xem cây hệ thống',
        body:
          'Trang hiện sơ đồ cây: bạn ở trên cùng, các thành viên tuyến dưới xếp theo tầng (F1, F2...).\n\n' +
          'Bấm vào từng người để mở rộng xem tuyến dưới của họ.',
      },
      {
        title: 'Bước 2: Tìm thành viên',
        body:
          'Dùng ô tìm kiếm để nhảy nhanh tới một thành viên trong cây thay vì mở từng nhánh.',
      },
    ],
  },
  {
    pagePath: '/tools/backup',
    title: 'Sao lưu và khôi phục dữ liệu',
    roles: ['ADMIN'],
    textContent: 'Tạo bản sao lưu dữ liệu và khôi phục khi cần.',
    steps: [
      {
        title: 'Bước 1: Tạo bản sao lưu',
        body:
          'Bấm tạo bản sao lưu mới trước mỗi lần thay đổi lớn (nâng cấp, dọn dữ liệu...).\n\n' +
          'Hệ thống lưu bản sao kèm thời gian, dung lượng và số bản ghi.',
      },
      {
        title: 'Bước 2: Tải về hoặc khôi phục',
        body:
          'Mỗi bản sao lưu có nút tải về máy và nút khôi phục (Restore).\n\n' +
          'Cảnh báo: khôi phục sẽ ghi đè dữ liệu hiện tại bằng bản sao lưu — ' +
          'chỉ làm khi chắc chắn và nên sao lưu hiện tại trước.',
      },
    ],
  },
  {
    pagePath: '/tools/roadmap',
    title: 'Quản lý khảo sát',
    roles: ['ADMIN'],
    textContent: 'Tạo và quản lý các bản khảo sát thu thập ý kiến.',
    steps: [
      {
        title: 'Bước 1: Bấm Tạo mới',
        body:
          'Bấm nút "Tạo mới" để bắt đầu tạo một bản khảo sát.',
        targetSelector: '[data-help-id="btn-new-survey"]',
      },
      {
        title: 'Bước 2: Soạn câu hỏi',
        body:
          'Thêm các câu hỏi cho khảo sát: câu hỏi trắc nghiệm, tự luận...\n\n' +
          'Sắp xếp câu hỏi theo thứ tự hợp lý: dễ trước, khó sau.',
      },
      {
        title: 'Bước 3: Kích hoạt và xem kết quả',
        body:
          'Bấm "Kích hoạt" để mở khảo sát cho người dùng trả lời.\n\n' +
          'Kết quả trả lời được tổng hợp để bạn xem và phân tích.',
      },
    ],
  },
  {
    pagePath: '/tools/apps',
    title: 'Quản lý ứng dụng',
    roles: ['ADMIN'],
    textContent: 'Xem và quản lý các ứng dụng tích hợp trong hệ thống.',
    steps: [
      {
        title: 'Bước 1: Xem danh sách ứng dụng',
        body:
          'Trang liệt kê các ứng dụng/tích hợp có trong hệ thống cùng trạng thái ' +
          'đang bật hay tắt của từng ứng dụng.',
      },
      {
        title: 'Bước 2: Bật/tắt ứng dụng',
        body:
          'Bấm vào ứng dụng để xem chi tiết và bật/tắt khi cần.\n\n' +
          'Tắt ứng dụng không dùng đến để giao diện gọn hơn.',
      },
    ],
  },
  {
    pagePath: '/tools/ho-tro',
    title: 'Quản trị trợ lý hướng dẫn',
    roles: ['ADMIN'],
    textContent: 'Soạn và quản lý các bài hướng dẫn của Trợ lý (chính là trang này).',
    steps: [
      {
        title: 'Bước 1: Thêm bài hướng dẫn mới',
        body:
          'Bấm "Thêm guide", điền đường dẫn trang (ví dụ /tools/vouchers), tiêu đề ' +
          'và chọn vai trò được xem (bỏ trống nghĩa là mọi vai trò).\n\n' +
          'Bài hướng dẫn sẽ hiện khi người dùng bấm nút "?" ở đúng trang đó.',
      },
      {
        title: 'Bước 2: Thêm từng bước',
        body:
          'Bấm biểu tượng danh sách ở cột Thao tác để quản lý các bước của bài.\n\n' +
          'Mỗi bước gồm: tiêu đề, nội dung chi tiết, ảnh minh họa, video và ' +
          '"target selector" — selector của nút cần khoanh sáng ở chế độ "Dẫn tôi làm" ' +
          '(ví dụ [data-help-id="btn-add"]). Dùng nút lên/xuống để sắp xếp thứ tự.',
      },
      {
        title: 'Bước 3: Kiểm tra ngoài trang thật',
        body:
          'Ra đúng trang vừa thêm guide, bấm nút "?" để xem bài hiển thị như người dùng thấy.\n\n' +
          'Thử cả chế độ "Dẫn tôi làm" để chắc các selector khoanh đúng chỗ.',
      },
    ],
  },
  // ===== Đợt bổ sung 2026-10-14: phủ kín mọi giao diện wi300 =====
  {
    pagePath: '/',
    title: 'Trang chủ wi300.vn',
    roles: [],
    textContent: 'Tổng quan hệ sinh thái Wi: dự án, khóa học, sản phẩm, dịch vụ, giảng viên.',
    steps: [
      {
        title: 'Bước 1: Xem mục "Bắt đầu cùng Wi"',
        body:
          'Ngay dưới phần giới thiệu là mục "Bắt đầu cùng Wi" liệt kê tối đa 8 dự án nổi bật.\n\n' +
          'Bấm vào từng thẻ dự án để xem chi tiết.',
      },
      {
        title: 'Bước 2: Duyệt khóa học, sản phẩm và dịch vụ',
        body:
          'Cuộn xuống để xem các khu vực Khóa học, Sản phẩm và Dịch vụ.\n\n' +
          'Dùng bộ lọc danh mục để tìm nhanh thứ bạn cần.',
      },
      {
        title: 'Bước 3: Tìm hiểu giảng viên và kiến thức',
        body:
          'Khu vực Giảng viên giới thiệu đội ngũ đồng hành cùng bạn.\n\n' +
          'Khu vực Kiến thức tổng hợp bài viết, tài liệu hữu ích.',
      },
    ],
  },
  {
    pagePath: '/dich-vu',
    title: 'Dịch vụ',
    roles: [],
    textContent: 'Danh mục các dịch vụ trong hệ sinh thái Wi.',
    steps: [
      {
        title: 'Bước 1: Duyệt danh sách dịch vụ',
        body:
          'Trang liệt kê toàn bộ dịch vụ đang cung cấp kèm mô tả ngắn.\n\n' +
          'Dùng ô tìm kiếm hoặc bộ lọc để thu hẹp danh sách.',
      },
      {
        title: 'Bước 2: Xem chi tiết dịch vụ',
        body:
          'Bấm vào dịch vụ để xem mô tả đầy đủ, quyền lợi và điều kiện áp dụng.',
      },
      {
        title: 'Bước 3: Liên hệ đăng ký',
        body:
          'Bấm nút liên hệ/đăng ký trên trang chi tiết và điền thông tin.\n\n' +
          'Đội ngũ Wi sẽ phản hồi yêu cầu của bạn.',
      },
    ],
  },
  {
    pagePath: '/doi-tac',
    title: 'Đối tác',
    roles: [],
    textContent: 'Mạng lưới đối tác đồng hành cùng Wi300.',
    steps: [
      {
        title: 'Bước 1: Xem danh sách đối tác',
        body:
          'Trang giới thiệu các đối tác đang đồng hành cùng hệ sinh thái Wi.',
      },
      {
        title: 'Bước 2: Xem hồ sơ đối tác',
        body:
          'Bấm vào từng đối tác để xem lĩnh vực hoạt động và cách thức hợp tác.',
      },
      {
        title: 'Bước 3: Đăng ký trở thành đối tác',
        body:
          'Điền form đăng ký đối tác với thông tin đơn vị của bạn.\n\n' +
          'Wi sẽ liên hệ trao đổi sau khi nhận hồ sơ.',
      },
    ],
  },
  {
    pagePath: '/du-an',
    title: 'Dự án Wi',
    roles: [],
    textContent: 'Danh sách các dự án trong hệ sinh thái Wi.',
    steps: [
      {
        title: 'Bước 1: Duyệt danh sách dự án',
        body:
          'Trang liệt kê các dự án Wi dưới dạng thẻ ngang theo nhận diện thương hiệu.\n\n' +
          'Dùng bộ lọc để tìm dự án theo lĩnh vực bạn quan tâm.',
      },
      {
        title: 'Bước 2: Mở chi tiết dự án',
        body:
          'Bấm vào thẻ dự án để xem tổng quan, đội ngũ và các khóa học, sản phẩm, dịch vụ liên kết.',
      },
      {
        title: 'Bước 3: Tham gia dự án',
        body:
          'Trên trang chi tiết có nút tham gia/liên hệ.\n\n' +
          'Điền thông tin để được kết nối với chủ dự án.',
      },
    ],
  },
  {
    pagePath: '/du-an/[slug]',
    title: 'Chi tiết dự án Wi',
    roles: [],
    textContent: 'Hồ sơ chi tiết của một dự án Wi: tổng quan, đội ngũ, nội dung liên kết.',
    steps: [
      {
        title: 'Bước 1: Đọc tổng quan dự án',
        body:
          'Phần đầu trang giới thiệu mục tiêu, giá trị và hình ảnh nhận diện của dự án.',
      },
      {
        title: 'Bước 2: Xem khóa học, sản phẩm, dịch vụ liên kết',
        body:
          'Bảng nội dung liên kết ở trung tâm trang liệt kê mọi thứ thuộc dự án.\n\n' +
          'Bấm vào từng mục để xem chi tiết và đăng ký.',
      },
      {
        title: 'Bước 3: Gặp đội ngũ dự án',
        body:
          'Phần đội ngũ giới thiệu những người đứng sau dự án.\n\n' +
          'Bấm vào hồ sơ để xem thêm thông tin giảng viên/chủ dự án.',
      },
    ],
  },
  {
    pagePath: '/giang-vien',
    title: 'Giảng viên',
    roles: [],
    textContent: 'Đội ngũ giảng viên đồng hành trong hệ sinh thái Wi.',
    steps: [
      {
        title: 'Bước 1: Duyệt danh sách giảng viên',
        body:
          'Trang hiển thị giảng viên dưới dạng slide (5 thẻ mỗi lượt) và có trang danh sách đầy đủ.\n\n' +
          'Dùng tìm kiếm hoặc bộ lọc để tìm giảng viên theo chuyên môn.',
      },
      {
        title: 'Bước 2: Xem hồ sơ giảng viên',
        body:
          'Bấm vào thẻ giảng viên để xem tiểu sử, chuyên môn và kinh nghiệm.',
      },
      {
        title: 'Bước 3: Xem khóa học của giảng viên',
        body:
          'Trong hồ sơ có danh sách khóa học do giảng viên trực tiếp giảng dạy.\n\n' +
          'Bấm vào khóa học để xem chi tiết và đăng ký.',
      },
    ],
  },
  {
    pagePath: '/gioi-thieu',
    title: 'Giới thiệu',
    roles: [],
    textContent: 'Câu chuyện và giá trị cốt lõi của Wi300.',
    steps: [
      {
        title: 'Bước 1: Đọc câu chuyện Wi300',
        body:
          'Trang giới thiệu sứ mệnh, tầm nhìn và hành trình hình thành hệ sinh thái Wi.',
      },
      {
        title: 'Bước 2: Tìm hiểu giá trị cốt lõi',
        body:
          'Các giá trị như "Kiến tạo tương lai", "Lan tỏa tri thức", "Kết nối con người" ' +
          'được trình bày cùng minh họa cụ thể.',
      },
      {
        title: 'Bước 3: Kết nối với Wi',
        body:
          'Cuối trang có thông tin liên hệ và liên kết tới các dự án, khóa học.\n\n' +
          'Bấm để bắt đầu hành trình cùng Wi.',
      },
    ],
  },
  {
    pagePath: '/kham-pha',
    title: 'Khám phá',
    roles: [],
    textContent: 'Khám phá tri thức và kỹ năng trong hệ sinh thái Wi.',
    steps: [
      {
        title: 'Bước 1: Duyệt nội dung khám phá',
        body:
          'Trang tổng hợp nội dung để bạn khám phá: khóa học, bài viết, dự án nổi bật.',
      },
      {
        title: 'Bước 2: Lọc theo nhu cầu',
        body:
          'Dùng bộ lọc danh mục để chỉ xem đúng loại nội dung bạn quan tâm.',
      },
      {
        title: 'Bước 3: Mở chi tiết',
        body:
          'Bấm vào từng thẻ để xem chi tiết và thực hiện bước tiếp theo (đăng ký, đọc bài, tham gia).',
      },
    ],
  },
  {
    pagePath: '/san-pham',
    title: 'Sản phẩm',
    roles: [],
    textContent: 'Danh mục sản phẩm trong hệ sinh thái Wi.',
    steps: [
      {
        title: 'Bước 1: Duyệt danh mục sản phẩm',
        body:
          'Trang liệt kê sản phẩm kèm hình ảnh, mô tả ngắn và giá.\n\n' +
          'Dùng ô tìm kiếm để tìm sản phẩm phù hợp.',
      },
      {
        title: 'Bước 2: Xem chi tiết sản phẩm',
        body:
          'Bấm vào sản phẩm để xem mô tả đầy đủ, hình ảnh và thông tin liên quan.',
      },
      {
        title: 'Bước 3: Mua/đăng ký sản phẩm',
        body:
          'Bấm nút mua hoặc liên hệ trên trang chi tiết và làm theo hướng dẫn thanh toán.',
      },
    ],
  },
  {
    pagePath: '/my-requests',
    title: 'Yêu cầu hỗ trợ của tôi',
    roles: [],
    textContent: 'Theo dõi các yêu cầu hỗ trợ bạn đã gửi.',
    steps: [
      {
        title: 'Bước 1: Xem danh sách yêu cầu',
        body:
          'Trang liệt kê mọi yêu cầu hỗ trợ bạn đã gửi kèm trạng thái xử lý mới nhất.',
      },
      {
        title: 'Bước 2: Gửi yêu cầu mới',
        body:
          'Bấm nút tạo yêu cầu, chọn loại hỗ trợ và mô tả chi tiết vấn đề bạn gặp.',
      },
      {
        title: 'Bước 3: Theo dõi phản hồi',
        body:
          'Mở từng yêu cầu để xem trao đổi với đội ngũ hỗ trợ.\n\n' +
          'Bạn sẽ nhận thông báo khi có cập nhật mới.',
      },
    ],
  },
  {
    pagePath: '/reset-password/[token]',
    title: 'Đặt lại mật khẩu',
    roles: [],
    textContent: 'Tạo mật khẩu mới từ liên kết đặt lại mật khẩu.',
    steps: [
      {
        title: 'Bước 1: Nhập mật khẩu mới',
        body:
          'Nhập mật khẩu mới vào ô đầu tiên.\n\n' +
          'Mật khẩu nên dài, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.',
      },
      {
        title: 'Bước 2: Xác nhận mật khẩu',
        body:
          'Nhập lại đúng mật khẩu mới vào ô xác nhận rồi bấm lưu.',
      },
      {
        title: 'Bước 3: Đăng nhập lại',
        body:
          'Sau khi đặt lại thành công, bạn được chuyển về trang đăng nhập.\n\n' +
          'Đăng nhập bằng mật khẩu mới.',
      },
    ],
  },
  {
    pagePath: '/page/[slug]',
    title: 'Trang nội dung',
    roles: [],
    textContent: 'Trang nội dung do Wi biên soạn.',
    steps: [
      {
        title: 'Bước 1: Đọc nội dung trang',
        body:
          'Trang hiển thị nội dung đã được Wi biên soạn và cập nhật.',
      },
      {
        title: 'Bước 2: Xem mục liên quan',
        body:
          'Cuối trang có thể có các mục liên quan: khóa học, bài viết hoặc liên kết hữu ích.',
      },
      {
        title: 'Bước 3: Liên hệ khi cần',
        body:
          'Nếu cần thêm thông tin, dùng thông tin liên hệ ở chân trang.',
      },
    ],
  },
  {
    pagePath: '/page/[slug]/[pageSlug]',
    title: 'Trang nội dung chi tiết',
    roles: [],
    textContent: 'Trang con thuộc một trang nội dung của Wi.',
    steps: [
      {
        title: 'Bước 1: Đọc nội dung chi tiết',
        body:
          'Đây là trang con nằm trong một trang nội dung lớn hơn của Wi.',
      },
      {
        title: 'Bước 2: Điều hướng giữa các mục',
        body:
          'Dùng menu hoặc breadcrumb để di chuyển giữa các trang con cùng chủ đề.',
      },
    ],
  },
  {
    pagePath: '/land/[slug]',
    title: 'Trang landing',
    roles: [],
    textContent: 'Trang giới thiệu chi tiết một sản phẩm, khóa học hoặc chương trình.',
    steps: [
      {
        title: 'Bước 1: Đọc thông tin trang',
        body:
          'Trang landing trình bày đầy đủ: lợi ích, nội dung, giảng viên, học phí và minh chứng.',
      },
      {
        title: 'Bước 2: Điền form đăng ký',
        body:
          'Kéo xuống form đăng ký, điền họ tên, số điện thoại, email.\n\n' +
          'Kiểm tra kỹ thông tin trước khi gửi.',
      },
      {
        title: 'Bước 3: Xác nhận và thanh toán',
        body:
          'Sau khi gửi form, làm theo hướng dẫn xác nhận và thanh toán (nếu có) ' +
          'để hoàn tất đăng ký.',
      },
    ],
  },
  {
    pagePath: '/[slug]',
    title: 'Trang động',
    roles: [],
    textContent: 'Trang nội dung động trong hệ thống Wi.',
    steps: [
      {
        title: 'Bước 1: Xem nội dung trang',
        body:
          'Trang hiển thị nội dung được cấu hình động trong hệ thống.',
      },
      {
        title: 'Bước 2: Tương tác với các mục',
        body:
          'Bấm vào các nút, liên kết trên trang để đi tới nội dung liên quan.',
      },
    ],
  },
  {
    pagePath: '/tools/brk',
    title: 'Điểm BRK',
    roles: [],
    textContent: 'Xem cấp độ và tổng điểm BRK của bạn trong hệ thống.',
    steps: [
      {
        title: 'Bước 1: Xem tổng quan điểm BRK',
        body:
          'Trang hiển thị hệ thống bạn đang tham gia, cấp độ hiện tại và tổng điểm BRK đã tích lũy.',
      },
      {
        title: 'Bước 2: Xem lịch sử tích điểm',
        body:
          'Mở phần lịch sử để xem chi tiết từng lần cộng/trừ điểm và lý do.',
      },
      {
        title: 'Bước 3: Quản lý ví BRK',
        body:
          'Bấm sang mục Ví BRK để xem số dư và lịch sử giao dịch ví.',
      },
    ],
  },
  {
    pagePath: '/tools/my-site',
    title: 'Website của tôi',
    roles: ['ADMIN', 'INSTRUCTOR'],
    textContent: 'Trung tâm quản trị website cá nhân: trang, giao diện, tên miền, form.',
    steps: [
      {
        title: 'Bước 1: Mở trang Quản lý website',
        body:
          'Bấm vào mục Quản lý để vào trung tâm điều khiển website của bạn: ' +
          'danh sách trang, cài đặt chung.',
      },
      {
        title: 'Bước 2: Soạn trang và chỉnh giao diện',
        body:
          'Các mục Trang và Giao diện cho phép soạn nội dung từng trang và tùy chỉnh màu sắc, bố cục.\n\n' +
          'Mọi thay đổi đều có xem trước trước khi xuất bản.',
      },
      {
        title: 'Bước 3: Quản lý tên miền và form',
        body:
          'Mục Tên miền để gắn domain riêng; mục Form để xem dữ liệu khách để lại thông tin.\n\n' +
          'Kiểm tra kỹ trước khi áp dụng thay đổi ra website thật.',
      },
    ],
  },
  {
    pagePath: '/tools/landings',
    title: 'Landing page',
    roles: ['ADMIN'],
    textContent: 'Quản lý các trang landing giới thiệu sản phẩm/khóa học.',
    steps: [
      {
        title: 'Bước 1: Xem danh sách landing page',
        body:
          'Trang liệt kê các landing page đã tạo kèm trạng thái và liên kết xem trước.',
      },
      {
        title: 'Bước 2: Tạo landing page mới',
        body:
          'Bấm nút tạo mới để vào trình dựng landing: nhập thông tin, chọn mẫu, ' +
          'duyệt dàn ý, chỉnh nội dung và tải file HTML.',
      },
      {
        title: 'Bước 3: Sửa hoặc xóa landing page',
        body:
          'Bấm vào landing page trong danh sách để chỉnh sửa hoặc xóa khi không còn dùng.',
      },
    ],
  },
  {
    pagePath: '/tools/site-profiles',
    title: 'Hồ sơ site',
    roles: ['ADMIN'],
    textContent: 'Quản lý hồ sơ website cho các thương hiệu/chi nhánh.',
    steps: [
      {
        title: 'Bước 1: Xem danh sách hồ sơ site',
        body:
          'Trang liệt kê các hồ sơ website đã tạo cho từng thương hiệu/chi nhánh.',
      },
      {
        title: 'Bước 2: Tạo hồ sơ site mới',
        body:
          'Bấm tạo mới, điền thông tin thương hiệu: tên, logo, màu sắc, nội dung trang chủ.',
      },
      {
        title: 'Bước 3: Chỉnh sửa hồ sơ',
        body:
          'Mở hồ sơ trong danh sách để chỉnh sửa nội dung hoặc cấu hình hiển thị.',
      },
    ],
  },
  {
    pagePath: '/tools/dev-flow',
    title: 'Theo dõi luồng phát triển',
    roles: ['ADMIN'],
    textContent: 'Theo dõi issue, PR, CI và deployment của dự án.',
    steps: [
      {
        title: 'Bước 1: Xem danh sách công việc',
        body:
          'Trang liệt kê các issue/đầu việc kèm nhánh code và trạng thái xử lý.',
      },
      {
        title: 'Bước 2: Kiểm tra PR, CI và deployment',
        body:
          'Bấm vào từng đầu việc để xem PR liên quan, kết quả CI và trạng thái deploy trên Vercel ' +
          'cùng liên kết preview để kiểm thử.',
      },
      {
        title: 'Bước 3: Xem nhật ký',
        body:
          'Phần nhật ký ghi lại các hoạt động trong luồng để tiện tra cứu.',
      },
    ],
  },
  {
    pagePath: '/tools/tca-sync',
    title: 'Đồng bộ TCA',
    roles: ['ADMIN'],
    textContent: 'Đồng bộ dữ liệu thành viên TCA với hệ thống.',
    steps: [
      {
        title: 'Bước 1: Xem số liệu hiện tại',
        body:
          'Trang hiển thị số lượng người dùng, hệ thống, thành viên TCA và các bản ghi đã đồng bộ.',
      },
      {
        title: 'Bước 2: Chạy đồng bộ',
        body:
          'Bấm nút đồng bộ để bắt đầu quá trình. Không tắt trang khi đang chạy.',
      },
      {
        title: 'Bước 3: Kiểm tra kết quả',
        body:
          'Sau khi xong, đối chiếu số liệu trước/sau để chắc dữ liệu đã đồng bộ đầy đủ.',
      },
    ],
  },
  {
    pagePath: '/tools/reserved-ids',
    title: 'Mã thành viên số đẹp',
    roles: ['ADMIN'],
    textContent: 'Quản lý các mã thành viên số đẹp dành riêng.',
    steps: [
      {
        title: 'Bước 1: Xem danh sách mã số đẹp',
        body:
          'Trang liệt kê các mã thành viên số đẹp đang được giữ riêng.',
      },
      {
        title: 'Bước 2: Cấp mã cho thành viên',
        body:
          'Chọn mã còn trống và gán cho thành viên theo quy định.',
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
    g.roles = normalizeRoles(g.roles)
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
