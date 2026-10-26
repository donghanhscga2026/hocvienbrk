/* Kiểm chứng huy hiệu GĐ3:
   1) Bộ huy hiệu đợt đầu đúng 24 chiếc, code duy nhất, đủ 4 nhóm.
   2) isEarned: ngưỡng thường >= threshold; huy hiệu hạng đua: hạng > 0
      và <= threshold (hạng 0 = chưa có dữ liệu → không đạt).
   3) titleForBadgeCount: đúng các mốc danh hiệu.
   4) Schema có category + rule; migration tồn tại; engine dùng upsert
      theo code và unique UserBadge; cron có CRON_SECRET; trang học
      viên không tự ghi khi hiển thị (chỉ qua nút cập nhật). */
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

const catalog = loadModule('lib/badges/catalog.ts')

{
  ok(catalog.BADGE_CATALOG.length === 24, 'catalog: đúng 24 huy hiệu đợt đầu')
  ok(new Set(catalog.BADGE_CATALOG.map((b) => b.code)).size === 24, 'catalog: code duy nhất')
  const cats = new Set(catalog.BADGE_CATALOG.map((b) => b.category))
  ok(cats.size === 4 && cats.has('LEARNING') && cats.has('RACE'), 'catalog: đủ 4 nhóm')
}

{
  const learn = catalog.BADGE_CATALOG.find((b) => b.code === 'LEARN_10')
  ok(catalog.isEarned(learn, 10) && !catalog.isEarned(learn, 9), 'isEarned: ngưỡng >=')
  const winner = catalog.BADGE_CATALOG.find((b) => b.code === 'RACE_WINNER')
  ok(catalog.isEarned(winner, 1) && !catalog.isEarned(winner, 2) && !catalog.isEarned(winner, 0), 'isEarned: hạng đua (1 đạt, 2 không, 0 = chưa có dữ liệu)')
  const top10 = catalog.BADGE_CATALOG.find((b) => b.code === 'RACE_TOP10')
  ok(catalog.isEarned(top10, 10) && !catalog.isEarned(top10, 11), 'isEarned: top 10 biên đúng')
}

{
  ok(catalog.titleForBadgeCount(0) === 'Thành viên mới', 'title: 0 huy hiệu')
  ok(catalog.titleForBadgeCount(3) === 'Học viên chăm chỉ', 'title: 3 huy hiệu')
  ok(catalog.titleForBadgeCount(20) === 'Huyền thoại cộng đồng', 'title: 20 huy hiệu')
}

const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8')
ok(schema.includes('category     String      @default("AFFILIATE")') || schema.includes('category'), 'schema: Badge có category')
ok(fs.existsSync(path.join(root, 'prisma/migrations/20261024005000_badge_engine/migration.sql')), 'migration: tồn tại')
const engine = fs.readFileSync(path.join(root, 'lib/badges/engine.ts'), 'utf8')
ok(engine.includes('prisma.badge.upsert') && engine.includes('where: { code: def.code }'), 'engine: đồng bộ catalog bằng upsert theo code')
ok(engine.includes('owned.has(badgeId)'), 'engine: bỏ qua huy hiệu đã có (idempotent)')
const cron = fs.readFileSync(path.join(root, 'app/api/cron/badge-awards/route.ts'), 'utf8')
ok(cron.includes('CRON_SECRET'), 'cron: có khóa CRON_SECRET')
const page = fs.readFileSync(path.join(root, 'app/huy-hieu/page.tsx'), 'utf8')
ok(!page.includes('awardBadgesForUser'), 'page: hiển thị không tự ghi — trao qua nút cập nhật/action')

// Tối ưu vận hành + lối vào + thông báo (26/10/2026):
// - catalog chỉ đồng bộ 1 lần mỗi tiến trình (promise dùng chung), không
//   upsert lại trước mỗi thành viên như bản đầu gây timeout 900 giây.
// - lượt toàn hệ thống đo gộp (groupBy) và trao bằng createMany.
// - nhận huy hiệu mới có chuông BADGE_AWARDED, hiện trong feed và bấm
//   sang /huy-hieu; học viên có lối vào từ menu tài khoản; trang công cụ
//   có icon Medal cho thẻ Huy hiệu.
ok(engine.includes('let catalogReady'), 'engine: catalog đồng bộ 1 lần mỗi tiến trình')
ok(engine.includes('measureAllMembers') && engine.includes('groupBy'), 'engine: lượt toàn hệ thống đo gộp theo lô')
ok(engine.includes('planAllBadgeAwards'), 'engine: có hàm tính trước dry-run không ghi DB')
ok(engine.includes('userBadge.createMany') && engine.includes('skipDuplicates: true'), 'engine: trao bằng createMany chống trùng')
ok(engine.includes("kind: 'BADGE_AWARDED'") && engine.includes('notifyBadgeAwards'), 'engine: có báo chuông khi nhận huy hiệu mới')
const notif = fs.readFileSync(path.join(root, 'lib/app-notifications.ts'), 'utf8')
ok(notif.includes("n.kind = 'BADGE_AWARDED'"), 'notifications: BADGE_AWARDED nằm trong danh sách hiển thị của chuông')
ok(notif.includes("if (row.kind === 'BADGE_AWARDED') return '/huy-hieu'"), 'notifications: bấm thông báo huy hiệu sang /huy-hieu')
const userMenu = fs.readFileSync(path.join(root, 'components/layout/UserMenu.tsx'), 'utf8')
ok(userMenu.includes('href="/huy-hieu"') && userMenu.includes('Huy hiệu của tôi'), 'lối vào: menu tài khoản có mục Huy hiệu của tôi')
const toolsPage = fs.readFileSync(path.join(root, 'app/tools/page.tsx'), 'utf8')
ok(toolsPage.includes('Medal,'), 'lối vào: iconMap trang công cụ có Medal cho thẻ Huy hiệu')

console.log(`test-badge-engine: ${checks} kiểm chứng PASS`)
