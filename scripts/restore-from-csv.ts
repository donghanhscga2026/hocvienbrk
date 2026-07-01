import { PrismaClient, Role, EnrollmentStatus } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()
const BCRYPT_ROUNDS = 10

function parseDate(value: string): Date | null {
  if (!value || value.trim() === '') return null
  // Try dd/mm/yyyy hh:mm:ss
  const parts = value.split(/[\s\/:]/)
  if (parts.length >= 3) {
    const d = parseInt(parts[0]), m = parseInt(parts[1]) - 1, y = parseInt(parts[2])
    const h = parseInt(parts[3] || '0'), min = parseInt(parts[4] || '0'), s = parseInt(parts[5] || '0')
    return new Date(y, m, d, h, min, s)
  }
  return new Date(value)
}

function parseBool(value: string): boolean {
  return value?.toUpperCase() === 'TRUE'
}

async function hashPassword(password: string): Promise<string> {
  try { return await bcrypt.hash(password, BCRYPT_ROUNDS) }
  catch { return password }
}

async function importUsers() {
  console.log('\n=== Import Users ===')
  const raw = fs.readFileSync(path.join(__dirname, '..', 'User.csv'), 'utf-8')
  const lines = raw.trim().split('\n')
  const headers = lines[0].split(',')
  let count = 0, errors = 0

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',')
    const row: any = {}
    headers.forEach((h, idx) => row[h.trim()] = vals[idx]?.trim() || '')

    try {
      const hashedPw = await hashPassword(row.password)
      const uid = parseInt(row.id)

      const existing = await prisma.user.findUnique({ where: { id: uid } })
      let role = Role.STUDENT
      if (row.role === 'ADMIN' || row.role === 'admin') role = Role.ADMIN
      else if (row.role === 'TEACHER' || row.role === 'teacher') role = Role.TEACHER

      const data: any = {
        id: uid,
        name: row.name || null,
        email: row.email || null,
        phone: row.phone || null,
        password: hashedPw,
        role,
        referrerId: row.referrerId ? parseInt(row.referrerId) : null,
        createdAt: parseDate(row.createdAt) || new Date(),
        updatedAt: parseDate(row.updatedAt) || new Date(),
      }

      if (existing) {
        await prisma.user.update({ where: { id: uid }, data })
        console.log(`  UPDATE user ${uid}: ${row.name}`)
      } else {
        await prisma.user.create({ data })
        console.log(`  CREATE user ${uid}: ${row.name}`)
      }
      count++
    } catch (e: any) {
      console.error(`  ERROR user ${row.id}: ${e.message}`)
      errors++
    }
  }
  console.log(`Users done: ${count} OK, ${errors} errors`)
}

async function importCourses() {
  console.log('\n=== Import Courses ===')
  const raw = fs.readFileSync(path.join(__dirname, '..', 'Course.csv'), 'utf-8')
  const lines = raw.trim().split('\n')
  const headers = lines[0].split(',')
  let count = 0, errors = 0

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',')
    const row: any = {}
    headers.forEach((h, idx) => row[h.trim()] = vals[idx]?.trim() || '')

    try {
      const cid = parseInt(row.id)
      const data: any = {
        id: cid,
        id_khoa: row.id_khoa,
        name_lop: row.name_lop || '',
        name_khoa: row.name_khoa || null,
        date_join: row.date_join || null,
        status: parseBool(row.status),
        mo_ta_dai: row.mo_ta_dai || null,
        mo_ta_ngan: row.mo_ta_ngan || null,
        link_zalo: row.link_zalo || null,
        phi_coc: parseInt(row.phi_coc) || 0,
        stk: row.stk || null,
        name_stk: row.name_stk || null,
        bank_stk: row.bank_stk || null,
        noidung_stk: row.noidung_stk || null,
        link_qrcode: row.link_qrcode || null,
        file_email: row.file_email || null,
        noidung_email: row.noidung_email || null,
        link_anh_bia: row.link_anh_bia_khoa || null,
        type: 'NORMAL',
        category: 'Khác',
      }

      const existing = await prisma.course.findUnique({ where: { id: cid } })
      if (existing) {
        await prisma.course.update({ where: { id: cid }, data })
        console.log(`  UPDATE course ${cid}: ${row.name_lop}`)
      } else {
        await prisma.course.create({ data })
        console.log(`  CREATE course ${cid}: ${row.name_lop}`)
      }
      count++
    } catch (e: any) {
      console.error(`  ERROR course ${row.id}: ${e.message}`)
      errors++
    }
  }
  console.log(`Courses done: ${count} OK, ${errors} errors`)
}

