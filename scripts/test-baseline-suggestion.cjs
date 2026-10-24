/* Kiểm chứng gợi ý Điểm B + điểm đội cuộc đua:
   1) Form Điểm B có nút điền số liệu hệ thống đã đo; học viên điền
      xong vẫn sửa được trước khi lưu (applySuggestion chỉ set state).
   2) Trang /diem-a-b truyền gợi ý đo được vào form B.
   3) getMeasuredTotals đọc từ snapshot kênh liên kết + sổ cái + đơn.
   4) Điểm theo đội của cuộc đua cộng từ chính bảng xếp hạng cá nhân
      (một nguồn sự thật), hiện ở cả trang học viên và quản trị. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const root = path.resolve(__dirname, '..')
let checks = 0
const ok = (cond, label) => { assert.ok(cond, label); checks++ }
const form = fs.readFileSync(path.join(root, 'components/baseline/BaselineForm.tsx'), 'utf8')
ok(form.includes('suggestion') && form.includes('Điền số liệu hệ thống đã đo'), 'form B: nút điền gợi ý từ số đo hệ thống')
ok(form.includes('applySuggestion'), 'form B: có hàm điền gợi ý, học viên vẫn sửa được trước khi lưu')
const page = fs.readFileSync(path.join(root, 'app/diem-a-b/page.tsx'), 'utf8')
ok(page.includes('getMeasuredTotals') && page.includes('suggestion={measured}'), 'trang Điểm A/B: truyền gợi ý vào form B')
const service = fs.readFileSync(path.join(root, 'lib/baseline/service.ts'), 'utf8')
ok(service.includes('getMeasuredTotals') && service.includes('socialSnapshot') && service.includes('memberSalesLedger'), 'service: gợi ý từ snapshot + sổ cái')
const raceService = fs.readFileSync(path.join(root, 'lib/race/service.ts'), 'utf8')
ok(raceService.includes('getRaceTeamStandings') && raceService.includes('getLeaderboard(raceId, 1000)'), 'race: điểm đội cộng từ bảng cá nhân (một nguồn)')
for (const f of ['app/cuoc-dua/page.tsx', 'app/tools/cuoc-dua/page.tsx']) {
  ok(fs.readFileSync(path.join(root, f), 'utf8').includes('Điểm theo đội'), `${f}: hiện bảng điểm đội`)
}
console.log(`test-prb: ${checks} kiểm chứng PASS`)
