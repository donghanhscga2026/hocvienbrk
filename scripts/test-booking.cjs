/* Kiểm chứng đặt lịch hẹn coach 1:1 — Giai đoạn 1 (chốt 23/10/2026):
   1) Quy đổi giờ Việt Nam <-> UTC hai chiều, gồm ca sát nửa đêm
      (mục 13 + 14 AGENTS.md: không quy đổi hai lần, kiểm cả hai phía).
   2) generateDaySlots: cửa sổ + thời lượng, khoảng bận, thời gian đệm,
      mốc đặt trước tối thiểu (gồm ca đúng biên), slot chạm biên không
      tính là trùng.
   3) resolveWindows: lịch tuần, ngày nghỉ ngoại lệ, ngày mở riêng.
   4) Biểu mẫu intake: parse phòng thủ, validate bắt buộc/lựa chọn,
      sanitize chỉ giữ key đã khai.
   5) validateAvailabilityRules: khung chồng nhau bị chặn.
   6) File .ics: định dạng mốc giờ + thoát ký tự đặc biệt.
   7) Schema + migration: đủ 5 bảng booking, enum, khối Grant.
   8) Kiểm tra nguồn: service có khóa chống trùng + giữ chỗ 10 phút +
      đồng bộ CRM; actions bắt buộc đăng nhập + vai trò chuyên gia;
      route confirm gắn tài khoản học viên khi đã đăng nhập.
   9) Giai đoạn 2: chính sách tự đổi/hủy của khách kiểm CẢ HAI CHIỀU
      (còn hạn thì được, quá hạn thì chặn, đúng biên vẫn được) và phân
      loại mốc nhắc hẹn 24 giờ / 1 giờ cho cron; kiểm tra nguồn cổng
      tra cứu, danh sách chờ, cron và migration mốc nhắc hẹn. */
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

const slots = loadModule('lib/booking/slots.ts')
const ics = loadModule('lib/booking/ics.ts')
const policy = loadModule('lib/booking/policy.ts')

// --- 1) Quy đổi giờ hai chiều ---
{
  const start = slots.slotStartUtc('2026-10-24', 9 * 60)
  ok(start.toISOString() === '2026-10-24T02:00:00.000Z', 'gio: 09:00 VN = 02:00 UTC cung ngay')
  ok(slots.vnDateString(start) === '2026-10-24', 'gio: chieu nguoc 02:00 UTC -> ngay VN 24/10')
  const early = slots.slotStartUtc('2026-10-24', 30)
  ok(early.toISOString() === '2026-10-23T17:30:00.000Z', 'gio: 00:30 VN = 17:30 UTC hom truoc')
  ok(slots.vnDateString(early) === '2026-10-24', 'gio: 17:30 UTC hom truoc van la ngay VN 24/10')
  ok(slots.vnDateString(new Date('2026-10-24T16:59:00.000Z')) === '2026-10-24', 'gio: 23:59 VN chua qua ngay')
  ok(slots.vnDateString(new Date('2026-10-24T17:01:00.000Z')) === '2026-10-25', 'gio: 00:01 VN da sang ngay moi')
  ok(slots.addDaysVN('2026-10-24', 30) === '2026-11-23', 'gio: cong 30 ngay dung')
  ok(slots.formatMin(9 * 60 + 5) === '09:05', 'gio: formatMin dung')
}

