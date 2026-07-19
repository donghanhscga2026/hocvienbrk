/**
 * GIẢ LẬP processGracePeriodExpirations — Method B
 * Hiển thị LỊCH SỬ TIMELINE đầy đủ cho từng member (như trên UI)
 * including records hiện có từ DB + record RETURN_FEE mới
 *
 * CHẠY: npx tsx scripts/sim-grace-july3.ts
 * OUTPUT: plan_temp/sim-grace-july3-result.txt
 */
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()
const OUTPUT_FILE = 'plan_temp/sim-grace-july3-result.txt'
const SIM_TIME = new Date('2026-07-03T17:05:00.000Z') // 00:05 VN ngày 04/07
const ON_SYSTEM = 4

const MBDT_BASE = 12_000_000
const MBDT_MIN = 12_868_686
const MBDT_MAX = 14_686_868

function generateMBDT(): number {
  return Math.floor(Math.random() * (MBDT_MAX - MBDT_MIN + 1)) + MBDT_MIN
}
function mbdtToMbp(mbdt: number): number {
  return Math.round((mbdt / MBDT_BASE) * 16 * 1000) / 1000
}
function fmt(n: number): string { return n.toLocaleString('vi-VN') }
function fmtDate(d: Date): string {
  return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

const output: string[] = []
function log(line: string = '') { output.push(line) }

async function main() {
  log('═══════════════════════════════════════════════════════════════════════════')
  log('  GIẢ LẬP processGracePeriodExpirations — METHOD B')
  log(`  Thời gian: ${fmtDate(SIM_TIME)} (${SIM_TIME.toISOString()})`)
  log(`  Hệ thống: #${ON_SYSTEM}`)
  log('═══════════════════════════════════════════════════════════════════════════')
  log()

  const promoConfig = await prisma.systemConfig.findUnique({ where: { key: 'brk_promotion_logic' } })
  log(`Promotion Logic: ${promoConfig?.value || 'N/A'} → METHOD B`)
  log()

  const systemTree = await prisma.systemTree.findUnique({ where: { onSystem: ON_SYSTEM } })
  if (!systemTree) { log('ERROR: SystemTree #4 not found'); return }
  const fee = Number(systemTree.fee)
  const returnPct = Number(systemTree.returnPct)
  const graceDays = systemTree.graceDays || 1
  log(`SystemTree #${ON_SYSTEM}: fee=${fmt(fee)} VND, return=${returnPct}%, grace=${graceDays} ngày`)
  log()

  const allSystems = await prisma.system.findMany({
    where: { onSystem: ON_SYSTEM, status: 'ACTIVE' },
    include: { user: { select: { id: true, name: true } } },
  })

  const eligible = allSystems.filter(s => s.gracePeriodEnd && s.gracePeriodEnd <= SIM_TIME)
  eligible.sort((a, b) => a.gracePeriodEnd!.getTime() - b.gracePeriodEnd!.getTime())

  log(`Tổng ACTIVE: ${allSystems.length}, Eligible: ${eligible.length}`)
  log()

  if (eligible.length === 0) {
    log('Không có member nào cần xử lý.')
    fs.mkdirSync('plan_temp', { recursive: true })
    fs.writeFileSync(OUTPUT_FILE, output.join('\n'), 'utf-8')
    return
  }

  let processed = 0
  const skippedMembers: { userId: number; reason: string }[] = []
  const summaryWallet: { userId: number; name: string; cash: number; brkd: number }[] = []

  // ═══ XỬ LÝ TỪNG MEMBER ═══
  for (const member of eligible) {
    const recordTime = SIM_TIME // Dùng cron time, KHÔNG phải gracePeriodEnd
    const name = member.user?.name || 'N/A'
    const returnRefId = `return_fee_sys_${ON_SYSTEM}_user_${member.userId}`
    const brkdRefId = `return_brkd_sys_${ON_SYSTEM}_user_${member.userId}`

    log('═══════════════════════════════════════════════════════════════════════════')
    log(`  👤 #${member.userId} — ${name}`)
    log(`  gracePeriodEnd: ${fmtDate(member.gracePeriodEnd!)}`)
    log(`  recordTime (cron): ${fmtDate(recordTime)}`)
    log(`  Level hiện tại: ${member.level} | Points: ${member.totalPoints}`)
    log('═══════════════════════════════════════════════════════════════════════════')
    log()

    // Check duplicate trong DB
    const memberWallet = await prisma.brkWallet.findUnique({ where: { userId: member.userId } })
    if (memberWallet) {
      const existingRefund = await prisma.brkTransaction.findFirst({
        where: { walletId: memberWallet.id, type: 'RETURN_FEE', refId: returnRefId }
      })
      if (existingRefund) {
        log(`  ⚠️  SKIP: đã có RETURN_FEE trong DB`)
        skippedMembers.push({ userId: member.userId, reason: 'RETURN_FEE already exists in DB' })
        log()
        continue
      }
    }

    // ─── ĐỌC TOÀN BỘ TIMELINE RECORDS TỪ DB ───
    const dbRecords = await prisma.brkTimelineRecord.findMany({
      where: { userId: member.userId, onSystem: ON_SYSTEM },
      orderBy: { id: 'asc' },
      select: {
        id: true, type: true, time: true, title: true, description: true,
        accumulatedCash: true, accumulatedBrkd: true, accumulatedBrkp: true,
        accumulatedTeamSize: true, accumulatedBrkdVolume: true, accumulatedCashVolume: true,
        amountCash: true, amountBrkd: true, amountVoucher: true,
        txType: true, targetMemberId: true, targetMemberName: true,
        pathStr: true, fromLevel: true, toLevel: true, sourceMemberId: true,
      }
    })

    // Đọc wallet hiện tại từ DB
    const dbWallet = await prisma.brkWallet.findUnique({ where: { userId: member.userId } })
    const dbCash = dbWallet ? Number(dbWallet.balance) : 0
    const dbBrkd = dbWallet ? Number(dbWallet.brkd) : 0

    log(`  ┌─ LỊCH SỬ HIỆN TẠI (từ DB) ─ ${dbRecords.length} records ─────────────────────────────┐`)
    log(`  │`)
    log(`  │  Ví hiện tại: Cash=${fmt(dbCash)} VND | BRKD=${fmt(dbBrkd)}`)
    log(`  │`)

    for (const r of dbRecords) {
      const timeStr = fmtDate(new Date(r.time))
      const typeTag = r.txType ? `[${r.type}/${r.txType}]` : `[${r.type}]`
      const levelTag = (r.fromLevel != null && r.toLevel != null) ? ` Cấp ${r.fromLevel}→${r.toLevel}` : ''
      const targetTag = r.targetMemberId ? ` → #${r.targetMemberId}` : ''
      const pathTag = r.pathStr ? ` (${r.pathStr})` : ''

      log(`  │  ─────────────────────────────────────────────────────────────`)
      log(`  │  id=${r.id} | ${typeTag}${levelTag}${targetTag}${pathTag}`)
      log(`  │  📅 ${timeStr}`)
      log(`  │  📝 ${r.title}`)
      if (r.description && r.description.length > 0) {
        const descShort = r.description.length > 100 ? r.description.substring(0, 100) + '...' : r.description
        log(`  │  💬 ${descShort}`)
      }
      log(`  │  💰 Cash: ${fmt(Number(r.amountCash))} | BRKD: ${fmt(Number(r.amountBrkd))} | Voucher: ${fmt(Number(r.amountVoucher))}`)
      log(`  │  📊 Tích lũy: Cash=${fmt(Number(r.accumulatedCash))} BRKD=${fmt(Number(r.accumulatedBrkd))} BRKP=${fmt(Number(r.accumulatedBrkp))} Team=${Number(r.accumulatedTeamSize)}`)
      log(`  │  📈 Doanh số: CashVol=${fmt(Number(r.accumulatedCashVolume))} BRKdVol=${fmt(Number(r.accumulatedBrkdVolume))}`)
      log(`  │`)
    }
    log(`  └────────────────────────────────────────────────────────────────┘`)
    log()

    // ─── TÍNH TOÁN RECORD MỚI ───
    const memberMBDT = generateMBDT()
    const memberMBP = mbdtToMbp(memberMBDT)
    const returnAmount = Math.round((fee * returnPct) / 100)
    const brkdReturn = Math.round((memberMBDT * returnPct) / 100)

    // Đọc last record để tính teamSize
    const lastRec = dbRecords.length > 0 ? dbRecords[dbRecords.length - 1] : null
    const teamSizeNew = lastRec ? lastRec.accumulatedTeamSize : 1 // RETURN_FEE giữ nguyên

    // Tính accumulated values mới (sau khi credit)
    // BRKP: system.totalPoints đã được +memberMBP ở step 1 (trước khi tạo timeline record)
    const newCash = dbCash + returnAmount
    const newBrkd = dbBrkd + brkdReturn
    const newBrkp = memberMBP // system.totalPoints = memberMBP (vừa + ở step 1)

    // RETURN_FEE: volume增加
    const newCashVol = lastRec ? Number(lastRec.accumulatedCashVolume) + fee : fee
    const newBrkdVol = lastRec ? Number(lastRec.accumulatedBrkdVolume) + Math.round(memberMBDT / 0.21) : Math.round(memberMBDT / 0.21)

    log(`  ┌─ RECORD MỚI SẼ TẠO ──────────────────────────────────────────────────┐`)
    log(`  │`)
    log(`  │  🆔 id: (auto-generated)`)
    log(`  │  📅 time: ${fmtDate(recordTime)} (cron time — KHÔNG phải gracePeriodEnd)`)
    log(`  │  📝 type: [TRANSACTION/RETURN_FEE]`)
    log(`  │  📝 title: "Chính thức tham gia"`)
    log(`  │  📝 description: "Được hoàn ${returnPct}% phí tham gia sau ${graceDays} ngày cân nhắc. Cấp 1. Tỷ lệ hoa hồng: 21%."`)
    log(`  │  📝 fromLevel: 0 → toLevel: 1`)
    log(`  │`)
    log(`  │  💰 amountCash: +${fmt(returnAmount)} (21% × ${fmt(fee)} VND)`)
    log(`  │  💰 amountBrkd: +${fmt(brkdReturn)} (21% × ${fmt(memberMBDT)} MBDT)`)
    log(`  │  💰 amountVoucher: 0`)
    log(`  │`)
    log(`  │  📊 Tích lũy SAU KHI TẠO:`)
    log(`  │    Cash:    ${fmt(dbCash)} → ${fmt(newCash)}  (+${fmt(returnAmount)})`)
    log(`  │    BRKD:    ${fmt(dbBrkd)} → ${fmt(newBrkd)}  (+${fmt(brkdReturn)})`)
    log(`  │    BRKP:    ${lastRec ? fmt(Number(lastRec.accumulatedBrkp)) : '0'} → ${fmt(newBrkp)}  (+${fmt(memberMBP)} — điểm MBP cá nhân sau khi thăng cấp 1)`)
    log(`  │    Team:    ${lastRec?.accumulatedTeamSize ?? 1} → ${teamSizeNew}  (giữ nguyên — RETURN_FEE không phải ACTIVATION/ADJUSTMENT)`)
    log(`  │    CashVol: ${lastRec ? fmt(Number(lastRec.accumulatedCashVolume)) : '0'} → ${fmt(newCashVol)}`)
    log(`  │    BRKdVol: ${lastRec ? fmt(Number(lastRec.accumulatedBrkdVolume)) : '0'} → ${fmt(newBrkdVol)}`)
    log(`  │`)
    log(`  └────────────────────────────────────────────────────────────────┘`)
    log()

    // Check BRKD refund idempotency
    log(`  ── BRKD REFUND: id=${brkdRefId}`)
    log(`  ── RETURN_FEE REFUND: id=${returnRefId}`)
    log()

    summaryWallet.push({ userId: member.userId, name, cash: returnAmount, brkd: brkdReturn })
    processed++
  }

  // ═════════════════════════════════════════════════════════════
  //  TÓM TẮT
  // ═════════════════════════════════════════════════════════════
  log('═══════════════════════════════════════════════════════════════════════════')
  log('  TÓM TẮT KẾT QUẢ')
  log('═══════════════════════════════════════════════════════════════════════════')
  log()
  log(`Method: B | Thời gian: ${fmtDate(SIM_TIME)} | Hệ thống: #${ON_SYSTEM}`)
  log(`Eligible: ${eligible.length} | Xử lý: ${processed} | Bỏ qua: ${skippedMembers.length}`)
  if (skippedMembers.length > 0) {
    for (const s of skippedMembers) log(`  ⚠️  #${s.userId}: ${s.reason}`)
  }
  log()

  let totalCash = 0, totalBrkd = 0
  log('── THAY ĐỔI VÍ ──')
  for (const w of summaryWallet) {
    totalCash += w.cash
    totalBrkd += w.brkd
    log(`  #${w.userId} ${w.name}: Cash +${fmt(w.cash)} | BRKD +${fmt(w.brkd)}`)
  }
  log()
  log(`  Tổng Cash: ${fmt(totalCash)} VND`)
  log(`  Tổng BRKD: ${fmt(totalBrkd)}`)
  log()

  log('═══════════════════════════════════════════════════════════════════════════')
  log('  ✅ READ-ONLY SIMULATION — KHÔNG GHI VÀO DB')
  log('═══════════════════════════════════════════════════════════════════════════')

  fs.mkdirSync('plan_temp', { recursive: true })
  fs.writeFileSync(OUTPUT_FILE, output.join('\n'), 'utf-8')
  console.log(`\n✅ Kết quả: ${OUTPUT_FILE} (${output.length} dòng)`)
}

main()
  .catch(e => { console.error('Fatal:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
