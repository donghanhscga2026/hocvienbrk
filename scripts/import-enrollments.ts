import { PrismaClient, EnrollmentStatus } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

function parseDate(val: string | undefined | null): Date | null {
  if (!val || val.trim() === '' || val.trim() === 'NULL') return null
  const s = val.trim()

  // dd/mm/yyyy hh:mm:ss
  const m1 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/)
  if (m1) {
    const [_, d, m, y, h, min, sec] = m1
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min), sec ? parseInt(sec) : 0)
  }

  // dd/mm/yyyy
  const m2 = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m2) {
    const [_, d, m, y] = m2
    return new Date(parseInt(y), parseInt(m) - 1, parseInt(d))
  }

  const ts = Date.parse(s)
  if (!isNaN(ts)) return new Date(ts)
  return null
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') { inQuotes = !inQuotes }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
    else current += ch
  }
  result.push(current.trim())
  return result
}

async function main() {
  console.log('🚀 Import Enrollments from CSV...\n')

  const filePath = path.join(__dirname, '..', 'Enrollment.csv')
  if (!fs.existsSync(filePath)) {
    console.error('❌ File not found:', filePath)
    process.exit(1)
  }

  const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '').replace(/\r/g, '')
  const lines: string[] = []
  let currentLine = ''
  let inQ = false
  for (const ch of raw) {
    if (ch === '"') inQ = !inQ
    if (ch === '\n' && !inQ) { if (currentLine.trim()) lines.push(currentLine.trim()); currentLine = '' }
    else currentLine += ch
  }
  if (currentLine.trim()) lines.push(currentLine.trim())

  const headers = parseCsvLine(lines[0])
  console.log('Total enrollments:', lines.length - 1, '\n')

  let success = 0
  let errors = 0

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h.trim()] = (vals[idx] || '').trim() })

    const eid = parseInt(row['id'])
    if (isNaN(eid)) { errors++; continue }

    try {
      const data: any = {
        id: eid,
        userId: parseInt(row['userId']),
        courseId: parseInt(row['courseId']),
        status: (row['status']?.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'PENDING') as EnrollmentStatus,
        phi_coc: parseInt(row['phi_coc']) || 0,
        link_anh_coc: row['link_anh_coc'] === 'no_link.com' ? null : (row['link_anh_coc'] || null),
        createdAt: parseDate(row['createdAt']) || new Date(),
        updatedAt: parseDate(row['updatedAt']) || new Date(),
        startedAt: parseDate(row['startedAt']),
      }

      await prisma.enrollment.upsert({
        where: { id: eid },
        update: data,
        create: data,
      })
      success++
      if (success % 200 === 0) console.log(`  ${success} enrollments...`)
    } catch (e: any) {
      console.error(`  ❌ Enrollment ${eid}: ${e.message.substring(0, 100)}`)
      errors++
    }
  }

  const total = await prisma.enrollment.count()
  console.log(`\n✅ Done: ${success} imported, ${errors} errors`)
  console.log(`📊 Total enrollments in DB: ${total}`)
}

main()
  .catch(e => { console.error('❌ Fatal:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