// --- 2) Sinh slot ---
{
  const dateVN = '2026-10-26' // thu hai
  const base = {
    dateVN, durationMin: 30, bufferMin: 0, minNoticeHours: 0,
    now: slots.slotStartUtc(dateVN, 0),
    windows: [{ startMin: 9 * 60, endMin: 12 * 60 }],
    busy: [],
  }
  const all = slots.generateDaySlots(base)
  ok(all.length === 6, 'slot: cua so 3 tieng, buoi 30 phut -> 6 slot')
  ok(all.every((s) => s.available), 'slot: khong co lich ban -> tat ca kha dung')

  const busy = [{ startsAt: slots.slotStartUtc(dateVN, 9 * 60 + 30), endsAt: slots.slotStartUtc(dateVN, 10 * 60) }]
  const withBusy = slots.generateDaySlots({ ...base, busy })
  const byStart = Object.fromEntries(withBusy.map((s) => [s.startMin, s.available]))
  ok(byStart[9 * 60] === true, 'slot: 09:00 cham bien lich ban 09:30 -> khong trung')
  ok(byStart[9 * 60 + 30] === false, 'slot: 09:30 trung lich ban -> khoa')
  ok(byStart[10 * 60] === true, 'slot: 10:00 ngay sau lich ban -> mo (cham bien)')

  const buffered = slots.generateDaySlots({ ...base, busy, bufferMin: 15 })
  const bMap = Object.fromEntries(buffered.map((s) => [s.startMin, s.available]))
  ok(bMap[9 * 60] === false, 'slot: dem 15 phut -> 09:00 bi khoa')
  ok(bMap[10 * 60] === false, 'slot: dem 15 phut -> 10:00 bi khoa')
  ok(bMap[10 * 60 + 30] === true, 'slot: dem 15 phut -> 10:30 van mo')

  const notice = slots.generateDaySlots({ ...base, now: slots.slotStartUtc(dateVN, 8 * 60), minNoticeHours: 2 })
  const nMap = Object.fromEntries(notice.map((s) => [s.startMin, s.available]))
  ok(nMap[9 * 60 + 30] === false, 'slot: dat truoc toi thieu 2h -> 09:30 bi khoa khi bay gio la 08:00')
  ok(nMap[10 * 60] === true, 'slot: dung bien 10:00 (08:00 + 2h) -> mo')

  ok(slots.slotPeriod(11 * 60 + 59) === 'SANG' && slots.slotPeriod(12 * 60) === 'CHIEU'
    && slots.slotPeriod(17 * 60 + 59) === 'CHIEU' && slots.slotPeriod(18 * 60) === 'TOI', 'slot: phan buoi sang/chieu/toi dung bien')
  ok(slots.intervalsOverlap(0, 10, 10, 20) === false && slots.intervalsOverlap(0, 11, 10, 20) === true, 'slot: overlap cham bien khong tinh trung')
}

// --- 3) Cửa sổ làm việc ---
{
  const rules = [{ weekday: 1, startMin: 9 * 60, endMin: 11 * 60 }]
  ok(slots.vnWeekday('2026-10-26') === 1, 'cua so: 26/10/2026 la thu hai')
  ok(slots.resolveWindows('2026-10-26', rules, null).length === 1, 'cua so: dung lich tuan')
  ok(slots.resolveWindows('2026-10-27', rules, null).length === 0, 'cua so: thu ba khong co lich')
  ok(slots.resolveWindows('2026-10-26', rules, { dateVN: '2026-10-26', isOff: true, startMin: null, endMin: null }).length === 0, 'cua so: ngay nghi ngoai le khoa ca ngay')
  const custom = slots.resolveWindows('2026-10-26', rules, { dateVN: '2026-10-26', isOff: false, startMin: 14 * 60, endMin: 16 * 60 })
  ok(custom.length === 1 && custom[0].startMin === 14 * 60, 'cua so: ngoai le mo rieng thay the lich tuan')
}

// --- 4) Biểu mẫu intake ---
{
  const fields = slots.parseFormSchema([
    { key: 'van_de', label: 'Vấn đề chính', type: 'textarea', required: true },
    { key: 'kenh', label: 'Kênh chính', type: 'select', required: false, options: ['Facebook', 'TikTok'] },
    { key: '', label: 'Thiếu key', type: 'text' },
    'khong phai object',
  ])
  ok(fields.length === 2, 'form: parse phong thu loai dong hong')
  ok(slots.parseFormSchema('chu khong phai mang').length === 0, 'form: schema khong phai mang -> rong')
  ok(slots.validateFormAnswers(fields, {}).length === 1, 'form: thieu cau bat buoc -> 1 loi')
  ok(slots.validateFormAnswers(fields, { van_de: 'x', kenh: 'YouTube' }).length === 1, 'form: lua chon ngoai danh sach -> loi')
  ok(slots.validateFormAnswers(fields, { van_de: 'x', kenh: 'TikTok' }).length === 0, 'form: tra loi hop le -> khong loi')
  const clean = slots.sanitizeAnswers(fields, { van_de: '  noi dung  ', key_la: 'bo qua' })
  ok(clean.van_de === 'noi dung' && !('key_la' in clean), 'form: sanitize cat khoang trang + bo key la')
}

