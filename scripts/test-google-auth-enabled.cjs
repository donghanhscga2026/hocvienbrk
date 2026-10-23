/* Kiểm chứng các bất biến của việc bật lại đăng nhập Google (GĐ1 — kế hoạch
   nâng cấp từ WIPA OS, 23/10/2026):
   1) auth.ts khai báo provider Google đang hoạt động (không bị comment),
      đọc clientId/clientSecret từ biến môi trường GOOGLE_CLIENT_ID /
      GOOGLE_CLIENT_SECRET và giữ allowDangerousEmailAccountLinking như
      thiết kế gốc (tài khoản Google trùng email sẽ nối vào tài khoản cũ).
   2) Không còn dấu vết vô hiệu hóa "DISABLED: Google Auth" trong auth.ts
      và trang đăng nhập.
   3) Trang đăng nhập render SocialAuthButtons thật (không nằm trong block
      comment JSX), có import đang hoạt động, có handleGoogleLoading và
      hook useEmailPrefill đang hoạt động.
   4) Trang đăng ký vẫn giữ nút "Đăng ký bằng Google" (đối xứng hai cửa).
   5) Callback của signIn trong auth.ts vẫn xử lý provider 'google' cho
      thông báo đăng nhập + ghi ActivityLog như credentials. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
let checks = 0
const ok = (cond, label) => { assert.ok(cond, label); checks++ }

const auth = fs.readFileSync(path.join(root, 'auth.ts'), 'utf8')
const login = fs.readFileSync(path.join(root, 'app/login/page.tsx'), 'utf8')
const register = fs.readFileSync(path.join(root, 'app/register/page.tsx'), 'utf8')

// --- 1) Provider Google đang hoạt động trong auth.ts ---
ok(/Google\(\{\s*\n\s*clientId: process\.env\.GOOGLE_CLIENT_ID,/.test(auth),
  'auth.ts: Google provider đọc GOOGLE_CLIENT_ID')
ok(/clientSecret: process\.env\.GOOGLE_CLIENT_SECRET,/.test(auth),
  'auth.ts: Google provider đọc GOOGLE_CLIENT_SECRET')
ok(/allowDangerousEmailAccountLinking: true,/.test(auth),
  'auth.ts: giữ allowDangerousEmailAccountLinking như thiết kế gốc')
// Dòng khai báo provider không được nằm trong comment
const providerLine = auth.split('\n').find((l) => l.includes('Google({'))
ok(providerLine && !providerLine.trimStart().startsWith('//'),
  'auth.ts: dòng Google({ không bị comment')

// --- 2) Không còn dấu vô hiệu hóa ---
ok(!auth.includes('DISABLED: Google Auth'), 'auth.ts: không còn DISABLED: Google Auth')
ok(!login.includes('DISABLED: Google Auth'), 'login: không còn DISABLED: Google Auth')

// --- 3) Trang đăng nhập render thật nút Google ---
ok(/^import \{ SocialAuthButtons \}/m.test(login),
  'login: import SocialAuthButtons đang hoạt động (không comment)')
ok(/^import \{ useEmailPrefill \}/m.test(login),
  'login: import useEmailPrefill đang hoạt động')
ok(/<SocialAuthButtons/.test(login), 'login: có render <SocialAuthButtons')
ok(!login.includes('{/* DISABLED'), 'login: nút Google không nằm trong block comment JSX')
ok(/const handleGoogleLoading = \(loading: boolean\) =>/.test(login),
  'login: handleGoogleLoading đang hoạt động')
ok(/const \{ email: prefillEmail \} = useEmailPrefill\(\)/.test(login),
  'login: useEmailPrefill đang được gọi')

// --- 4) Trang đăng ký giữ nút Google ---
ok(/<SocialAuthButtons/.test(register) && register.includes('Đăng ký bằng Google'),
  'register: vẫn có nút Đăng ký bằng Google')

// --- 5) signIn callback xử lý provider google ---
ok(auth.includes("account?.provider === 'google'"),
  'auth.ts: signIn callback vẫn xử lý provider google')

console.log(`test-google-auth-enabled: ${checks} kiểm chứng PASS`)
