import { Prisma, PrismaClient } from '@prisma/client'
import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

type Db = Prisma.TransactionClient
type Link = { table: string; column: string; cascade: boolean }
export type UserIdChangePlan = {
  currentId: number; newId: number; name: string | null; email: string
  counts: { label: string; before: number; after: number }[]
  blockers: string[]; token?: string
}
export type UserIdChangeState = { message: string; plan?: UserIdChangePlan; completed?: boolean }
export class UserIdChangeError extends Error {}

// Những trường lưu ID thành viên nhưng chưa có khóa ngoại trong database.
const manualLinks: [string, string][] = [
  ['PasswordReset','userId'], ['BulkImportLog','userId'], ['YouTubeToken','userId'],
  ['mbtca_commission_level_snapshot','userId'], ['brk_transaction','sourceMemberId'],
  ['brk_revenue_award','userId'], ['brk_revenue_award','sourceMemberId'],
  ['brk_level_up_record','sourceMemberId'], ['brk_referral_bonus','sourceMemberId'],
  ['brk_system_log','sourceUserId'], ['brk_system_log','adminId'],
  ['brk_system_log','oldRefSysId'], ['brk_system_log','newRefSysId'],
  ['brk_activation_log','sourceUserId'], ['activity_log','userId'],
  ['brk_timeline_record','targetMemberId'], ['brk_timeline_record','sourceMemberId'],
  ['telegram_link_tokens','userId'], ['AffiliateConversion','customerId'],
  ['CrmContact','createdBy'], ['CrmFormSubmission','ownerId'],
  ['CrmRequest','ownerId'], ['CrmRequest','userId'], ['CrmActivity','authorId'],
  ['CrmTask','createdBy'], ['CrmCampaignReceipt','actorId'], ['LessonAnnouncement','senderId'],
]
const notificationFunctions = ['crm_request_notification', 'crm_task_reassignment_notification']
const quote = (value: string) => '"' + value.replace(/"/g, '""') + '"'
const field = (link: Link) => Prisma.raw('public.' + quote(link.table))
const column = (link: Link) => Prisma.raw(quote(link.column))
const retiredKey = (id: number) => `user-id-change:retired:${id}`

export function parseUserId(value: unknown): number {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || Number(value) > 2147483647) {
    throw new UserIdChangeError('ID phải là số nguyên dương; không đổi tài khoản gốc ID 0.')
  }
  return Number(value)
}
function secret() {
  const value = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET
  if (!value) throw new UserIdChangeError('Thiếu AUTH_SECRET để xác nhận bản kiểm tra.')
  return value
}
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
function sign(payload: string) { return createHmac('sha256', secret()).update('user-id-change:' + payload).digest('hex') }
function issue(actorId: number, snapshot: unknown) {
  const payload = `${actorId}:${Date.now() + 5 * 60000}:${digest(snapshot)}`
  return payload + ':' + sign(payload)
}
function verify(token: string, actorId: number, snapshot: unknown) {
  const parts = token.split(':')
  const [owner, expires, hash, mac] = parts
  const payload = parts.slice(0, 3).join(':')
  if (parts.length !== 4 || !/^[a-f0-9]{64}$/.test(mac || '') ||
      !timingSafeEqual(Buffer.from(mac), Buffer.from(sign(payload))) ||
      owner !== String(actorId) || !/^\d+$/.test(expires) || Number(expires) < Date.now() || hash !== digest(snapshot)) {
    throw new UserIdChangeError('Bản kiểm tra đã hết hạn hoặc dữ liệu thay đổi. Hãy kiểm tra lại.')
  }
}
async function requireAdmin(db: Db, actorId: number) {
  if (!Number.isInteger(actorId) || actorId < 0) throw new UserIdChangeError('Bạn cần đăng nhập bằng tài khoản quản trị.')
  const actor = await db.user.findUnique({ where: { id: actorId }, select: { role: true } })
  if (actor?.role !== 'ADMIN') throw new UserIdChangeError('Chỉ quản trị viên được đổi ID thành viên.')
}
async function links(db: Db): Promise<Link[]> {
  const foreign = await db.$queryRaw<Link[]>(Prisma.sql`
    SELECT t.relname AS "table", a.attname AS "column", c.confupdtype = 'c' AS cascade
    FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid
    JOIN pg_namespace n ON n.oid=t.relnamespace
    JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=c.conkey[1]
    WHERE c.contype='f' AND c.confrelid='public."User"'::regclass
      AND n.nspname='public' AND cardinality(c.conkey)=1
    ORDER BY t.relname,a.attname`)
  const result = [...foreign]
  for (const [table, col] of manualLinks) {
    if (!result.some(link => link.table === table && link.column === col)) result.push({ table, column: col, cascade: false })
  }
  return result
}
async function linkCounts(db: Db, allLinks: Link[], currentId: number, newId: number) {
  // Đếm toàn bộ liên kết trong một lượt query để tránh chờ hàng chục lần qua mạng.
  const parts = allLinks.map(link => Prisma.sql`SELECT ${link.table + '.' + link.column} AS label,
    count(*) FILTER (WHERE ${column(link)}=${currentId}) AS before,
    count(*) FILTER (WHERE ${column(link)}=${newId}) AS after FROM ${field(link)}
    WHERE ${column(link)} IN (${currentId},${newId})`)
  const rows = await db.$queryRaw<{ label: string; before: bigint; after: bigint }[]>(Prisma.join(parts, ' UNION ALL '))
  return rows.map(row => ({ label: row.label, before: Number(row.before), after: Number(row.after) }))
}
function rewriteHistory(value: Prisma.JsonValue, currentId: number, newId: number): Prisma.InputJsonValue {
  // Chỉ đổi khóa định danh trong sự kiện, không thay nội dung phản hồi hay con số khác.
  if (!Array.isArray(value)) return value as Prisma.InputJsonValue
  return value.map(event => {
    if (!event || Array.isArray(event) || typeof event !== 'object') return event
    return { ...event, ...(event.changedBy === currentId ? { changedBy: newId } : {}), ...(event.ownerId === currentId ? { ownerId: newId } : {}) }
  }) as Prisma.InputJsonValue
}
async function plan(db: Db, actorId: number, currentId: number, newId: number) {
  await requireAdmin(db, actorId)
  if (currentId === newId) throw new UserIdChangeError('ID mới phải khác ID hiện tại.')
  const user = await db.user.findUnique({ where: { id: currentId }, select: { id: true, name: true, email: true, updatedAt: true } })
  if (!user) throw new UserIdChangeError(`Không tìm thấy thành viên ID ${currentId}.`)
  if (await db.user.findUnique({ where: { id: newId }, select: { id: true } })) throw new UserIdChangeError(`ID ${newId} đã thuộc về một thành viên khác.`)
  if (await db.systemConfig.findUnique({ where: { key: retiredKey(newId) } })) throw new UserIdChangeError('ID này đã được đổi trước đây và không thể cấp lại.')
  const allLinks = await links(db)
  const counts = []
  const blockers: string[] = []
  const fks = await db.$queryRaw<{ table: string; column: string }[]>(Prisma.sql`
    SELECT t.relname AS "table",a.attname AS "column" FROM pg_constraint c
    JOIN pg_class t ON t.oid=c.conrelid JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=c.conkey[1]
    WHERE c.contype='f' AND c.confrelid='public."User"'::regclass AND c.confupdtype<>'c'`)
  const totals = await linkCounts(db, allLinks, currentId, newId)
  for (const link of allLinks) {
    const { before, after } = totals.find(row => row.label === link.table + '.' + link.column)!
    if (before || after) counts.push({ label: `${link.table}.${link.column}`, before, after })
    if (fks.some(fk => fk.table === link.table && fk.column === link.column) && before) blockers.push(`Cần cập nhật liên kết ${link.table}.${link.column} trong database (${before} bản ghi).`)
    if (!link.cascade && after) blockers.push(`${link.table}.${link.column} còn dữ liệu mang ID mới; cần kiểm tra trước khi cấp lại.`)
  }
  const guards = await db.$queryRaw<{ name: string; guarded: boolean }[]>(Prisma.sql`
    SELECT p.proname AS name,position('app.user_id_change' IN pg_get_functiondef(p.oid))>0 AS guarded
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname IN (${Prisma.join(notificationFunctions)})`)
  if (notificationFunctions.some(name => !guards.some(g => g.name === name && g.guarded))) blockers.push('Cần cập nhật database để đổi ID không tạo thông báo phân công CRM sai.')
  // Nhật ký tài chính có snapshot phục vụ hoàn tác: không tự viết lại cấu trúc chưa được xác minh.
  const pattern = `\\m${currentId}\\M`
  const logs = await db.$queryRaw<{ n: bigint }[]>(Prisma.sql`
    SELECT count(*) AS n FROM (
      SELECT id::text FROM public.brk_activation_log WHERE "affectedUserIds"::text ~ ${pattern} OR "walletSnapshots"::text ~ ${pattern} OR metadata::text ~ ${pattern}
      UNION ALL SELECT id::text FROM public.brk_system_log WHERE "oldChain"::text ~ ${pattern} OR "newChain"::text ~ ${pattern} OR subtree::text ~ ${pattern} OR metadata::text ~ ${pattern}
      UNION ALL SELECT id FROM public."BulkImportLog" WHERE summary::text ~ ${pattern}
    ) snapshots`)
  if (Number(logs[0].n)) blockers.push(`Có ${logs[0].n} nhật ký hoàn tác liên quan. Cần kiểm tra riêng trước khi đổi ID để giữ an toàn dữ liệu.`)
  const preferences = await db.systemConfig.findMany({ where: { key: { startsWith: `wi300:learning-hidden:${currentId}:` } }, orderBy: { key: 'asc' } })
  for (const pref of preferences) {
    if (await db.systemConfig.findUnique({ where: { key: pref.key.replace(`:${currentId}:`, `:${newId}:`) } })) blockers.push('ID mới đã có cấu hình học tập riêng; cần kiểm tra lại.')
  }
  const histories = await db.$queryRaw<{ id: string; history: Prisma.JsonValue }[]>(Prisma.sql`
    SELECT id,history FROM public."CrmRequest"
    WHERE jsonb_path_exists(history, '$[*] ? (@.changedBy == $id || @.ownerId == $id)', jsonb_build_object('id',${currentId}::int))
    ORDER BY id LIMIT 1001`)
  if (histories.length > 1000) blockers.push('Có hơn 1.000 lịch sử CRM liên quan; cần thực hiện bằng quy trình bảo trì riêng.')
  if (preferences.length) counts.push({ label: 'Cấu hình học tập WI300', before: preferences.length, after: 0 })
  if (histories.length) counts.push({ label: 'Lịch sử xử lý CRM', before: histories.length, after: 0 })
  const reserved = await db.reservedId.findUnique({ where: { id: newId } })
  const publicPlan: UserIdChangePlan = { currentId, newId, name: user.name, email: user.email, counts, blockers }
  return { publicPlan, allLinks, preferences, histories, snapshot: { publicPlan, user, preferences, histories, reserved } }
}