// --- 5) Kiểm tra lịch rảnh ---
{
  ok(slots.validateAvailabilityRules([{ weekday: 1, startMin: 540, endMin: 660 }]).length === 0, 'lich ranh: khung hop le')
  ok(slots.validateAvailabilityRules([{ weekday: 1, startMin: 660, endMin: 540 }]).length > 0, 'lich ranh: bat dau sau ket thuc -> loi')
  ok(slots.validateAvailabilityRules([
    { weekday: 2, startMin: 540, endMin: 660 },
    { weekday: 2, startMin: 600, endMin: 720 },
  ]).length > 0, 'lich ranh: hai khung chong nhau cung ngay -> loi')
  ok(slots.validateAvailabilityRules([
    { weekday: 2, startMin: 540, endMin: 660 },
    { weekday: 3, startMin: 600, endMin: 720 },
  ]).length === 0, 'lich ranh: trung gio nhung khac ngay -> hop le')
}

// --- 6) File .ics ---
{
  const content = ics.buildIcs({
    uid: 'booking-BK-TEST@brk-academy',
    startsAt: new Date('2026-10-26T02:00:00.000Z'),
    endsAt: new Date('2026-10-26T02:30:00.000Z'),
    summary: 'Cố vấn 1:1, buổi; đầu tiên',
    location: 'https://zoom.us/j/123',
  })
  ok(content.includes('DTSTART:20261026T020000Z'), 'ics: moc bat dau dung dinh dang')
  ok(content.includes('SUMMARY:Cố vấn 1:1\\, buổi\\; đầu tiên'), 'ics: thoat dau phay/cham phay trong tieu de')
  ok(content.startsWith('BEGIN:VCALENDAR') && content.includes('END:VCALENDAR'), 'ics: khung VCALENDAR day du')
}

// --- 7) Schema + migration ---
{
  const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8')
  for (const model of ['BookingSession', 'ExpertAvailability', 'AvailabilityException', 'Booking', 'BookingWaitlist']) {
    ok(schema.includes(`model ${model} {`), `schema: co model ${model}`)
  }
  for (const en of ['BookingSessionStatus', 'BookingMode', 'BookingStatus', 'BookingWaitlistStatus']) {
    ok(schema.includes(`enum ${en} {`), `schema: co enum ${en}`)
  }
  const migration = fs.readFileSync(path.join(root, 'prisma/migrations/20261023235900_add_booking_dat_lich/migration.sql'), 'utf8')
  ok(migration.includes('CREATE TABLE "Booking"'), 'migration: tao bang Booking')
  ok(migration.includes('CREATE TABLE "BookingSession"'), 'migration: tao bang BookingSession')
  ok(migration.includes('GRANT ALL PRIVILEGES ON TABLE public."Booking"'), 'migration: co khoi Grant cho bang moi')
}

// --- 8) Kiểm tra nguồn service / actions / routes ---
{
  const service = fs.readFileSync(path.join(root, 'lib/booking/service.ts'), 'utf8')
  ok(service.includes('pg_advisory_xact_lock'), 'service: dung khoa advisory chong trung')
  ok(service.includes('HOLD_MINUTES = 10'), 'service: giu cho 10 phut')
  ok(service.includes('crmContact') && service.includes('crmActivity.create') && service.includes('crmTask.create'), 'service: dong bo CRM contact/activity/task')
  ok(service.includes('notifyBookingCreated'), 'service: gui thong bao sau khi dat')
  const actions = fs.readFileSync(path.join(root, 'app/actions/booking-actions.ts'), 'utf8')
  ok(actions.includes("await auth()") && actions.includes('isExpertRole'), 'actions: bat dang nhap + vai tro chuyen gia')
  const confirmRoute = fs.readFileSync(path.join(root, 'app/api/booking/confirm/route.ts'), 'utf8')
  ok(confirmRoute.includes('auth()') && confirmRoute.includes('userId'), 'route confirm: gan tai khoan hoc vien khi da dang nhap')
  const wizard = fs.readFileSync(path.join(root, 'components/booking/BookingWizard.tsx'), 'utf8')
  ok(['Đặt lịch', 'Liên hệ', 'Biểu mẫu', 'Xác nhận'].every((s) => wizard.includes(s)), 'wizard: du 4 buoc nhu Bookify')
  const page = fs.readFileSync(path.join(root, 'app/dat-lich/[code]/page.tsx'), 'utf8')
  ok(page.includes('trk') && page.includes('tags'), 'trang dat lich: nhan tham so nguon trk + tags')
}

