/* Kiểm chứng GĐ4:
   1) groupLessonsByDay: bài thử thách ngày mở ngày mới; bài thường đi
      theo ngày phía trước; bài trước ngày đầu vào "Chuẩn bị"; khóa
      không có thử thách ngày → một nhóm duy nhất; thứ tự theo order
      dù mảng đầu vào lộn xộn.
   2) Service tổng quan đọc đúng các nguồn (điểm danh, sổ cái, cuộc
      đua, huy hiệu) — kiểm tra bằng dấu vết mã nguồn; lịch tự sinh gom
      từ buổi học + cuộc đua + ngày nghỉ đã duyệt. */
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

const journey = loadModule('lib/journey.ts')
const L = (id, order, daily, completed = false) => ({ id, title: id, order, isDailyChallenge: daily, completed })

{
  const days = journey.groupLessonsByDay([
    L('b3', 3, false, true), L('intro', 1, false), L('d1', 2, true, true), L('d2', 4, true), L('b5', 5, false),
  ])
  ok(days.length === 3, 'journey: Chuẩn bị + 2 ngày')
  ok(days[0].label === 'Chuẩn bị' && days[0].lessons[0].id === 'intro', 'journey: bài trước ngày đầu vào Chuẩn bị')
  ok(days[1].label === 'Ngày 1' && days[1].lessons.map((l) => l.id).join(',') === 'd1,b3', 'journey: ngày 1 gồm bài thử thách + bài kèm, đã sắp theo order')
  ok(days[1].completedCount === 2 && days[2].completedCount === 0, 'journey: đếm hoàn thành theo ngày')
}
{
  const days = journey.groupLessonsByDay([L('a', 2, false), L('b', 1, false, true)])
  ok(days.length === 1 && days[0].label === 'Tất cả bài học' && days[0].lessons[0].id === 'b', 'journey: không có thử thách ngày → một nhóm, vẫn sắp xếp')
  ok(journey.groupLessonsByDay([]).length === 1, 'journey: rỗng → nhóm rỗng (trang tự ẩn)')
}

const service = fs.readFileSync(path.join(root, 'lib/overview/service.ts'), 'utf8')
for (const token of ['attendanceRecord', 'memberSalesLedger', 'raceEnrollment', 'userBadge', 'connectedAccount']) {
  ok(service.includes(token), `overview: đọc nguồn ${token}`)
}
ok(service.includes("status: 'APPROVED'"), 'agenda: chỉ ngày nghỉ đã duyệt mới vào lịch')
ok(service.includes('getTeamStandings') && service.includes('lessonProgress'), 'overview: bảng đội từ Enrollment.team + tiến độ bài')

console.log(`test-journey-overview: ${checks} kiểm chứng PASS`)