export async function changeUserId(db: PrismaClient, actorId: number, input: { currentId: unknown; newId: unknown; execute?: boolean; token?: string }): Promise<UserIdChangeState> {
  const currentId = parseUserId(input.currentId), newId = parseUserId(input.newId)
  if (!input.execute) {
    const preview = await db.$transaction(async tx => {
      await tx.$executeRaw(Prisma.sql`SET TRANSACTION READ ONLY`)
      return plan(tx, actorId, currentId, newId)
    }, { isolationLevel: 'RepeatableRead', timeout: 20000 })
    if (!preview.publicPlan.blockers.length) preview.publicPlan.token = issue(actorId, preview.snapshot)
    return { message: preview.publicPlan.blockers.length ? 'Error: Chưa thể đổi ID. Xem các mục cần xử lý bên dưới.' : 'Đã kiểm tra. Xác nhận bên dưới nếu thông tin đúng.', plan: preview.publicPlan }
  }
  if (!input.token) throw new UserIdChangeError('Hãy kiểm tra trước khi xác nhận đổi ID.')
  return db.$transaction(async tx => {
    await requireAdmin(tx, actorId)
    // Khóa ngắn trong giao dịch để tránh hai quản trị viên đổi cùng lúc hoặc đăng ký chen ngang.
    await tx.$executeRaw(Prisma.sql`LOCK TABLE public."User" IN SHARE ROW EXCLUSIVE MODE`)
    const preview = await plan(tx, actorId, currentId, newId)
    if (preview.publicPlan.blockers.length) throw new UserIdChangeError(preview.publicPlan.blockers.join(' '))
    verify(input.token!, actorId, preview.snapshot)
    await tx.$queryRaw(Prisma.sql`SELECT set_config('app.user_id_change','on',true)`)
    const affected = await tx.$executeRaw(Prisma.sql`UPDATE public."User" SET id=${newId},"updatedAt"=CURRENT_TIMESTAMP WHERE id=${currentId}`)
    if (affected !== 1) throw new UserIdChangeError('Tài khoản đã thay đổi. Hãy kiểm tra lại.')
    for (const link of preview.allLinks.filter(link => !link.cascade)) {
      await tx.$executeRaw(Prisma.sql`UPDATE ${field(link)} SET ${column(link)}=${newId} WHERE ${column(link)}=${currentId}`)
    }
    for (const pref of preview.preferences) {
      await tx.$executeRaw(Prisma.sql`UPDATE public."SystemConfig" SET key=${pref.key.replace(`:${currentId}:`, `:${newId}:`)} WHERE key=${pref.key}`)
    }
    for (const row of preview.histories) {
      const history = rewriteHistory(row.history, currentId, newId)
      await tx.$executeRaw(Prisma.sql`UPDATE public."CrmRequest" SET history=${JSON.stringify(history)}::jsonb WHERE id=${row.id}`)
    }
    // ID cũ được giữ lại để phiên đăng nhập cũ không vô tình trỏ sang tài khoản khác.
    await tx.reservedId.upsert({ where: { id: currentId }, create: { id: currentId, note: `Đã đổi sang ${newId}; không cấp lại` }, update: {} })
    await tx.systemConfig.create({ data: { key: retiredKey(currentId), value: { newId, actorId, changedAt: new Date().toISOString() } } })
    await tx.reservedId.deleteMany({ where: { id: newId } })
    const verifiedCounts = []
    const totals = await linkCounts(tx, preview.allLinks, currentId, newId)
    for (const link of preview.allLinks) {
      const { before: oldCount, after: newCount } = totals.find(row => row.label === link.table + '.' + link.column)!
      const expected = preview.publicPlan.counts.find(c => c.label === `${link.table}.${link.column}`)
      if (oldCount || newCount !== (expected ? expected.before + expected.after : 0)) throw new UserIdChangeError('Dữ liệu liên quan chưa khớp. Giao dịch đã được hủy.')
      if (expected) verifiedCounts.push({ label: expected.label, before: expected.before, after: newCount })
    }
    for (const pref of preview.preferences) {
      if (await tx.systemConfig.findUnique({ where: { key: pref.key } }) ||
          !await tx.systemConfig.findUnique({ where: { key: pref.key.replace(`:${currentId}:`, `:${newId}:`) } })) {
        throw new UserIdChangeError('Cấu hình học tập chưa khớp. Giao dịch đã được hủy.')
      }
    }
    for (const row of preview.histories) {
      const actual = await tx.crmRequest.findUnique({ where: { id: row.id }, select: { history: true } })
      if (JSON.stringify(actual?.history) !== JSON.stringify(rewriteHistory(row.history, currentId, newId))) {
        // JSONB có thể sắp xếp lại khóa: so sánh hash theo cấu trúc chuẩn.
        const canonical = (value: unknown): string => JSON.stringify(value, (_, child) =>
          child && typeof child === 'object' && !Array.isArray(child)
            ? Object.fromEntries(Object.entries(child).sort(([a], [b]) => a.localeCompare(b))) : child)
        if (canonical(actual?.history) !== canonical(rewriteHistory(row.history, currentId, newId))) throw new UserIdChangeError('Lịch sử CRM chưa khớp. Giao dịch đã được hủy.')
      }
    }
    for (const label of ['Cấu hình học tập WI300', 'Lịch sử xử lý CRM']) {
      const expected = preview.publicPlan.counts.find(row => row.label === label)
      if (expected) verifiedCounts.push({ label, before: expected.before, after: expected.before })
    }
    if (await tx.user.findUnique({ where: { id: currentId } }) || !await tx.user.findUnique({ where: { id: newId } })) throw new UserIdChangeError('Kiểm tra tài khoản sau đổi không thành công.')
    // Chỉ tăng sequence, không kéo lùi số tự động khi chuyển sang ID nhỏ hơn.
    const sequences = await tx.$queryRaw<{ name: string }[]>(Prisma.sql`SELECT pg_get_serial_sequence('public."User"','id') AS name`)
    const sequence = sequences[0]?.name
    if (!sequence || !/^(public\.)?"?[A-Za-z_][A-Za-z0-9_]*"?$/.test(sequence)) throw new UserIdChangeError('Không xác định được bộ cấp ID tự động.')
    await tx.$queryRaw(Prisma.sql`SELECT setval(${sequence}::regclass,GREATEST((SELECT last_value FROM ${Prisma.raw(sequence)}),(SELECT max(id) FROM public."User")),true)`)
    return { message: `Success: Đã đổi ID ${currentId} → ${newId}. Thành viên cần đăng nhập lại.`, completed: true, plan: { ...preview.publicPlan, counts: verifiedCounts } }
  }, { isolationLevel: 'Serializable', timeout: 30000 })
}