// --- 9) Giai đoạn 2: chính sách đổi/hủy + mốc nhắc hẹn (kiểm cả hai chiều) ---
{
  // Buổi hẹn 09:00 VN ngày 26/10/2026 = 02:00 UTC; hạn hủy trước 3 giờ.
  const startsAt = new Date('2026-10-26T02:00:00.000Z')
  const deadline = policy.guestModifyDeadline(startsAt, 3)
  ok(deadline.toISOString() === '2026-10-25T23:00:00.000Z', 'gd2: moc han doi/huy = bat dau tru 3 gio')
  ok(policy.checkGuestModify('CONFIRMED', startsAt, 3, new Date('2026-10-25T20:00:00.000Z')) === 'OK', 'gd2: con han -> duoc doi/huy')
  ok(policy.checkGuestModify('PENDING', startsAt, 3, new Date('2026-10-25T20:00:00.000Z')) === 'OK', 'gd2: cho xac nhan + con han -> duoc doi/huy')
  ok(policy.checkGuestModify('CONFIRMED', startsAt, 3, deadline) === 'OK', 'gd2: dung moc bien han -> van duoc')
  ok(policy.checkGuestModify('CONFIRMED', startsAt, 3, new Date(deadline.getTime() + 60_000)) === 'TOO_LATE', 'gd2: qua han 1 phut -> chan')
  ok(policy.checkGuestModify('CANCELLED', startsAt, 3, new Date('2026-10-25T20:00:00.000Z')) === 'NOT_MODIFIABLE', 'gd2: da huy -> khong doi/huy nua')
  ok(policy.checkGuestModify('COMPLETED', startsAt, 3, new Date('2026-10-25T20:00:00.000Z')) === 'NOT_MODIFIABLE', 'gd2: da hoan thanh -> khong doi/huy')
  ok(policy.checkGuestModify('CONFIRMED', startsAt, 0, startsAt) === 'OK', 'gd2: han 0 gio, ngay luc bat dau -> duoc')
  ok(policy.checkGuestModify('CONFIRMED', startsAt, 0, new Date(startsAt.getTime() + 1)) === 'TOO_LATE', 'gd2: han 0 gio, sau luc bat dau -> chan')

  const now = new Date('2026-10-25T02:00:00.000Z')
  const H = 60 * 60_000
  ok(policy.reminderKindFor(new Date(now.getTime() + 25 * H), now, false, false) === null, 'gd2: con 25 gio -> chua nhac')
  ok(policy.reminderKindFor(new Date(now.getTime() + 24 * H), now, false, false) === 'BEFORE_24H', 'gd2: dung 24 gio -> nhac moc 24 gio')
  ok(policy.reminderKindFor(new Date(now.getTime() + 24 * H), now, true, false) === null, 'gd2: da nhac 24 gio -> khong nhac lai')
  ok(policy.reminderKindFor(new Date(now.getTime() + 12 * H), now, true, false) === null, 'gd2: con 12 gio, da nhac 24 gio -> cho moc 1 gio')
  ok(policy.reminderKindFor(new Date(now.getTime() + H), now, true, false) === 'BEFORE_1H', 'gd2: dung 1 gio -> nhac moc 1 gio')
  ok(policy.reminderKindFor(new Date(now.getTime() + H), now, true, true) === null, 'gd2: da nhac 1 gio -> khong nhac lai')
  ok(policy.reminderKindFor(new Date(now.getTime() + 30 * 60_000), now, false, false) === 'BEFORE_1H', 'gd2: con 30 phut, chua nhac moc nao -> uu tien moc 1 gio')
  ok(policy.reminderKindFor(new Date(now.getTime() - 60_000), now, false, false) === null, 'gd2: da qua gio hen -> khong nhac')

  const schema2 = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8')
  ok(schema2.includes('reminder24SentAt') && schema2.includes('reminder1SentAt'), 'gd2: schema co hai cot moc nhac hen')
  const migration2 = fs.readFileSync(path.join(root, 'prisma/migrations/20261025210000_booking_gd2_reminder_marks/migration.sql'), 'utf8')
  ok(migration2.includes('ADD COLUMN "reminder24SentAt"') && migration2.includes('ADD COLUMN "reminder1SentAt"'), 'gd2: migration them hai cot moc nhac')
  ok(migration2.includes('Booking_status_startsAt_idx'), 'gd2: migration co index trang thai + gio bat dau cho cron')

  const service2 = fs.readFileSync(path.join(root, 'lib/booking/service.ts'), 'utf8')
  for (const fn of ['getGuestBooking', 'guestCancelBooking', 'guestRescheduleBooking', 'joinWaitlist', 'notifyWaitlistForDate', 'listWaitlist', 'listMyBookings']) {
    ok(service2.includes(`function ${fn}`), `gd2: service co ham ${fn}`)
  }
  ok(service2.includes('reminder24SentAt: null') && service2.includes('reminder1SentAt: null'), 'gd2: doi lich dat lai moc nhac ve null')
  ok(service2.includes('notifyBookingCancelled') && service2.includes('notifyBookingRescheduled'), 'gd2: huy/doi lich co gui thong bao')
  const cronLib = fs.readFileSync(path.join(root, 'lib/booking/cron.ts'), 'utf8')
  ok(cronLib.includes('runBookingCron') && cronLib.includes('Giữ chỗ hết hạn'), 'gd2: cron don giu cho het han')
  ok(cronLib.includes('reminderKindFor') && cronLib.includes('notifyWaitlistForDate'), 'gd2: cron nhac hen + quet danh sach cho')
  const cronRoute = fs.readFileSync(path.join(root, 'app/api/cron/booking-reminders/route.ts'), 'utf8')
  ok(cronRoute.includes('CRON_SECRET') && cronRoute.includes('runBookingCron'), 'gd2: route cron khoa CRON_SECRET')
  for (const route of ['lookup', 'guest-cancel', 'guest-reschedule', 'waitlist']) {
    const content = fs.readFileSync(path.join(root, `app/api/booking/${route}/route.ts`), 'utf8')
    ok(content.includes('bookingErrorResponse'), `gd2: route ${route} ton tai va chuan hoa loi`)
  }
  const portalPage = fs.readFileSync(path.join(root, 'app/tra-cuu-hen/page.tsx'), 'utf8')
  ok(portalPage.includes('GuestPortal'), 'gd2: trang /tra-cuu-hen dung GuestPortal')
  const portal = fs.readFileSync(path.join(root, 'components/booking/GuestPortal.tsx'), 'utf8')
  ok(portal.includes('/api/booking/lookup') && portal.includes('/api/booking/guest-cancel') && portal.includes('/api/booking/guest-reschedule'), 'gd2: cong khach goi du 3 API tra cuu/huy/doi')
  const wizard2 = fs.readFileSync(path.join(root, 'components/booking/BookingWizard.tsx'), 'utf8')
  ok(wizard2.includes('/api/booking/waitlist'), 'gd2: wizard co dang ky danh sach cho khi het slot')
  const panel = fs.readFileSync(path.join(root, 'components/booking/AdminBookingPanel.tsx'), 'utf8')
  ok(panel.includes('Danh sách chờ') && panel.includes('sendWaitlistInvite'), 'gd2: quan tri co tab danh sach cho + moi thu cong')
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/cron-jobs.yml'), 'utf8')
  ok(workflow.includes('/api/cron/booking-reminders'), 'gd2: workflow cron goi endpoint nhac hen moi gio')
  const ci = fs.readFileSync(path.join(root, '.github/workflows/security-ci.yml'), 'utf8')
  ok(ci.includes('node scripts/test-booking.cjs'), 'gd2: CI chay test-booking')
}

console.log(`test-booking: ${checks} checks PASS`)
