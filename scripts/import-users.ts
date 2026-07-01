import { PrismaClient, Role } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

function parseDate(val: string | undefined | null): Date | null {
  if (!val || val.trim() === '' || val === 'TRUE' || val === 'FALSE') return null
  const s = val.trim()

  // dd-MM-yy HH:mm  (ví dụ: 05-08-23 23:08)
  const m1 = s.match(/^(\d{2})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/)
  if (m1) {
    const [_, d, m, y, h, min] = m1
    const year = parseInt(y) + (parseInt(y) < 50 ? 2000 : 1900)
    return new Date(year, parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min))
  }

  // dd-MM-yy HH:mm:ss  (nếu có)
  const m2 = s.match(/^(\d{2})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/)
  if (m2) {
    const [_, d, m, y, h, min, sec] = m2
    const year = parseInt(y) + (parseInt(y) < 50 ? 2000 : 1900)
    return new Date(year, parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min), parseInt(sec))
  }

  // dd-MM-yy  (chỉ ngày)
  const m3 = s.match(/^(\d{2})-(\d{2})-(\d{2})$/)
  if (m3) {
    const [_, d, m, y] = m3
    const year = parseInt(y) + (parseInt(y) < 50 ? 2000 : 1900)
    return new Date(year, parseInt(m) - 1, parseInt(d))
  }

  // ISO format
  const ts = Date.parse(s)
  if (!isNaN(ts)) return new Date(ts)

  return null
}

function mapRole(r: string): Role {
  const role = r?.trim()?.toUpperCase() || ''
  if (role === 'ADMIN') return Role.ADMIN
  if (role === 'TEACHER') return Role.TEACHER
  if (role === 'INSTRUCTOR') return Role.INSTRUCTOR
  if (role === 'AFFILIATE') return Role.AFFILIATE
  return Role.STUDENT
}

async function main() {
  console.log('🚀 Import Users from backup CSV...\n')

  const filePath = path.join(__dirname, '..', 'backups', 'User_rows 1028_bak.csv')
  if (!fs.existsSync(filePath)) {
    console.error('❌ File not found:', filePath)
    process.exit(1)
  }

  const raw = fs.readFileSync(filePath, 'utf-8')
  // Remove BOM if present
  const clean = raw.replace(/^\uFEFF/, '')
  const lines = clean.trim().split('\n')

  const headers = lines[0].split(',')
  console.log('Headers:', headers.join(', '))
  console.log('Total records:', lines.length - 1, '\n')

  // Bypass FK constraints temporarily (for self-referencing referrerId)
  await prisma.$executeRawUnsafe("SET session_replication_role = replica")

  let success = 0
  let errors = 0
  let skipped = 0

  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(',')
    if (vals.length < 4) { skipped++; continue }

    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h.trim()] = (vals[idx] || '').trim() })

    const uid = parseInt(row['id'])
    if (isNaN(uid)) { skipped++; continue }

    let email = row['email'] || null
    let phone = row['phone'] || null
    let affiliateCode = row['affiliateCode'] || null

    try {
      const referrerIdVal = row['referrerId'] ? parseInt(row['referrerId']) : null
      const referrerId = (!referrerIdVal || isNaN(referrerIdVal) || referrerIdVal === uid) ? null : referrerIdVal

      const createdAt = parseDate(row['createdAt'])
      const updatedAt = parseDate(row['updatedAt']) || createdAt || new Date()
      const emailVerified = parseDate(row['emailVerified'])

      const data: any = {
        id: uid,
        name: row['name'] || null,
        email: email,
        emailVerified: emailVerified,
        image: row['image'] || null,
        password: row['password'] || null,
        phone: phone,
        role: mapRole(row['role']),
        referrerId: referrerId,
        createdAt: createdAt || new Date(),
        updatedAt: updatedAt,
        passwordChanged: row['passwordChanged']?.toUpperCase() === 'TRUE',
        affiliateCode: affiliateCode || null,
        bankAccount: row['bankAccount'] || null,
        bankHolder: row['bankHolder'] || null,
        bankName: row['bankName'] || null,
        idCardNumber: row['idCardNumber'] || null,
      }

      await prisma.user.upsert({
        where: { id: uid },
        update: data,
        create: data,
      })

      success++
      if (success % 200 === 0) console.log(`  ${success} users imported...`)
    } catch (e: any) {
      console.error(`  ❌ User ${uid} (${row['name']}): ${e.message.substring(0, 100)}`)
      errors++
    }
  }

  // Re-enable FK constraints
  await prisma.$executeRawUnsafe("SET session_replication_role = DEFAULT")

  const total = await prisma.user.count()
  console.log(`\n✅ Done: ${success} imported, ${errors} errors, ${skipped} skipped`)
  console.log(`📊 Total users in DB: ${total}`)

  // Show top-level stats
  const admins = await prisma.user.count({ where: { role: Role.ADMIN } })
  const teachers = await prisma.user.count({ where: { role: Role.TEACHER } })
  const students = await prisma.user.count({ where: { role: Role.STUDENT } })
  console.log(`   Admins: ${admins}, Teachers: ${teachers}, Students: ${students}`)
}

main()
  .catch(e => { console.error('❌ Fatal:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
