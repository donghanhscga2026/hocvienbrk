/* Kiểm chứng điểm danh Zoom (GĐ1 — kế hoạch nâng cấp từ WIPA OS):
   1) splitCsv: ô có dấu phẩy trong ngoặc kép, BOM, xuống dòng CRLF.
   2) parseZoomCsv: tìm đúng dòng tiêu đề sau phần thông tin buổi họp;
      cộng dồn thời lượng khi một người có nhiều dòng; thời lượng dạng
      "1:23:45"; cảnh báo khi file không có tiêu đề hợp lệ.
   3) matchAttendees: khớp theo email trước; dự phòng theo tên đã bỏ dấu
      (chỉ khi duy nhất); người trùng khớp không tính hai lần; danh sách
      vắng = học viên ACTIVE không khớp.
   4) Bất biến ở action: xem trước không ghi DB (không có create trong
      previewZoomImport), commit chạy trong transaction, từ chối file
      .xlsx (PK zip), giới hạn dung lượng và số dòng.
   5) Schema + migration tồn tại; union ActivityAction có
      ATTENDANCE_IMPORTED. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
let checks = 0
const ok = (cond, label) => { assert.ok(cond, label); checks++ }

function loadModule(relative) {
  const file = path.resolve(root, relative)
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText
  const module = { exports: {} }
  new Function('require', 'module', 'exports', code)(require, module, module.exports)
  return module.exports
}

const zoom = loadModule('lib/attendance/zoom-csv.ts')

// --- 1) splitCsv ---
{
  const grid = zoom.splitCsv('﻿a,"b,c",d\r\n1,2,3\n')
  ok(grid.length === 2 && grid[0][1] === 'b,c' && grid[1][2] === '3', 'splitCsv: quote + BOM + CRLF')
}

// --- 2) parseZoomCsv ---
{
  const csv = [
    'Meeting ID,Topic,Start Time',
    '123456789,Buoi hoc Zoom,10/23/2026 07:00 PM',
    '',
    'Name (Original Name),User Email,Join Time,Leave Time,Duration (Minutes)',
    '"Nguyen Van A",a@example.com,10/23/2026 07:01 PM,10/23/2026 08:30 PM,89',
    '"Nguyen Van A",a@example.com,10/23/2026 08:35 PM,10/23/2026 08:45 PM,10',
    '"Tran Thi B",b@example.com,10/23/2026 07:02 PM,10/23/2026 08:32 PM,1:30:00',
    '"Khach Moi",guest@example.com,10/23/2026 07:05 PM,10/23/2026 07:20 PM,15',
  ].join('\n')
  const parsed = zoom.parseZoomCsv(csv)
  ok(parsed.rows.length === 3, 'parse: 3 người sau khi gộp dòng trùng')
  const a = parsed.rows.find((r) => r.email === 'a@example.com')
  ok(a && a.minutes === 99, 'parse: cộng dồn 89 + 10 = 99 phút cho người vào lại')
  const b = parsed.rows.find((r) => r.email === 'b@example.com')
  ok(b && b.minutes === 90, 'parse: thời lượng 1:30:00 = 90 phút')
}
{
  const bad = zoom.parseZoomCsv('cot1,cot2\n1,2\n')
  ok(bad.rows.length === 0 && bad.warnings.length >= 1, 'parse: file lạ → rỗng + cảnh báo')
}

// --- 3) matchAttendees ---
{
  const students = [
    { userId: 1, name: 'Nguyễn Văn A', email: 'a@example.com' },
    { userId: 2, name: 'Trần Thị B', email: 'b@example.com' },
    { userId: 3, name: 'Lê Văn C', email: 'c@example.com' },
    { userId: 4, name: 'Lê Văn C', email: 'c2@example.com' },
  ]
  const rows = [
    { name: 'Nguyen Van A', email: 'A@EXAMPLE.COM', minutes: 99, joinTime: null },
    { name: 'Tran Thi B', email: 'sai@example.com', minutes: 90, joinTime: null },
    { name: 'Le Van C', email: '', minutes: 30, joinTime: null },
    { name: 'Nguoi La', email: 'x@example.com', minutes: 10, joinTime: null },
  ]
  const m = zoom.matchAttendees(rows, students)
  ok(m.matched.length === 2, 'match: 2 người khớp (email + tên duy nhất)')
  ok(m.matched.find((x) => x.userId === 1)?.via === 'email', 'match: khớp email không phân biệt hoa thường')
  ok(m.matched.find((x) => x.userId === 2)?.via === 'name', 'match: email sai → dự phòng tên bỏ dấu')
  ok(m.unmatched.length === 2, 'match: tên trùng 2 học viên → không đoán, vào unmatched; người lạ vào unmatched')
  ok(m.absentUserIds.length === 2 && m.absentUserIds.includes(3) && m.absentUserIds.includes(4), 'match: vắng = ACTIVE không khớp')
}

// --- 4) Bất biến ở action ---
const action = fs.readFileSync(path.join(root, 'app/actions/attendance-actions.ts'), 'utf8')
{
  const previewBody = action.slice(action.indexOf('previewZoomImport'), action.indexOf('CommitImportInput'))
  ok(!previewBody.includes('.create(') && !previewBody.includes('createMany'), 'action: preview không ghi DB')
  ok(action.includes('prisma.$transaction'), 'action: commit trong transaction')
  ok(action.includes('0x50') && action.includes('0x4B'), 'action: phát hiện file .xlsx (PK) và hướng dẫn xuất CSV')
  ok(action.includes('MAX_FILE_BYTES') && action.includes('MAX_ROWS'), 'action: giới hạn dung lượng + số dòng')
  ok(action.includes('requireCourseManager'), 'action: kiểm tra quyền quản lý khóa ở cả hai bước')
}

// --- 5) Schema + migration + union ---
const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8')
ok(/model AttendanceSession \{/.test(schema) && /model AttendanceRecord \{/.test(schema), 'schema: có 2 model điểm danh')
ok(schema.includes('@@unique([sessionId, userId])'), 'schema: unique (sessionId, userId)')
ok(fs.existsSync(path.join(root, 'prisma/migrations/20261023234000_add_attendance/migration.sql')), 'migration: tồn tại')
const logger = fs.readFileSync(path.join(root, 'lib/activity-logger.ts'), 'utf8')
ok(logger.includes("'ATTENDANCE_IMPORTED'"), 'logger: union có ATTENDANCE_IMPORTED')

console.log(`test-attendance-zoom: ${checks} kiểm chứng PASS`)
