/* Kiểm chứng Care Engine GĐ2 — thư viện câu mẫu & hẹn giờ theo dõi:
   1) decideFollowUp: chưa tới hạn → chờ; tới hạn + có hoạt động sau khi
      đặt hẹn (tiến độ/bình luận/yêu cầu/nhắc khác) → tự hủy đúng lý do;
      hoạt động TRƯỚC khi đặt hẹn không tính; không hoạt động → gửi.
   2) render câu mẫu: điền biến đúng, spintax ra 1 trong các biến thể và
      không sót ngoặc, biến không bị spin nuốt mất.
   3) validate shortcut/nội dung + phân quyền xem/sửa theo phạm vi.
   4) 6 mẫu mặc định đúng cú pháp, render được với biến mẫu.
   5) Kiểm tra nguồn: schema có 2 model + enum; cron care-reminders xử lý
      follow-up; route remind nhận templateId và render ở server; CRM có
      tab Câu mẫu & hẹn giờ; route follow-ups/templates tồn tại. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
let checks = 0
const ok = (cond, label) => { assert.ok(cond, label); checks++ }

const cache = new Map()
function loadModule(relative) {
  const file = path.resolve(root, relative)
  if (cache.has(file)) return cache.get(file)
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  cache.set(file, module.exports)
  const localRequire = (spec) => {
    if (spec.startsWith('.')) {
      const target = path.resolve(path.dirname(file), spec) + (spec.endsWith('.ts') ? '' : '.ts')
      return loadModule(path.relative(root, target))
    }
    return require(spec)
  }
  new Function('require', 'module', 'exports', code)(localRequire, module, module.exports)
  cache.set(file, module.exports)
  return module.exports
}

const followups = loadModule('lib/care/followups.ts')
const lib = loadModule('lib/care/templates-lib.ts')

// --- 1) decideFollowUp ---
const T0 = 1_700_000_000_000
const base = (overrides = {}) => ({
  createdAt: T0, dueAt: T0 + 3 * 86400000,
  lastProgressAt: null, lastCommentAt: null, lastRequestAt: null, lastCareReminderAt: null,
  ...overrides,
})
const due = T0 + 3 * 86400000

ok(followups.decideFollowUp(base(), due - 1).decision === 'wait', 'followup: chưa tới hạn → chờ')
ok(followups.decideFollowUp(base(), due).decision === 'send', 'followup: tới hạn + im lặng → gửi')
ok(followups.decideFollowUp(base(), due + 999).decision === 'send', 'followup: quá hạn + im lặng → gửi')

let d = followups.decideFollowUp(base({ lastProgressAt: T0 + 1000 }), due)
ok(d.decision === 'cancel-auto' && d.reason === 'progress', 'followup: nộp bài sau đặt hẹn → tự hủy (progress)')
d = followups.decideFollowUp(base({ lastCommentAt: T0 + 1000 }), due)
ok(d.decision === 'cancel-auto' && d.reason === 'comment', 'followup: bình luận sau đặt hẹn → tự hủy (comment)')
d = followups.decideFollowUp(base({ lastRequestAt: T0 + 1000 }), due)
ok(d.decision === 'cancel-auto' && d.reason === 'request', 'followup: yêu cầu mới sau đặt hẹn → tự hủy (request)')
d = followups.decideFollowUp(base({ lastCareReminderAt: T0 + 1000 }), due)
ok(d.decision === 'cancel-auto' && d.reason === 'care-reminder', 'followup: đã nhận nhắc khác → tự hủy (care-reminder)')

// Hoạt động TRƯỚC hoặc ĐÚNG lúc đặt hẹn không tính là phản hồi.
ok(followups.decideFollowUp(base({ lastProgressAt: T0 - 1000 }), due).decision === 'send', 'followup: hoạt động trước đặt hẹn → vẫn gửi')
ok(followups.decideFollowUp(base({ lastProgressAt: T0 }), due).decision === 'send', 'followup: hoạt động đúng mốc đặt hẹn → vẫn gửi (chiều ngược của biên)')
// Chưa tới hạn thì dù có hoạt động cũng chỉ là chờ (chưa quyết định hủy).
ok(followups.decideFollowUp(base({ lastProgressAt: T0 + 1000 }), due - 5).decision === 'wait', 'followup: chưa tới hạn + đã hoạt động → vẫn chờ tới hạn mới hủy')
// Ưu tiên lý do: tiến độ học tập thắng các lý do khác.
d = followups.decideFollowUp(base({ lastProgressAt: T0 + 5, lastCommentAt: T0 + 9, lastRequestAt: T0 + 7 }), due)
ok(d.decision === 'cancel-auto' && d.reason === 'progress', 'followup: nhiều hoạt động → lý do ưu tiên progress')

ok(followups.followUpDueAt(new Date(T0), 3).getTime() === due, 'followup: dueAt = đặt hẹn + 3 ngày')
ok(JSON.stringify(followups.FOLLOW_UP_DAY_OPTIONS) === '[1,3,7]', 'followup: mốc hẹn 1/3/7 ngày')

// --- 2) render câu mẫu ---
const vars = { name: 'Hồng Nhung', course: 'Zalo Mastery K02', lesson: 'Ngày 14', streak: 12, amount: '499.000đ' }
const rendered = lib.renderCareLibraryTemplate('{Chào|Xin chào} {name}, chuỗi {streak} ngày ở khóa {course} đừng đứt ở {lesson} nhé', vars)
ok(['Chào', 'Xin chào'].some((g) => rendered.startsWith(g)), 'render: spintax ra đúng 1 biến thể chào')
ok(rendered.includes('Hồng Nhung') && rendered.includes('12 ngày') && rendered.includes('Zalo Mastery K02') && rendered.includes('Ngày 14'), 'render: điền đủ biến')
ok(!rendered.includes('{') && !rendered.includes('}'), 'render: không sót ngoặc nào')
ok(lib.renderCareLibraryTemplate('Nhắc {name} đóng {amount}', vars) === 'Nhắc Hồng Nhung đóng 499.000đ', 'render: mẫu không spintax giữ nguyên + điền biến')
ok(lib.previewCareLibraryTemplate('{A|B} {name}', vars, 5).every((p) => ['A Hồng Nhung', 'B Hồng Nhung'].includes(p)), 'render: xem trước 5 biến thể đều hợp lệ')

// --- 3) validate + phân quyền ---
ok(lib.normalizeShortcut('giu-chuoi') === '/giu-chuoi', 'shortcut: tự thêm dấu /')
ok(lib.validateShortcut('/giu-chuoi') === null, 'shortcut: hợp lệ')
ok(lib.validateShortcut('/Giu Chuoi') !== null, 'shortcut: khoảng trắng/chữ hoa → lỗi')
ok(lib.validateShortcut('/') !== null, 'shortcut: quá ngắn → lỗi')
ok(lib.validateTemplateBody('Câu mẫu đủ dài để hợp lệ.') === null, 'body: hợp lệ')
ok(lib.validateTemplateBody('{Chào|Xin chào} {name}') === null, 'body: spintax cân bằng → hợp lệ')
ok(lib.validateTemplateBody('{Chào|Xin chào {name}') !== null, 'body: ngoặc lồng/không cân bằng → lỗi')
ok(lib.validateTemplateBody('ngắn') !== null, 'body: quá ngắn → lỗi')

const admin = { id: 1, role: 'ADMIN', courseIds: [], isAdmin: true }
const teacherA = { id: 2, role: 'TEACHER', courseIds: [10], isAdmin: false }
const teacherB = { id: 3, role: 'TEACHER', courseIds: [20], isAdmin: false }
const sys = { scope: 'SYSTEM', courseId: null, ownerId: 1 }
const courseTpl = { scope: 'COURSE', courseId: 10, ownerId: 2 }
const personal = { scope: 'PERSONAL', courseId: null, ownerId: 2 }
ok(lib.canViewTemplate(teacherB, sys) && lib.canViewTemplate(teacherA, courseTpl), 'quyền xem: hệ thống ai cũng thấy, mẫu khóa GV khóa đó thấy')
ok(!lib.canViewTemplate(teacherB, courseTpl) && !lib.canViewTemplate(teacherB, personal), 'quyền xem: GV khác không thấy mẫu khóa/cá nhân của người khác')
ok(lib.canViewTemplate(admin, personal) && lib.canEditTemplate(admin, sys), 'quyền: admin xem/sửa tất cả')
ok(!lib.canEditTemplate(teacherA, sys) && lib.canEditTemplate(teacherA, courseTpl) && lib.canEditTemplate(teacherA, personal), 'quyền sửa: GV không sửa mẫu hệ thống, sửa được mẫu khóa mình + cá nhân mình')
ok(lib.canCreateTemplate(admin, 'SYSTEM', null) && !lib.canCreateTemplate(teacherA, 'SYSTEM', null), 'quyền tạo: mẫu hệ thống chỉ admin')
ok(lib.canCreateTemplate(teacherA, 'COURSE', 10) && !lib.canCreateTemplate(teacherA, 'COURSE', 20), 'quyền tạo: mẫu khóa chỉ cho khóa mình dạy')

// --- 4) mẫu mặc định ---
ok(lib.DEFAULT_CARE_TEMPLATES.length === 6, 'mặc định: đủ 6 mẫu bám demo')
for (const t of lib.DEFAULT_CARE_TEMPLATES) {
  ok(lib.validateShortcut(t.shortcut) === null, `mặc định: shortcut ${t.shortcut} hợp lệ`)
  ok(lib.validateTemplateBody(t.body) === null, `mặc định: body ${t.shortcut} hợp lệ`)
  ok(!lib.renderCareLibraryTemplate(t.body, vars).includes('{'), `mặc định: ${t.shortcut} render sạch ngoặc`)
}

// --- 5) kiểm tra nguồn ---
const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8')
ok(schema.includes('model CareTemplate') && schema.includes('model CareFollowUp'), 'schema: có 2 model GĐ2')
ok(schema.includes('enum CareTemplateScope') && schema.includes('enum CareFollowUpStatus'), 'schema: có 2 enum GĐ2')
const migration = fs.readFileSync(path.join(root, 'prisma/migrations/20261107143000_care_gd2_templates_followups/migration.sql'), 'utf8')
ok(migration.includes('CREATE TABLE "CareTemplate"') && migration.includes('CREATE TABLE "CareFollowUp"'), 'migration: tạo đủ 2 bảng')
const cron = fs.readFileSync(path.join(root, 'app/api/cron/care-reminders/route.ts'), 'utf8')
ok(cron.includes('processDueFollowUps'), 'cron: care-reminders xử lý luôn hẹn giờ (tái dùng lịch 07:15)')
const remind = fs.readFileSync(path.join(root, 'app/api/crm/care-today/remind/route.ts'), 'utf8')
ok(remind.includes('templateId') && remind.includes('renderCareLibraryTemplate'), 'remind: nhận templateId + render ở server')
for (const p of ['app/api/crm/care-templates/route.ts', 'app/api/crm/care-templates/[id]/route.ts', 'app/api/crm/care-followups/route.ts', 'app/api/crm/care-followups/[id]/route.ts', 'components/crm/CrmCareTemplates.tsx']) {
  ok(fs.existsSync(path.join(root, p)), `nguồn: tồn tại ${p}`)
}
const workspace = fs.readFileSync(path.join(root, 'components/crm/CrmWorkspace.tsx'), 'utf8')
ok(workspace.includes("'templates'") && workspace.includes('Câu mẫu & hẹn giờ'), 'CRM: có tab Câu mẫu & hẹn giờ')

console.log(`test-care-followups: ${checks}/${checks} kiểm chứng PASS`)
