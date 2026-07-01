import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

function parseBool(val: string): boolean {
  return val?.trim()?.toUpperCase() === 'TRUE'
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

async function main() {
  console.log('🚀 Import Courses from CSV...\n')

  const filePath = path.join(__dirname, '..', 'Course.csv')
  if (!fs.existsSync(filePath)) {
    console.error('❌ File not found:', filePath)
    process.exit(1)
  }

  const raw = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/, '')

  // Split lines handling quoted multi-line values
  const lines: string[] = []
  let currentLine = ''
  let inQ = false
  for (const ch of raw) {
    if (ch === '"') inQ = !inQ
    if (ch === '\n' && !inQ) {
      if (currentLine.trim()) lines.push(currentLine.trim())
      currentLine = ''
    } else {
      currentLine += ch
    }
  }
  if (currentLine.trim()) lines.push(currentLine.trim())

  const headers = parseCsvLine(lines[0])

  console.log('Total courses:', lines.length - 1, '\n')

  let success = 0
  let errors = 0

  for (let i = 1; i < lines.length; i++) {
    const vals = parseCsvLine(lines[i])
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h.trim()] = (vals[idx] || '').trim() })

    const cid = parseInt(row['id'])
    if (isNaN(cid)) { errors++; continue }

    try {
      const data: any = {
        id: cid,
        id_khoa: row['id_khoa'],
        name_lop: row['name_lop'] || '',
        name_khoa: row['name_khoa'] || null,
        date_join: row['date_join'] || null,
        status: parseBool(row['status']),
        mo_ta_dai: row['mo_ta_dai'] || null,
        mo_ta_ngan: row['mo_ta_ngan'] || null,
        link_zalo: row['link_zalo'] || null,
        phi_coc: parseInt(row['phi_coc']) || 0,
        stk: row['stk'] || null,
        name_stk: row['name_stk'] || null,
        bank_stk: row['bank_stk'] || null,
        noidung_stk: row['noidung_stk'] || null,
        link_qrcode: row['link_qrcode'] || null,
        file_email: row['file_email'] || null,
        noidung_email: row['noidung_email'] || null,
        link_anh_bia: row['link_anh_bia_khoa'] || null,
        type: 'NORMAL',
        category: 'Khác',
        pin: 0,
      }

      await prisma.course.upsert({
        where: { id: cid },
        update: data,
        create: data,
      })
      success++
      if (success % 50 === 0) console.log(`  ${success} courses imported...`)
    } catch (e: any) {
      console.error(`  ❌ Course ${cid} (${row['id_khoa']}): ${e.message.substring(0, 100)}`)
      errors++
    }
  }

  console.log(`\n✅ Done: ${success} imported, ${errors} errors`)
  console.log(`📊 Total courses in DB: ${await prisma.course.count()}`)
}

main()
  .catch(e => { console.error('❌ Fatal:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