async function importEnrollments() {
  console.log('\n=== Import Enrollments ===')
  const raw = fs.readFileSync(path.join(__dirname, '..', 'Enrollment.csv'), 'utf-8')
  const lines = raw.trim().split('\n')
  const headers = lines[0].split(',')
  let count = 0, errors = 0

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',')
    const row: any = {}
    headers.forEach((h, idx) => row[h.trim()] = vals[idx]?.trim() || '')

    try {
      const eid = parseInt(row.id)
      const status = row.status?.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'PENDING'

      const data: any = {
        id: eid,
        userId: parseInt(row.userId),
        courseId: parseInt(row.courseId),
        status: status as EnrollmentStatus,
        phi_coc: parseInt(row.phi_coc) || 0,
        link_anh_coc: row.link_anh_coc || null,
        createdAt: parseDate(row.createdAt) || new Date(),
        updatedAt: parseDate(row.updatedAt) || new Date(),
        startedAt: parseDate(row.startedAt),
      }

      const existing = await prisma.enrollment.findUnique({ where: { id: eid } })
      if (existing) {
        await prisma.enrollment.update({ where: { id: eid }, data })
      } else {
        await prisma.enrollment.create({ data })
      }
      count++
      if (count % 200 === 0) console.log(`  ${count} enrollments...`)
    } catch (e: any) {
      console.error(`  ERROR enrollment ${row.id}: ${e.message}`)
      errors++
    }
  }
  console.log(`Enrollments done: ${count} OK, ${errors} errors`)
}

async function importMatrix() {
  console.log('\n=== Import System Matrix (Genealogy) ===')
  const fp = path.join(__dirname, '..', 'matrix_output_new.csv')
  if (!fs.existsSync(fp)) { console.log('  File not found, skip'); return }
  const raw = fs.readFileSync(fp, 'utf-8')
  const lines = raw.trim().split('\n')
  let count = 0, errors = 0

  for (let i = 1; i < lines.length; i++) {
    const [userIdStr, onSystemStr, refSysIdStr] = lines[i].split(',')
    const userId = parseInt(userIdStr)
    const onSystem = parseInt(onSystemStr)
    const refSysId = parseInt(refSysIdStr || '0')

    try {
      await prisma.system.upsert({
        where: { userId_onSystem: { userId, onSystem } },
        update: { refSysId },
        create: {
          userId, onSystem, refSysId,
          status: 'ACTIVE',
          activatedAt: new Date(),
          level: 1,
        }
      })
      count++
    } catch (e: any) {
      errors++
    }
  }
  console.log(`Matrix done: ${count} OK, ${errors} errors`)
}

async function main() {
  console.log('🚀 Bắt đầu phục hồi dữ liệu từ CSV...\n')

  // 1. Clear previously seeded data that conflicts
  console.log('Clearing conflict data...')
  await prisma.enrollment.deleteMany({ where: {} })
  await prisma.course.deleteMany({ where: {} })
  await prisma.user.deleteMany({ where: {} })
  await prisma.system.deleteMany({ where: {} })
  await prisma.systemClosure.deleteMany({ where: {} })
  const brkCourse = await prisma.course.findFirst({ where: { type: 'SYS' } })
  if (brkCourse) await prisma.course.delete({ where: { id: brkCourse.id } })

  // 2. Import from CSVs
  await importUsers()
  await importCourses()
  await importEnrollments()
  await importMatrix()

  // 3. Re-run seed scripts for platform config
  console.log('\n=== Re-seed platform config ===')

  // Re-create SYS course for BRK
  const sysCourse = await prisma.course.create({
    data: {
      id_khoa: 'BRK-SYS-01',
      name_lop: 'BRK Hệ Thống',
      type: 'SYS',
      status: true,
      phi_coc: 25000,
      stk: '0541001199966',
      name_stk: 'NGUYEN DUY HUNG',
      bank_stk: 'SACOMBANK',
      noidung_stk: 'BRK {SDT} {HOTEN}',
      mo_ta_ngan: 'Hệ thống BRK Affiliate - Kích hoạt tài khoản $1',
    }
  })
  console.log(`SYS course re-created: id=${sysCourse.id}`)

  // Link to SystemTree
  const tree = await prisma.systemTree.findUnique({ where: { onSystem: 4 } })
  if (tree) {
    await prisma.systemTree.update({ where: { onSystem: 4 }, data: { courseId: sysCourse.id } })
    console.log('SystemTree BRK linked to SYS course')
  }

  // Re-create SystemTree BRK if missing
  if (!tree) {
    await prisma.systemTree.create({
      data: {
        onSystem: 4,
        nameSystem: 'BRK',
        fee: 1,
        durationDays: 30,
        graceDays: 7,
        returnPct: 21,
        courseId: sysCourse.id,
      }
    })
  }

  console.log('\n🎉 Phục hồi hoàn tất!')
  console.log(`   Users: ${await prisma.user.count()}`)
  console.log(`   Courses: ${await prisma.course.count()}`)
  console.log(`   Enrollments: ${await prisma.enrollment.count()}`)
  console.log(`   Systems: ${await prisma.system.count()}`)
}

main()
  .catch(e => { console.error('❌ Restore failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
