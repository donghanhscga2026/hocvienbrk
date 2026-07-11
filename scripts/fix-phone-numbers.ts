/**
 * Fix all phone numbers in User table to standard E.164 format (+84XXXXXXXXX).
 *
 * Usage: npx tsx scripts/fix-phone-numbers.ts [--dry-run]
 *
 * Run with --dry-run first to preview changes before applying.
 */

import { PrismaClient } from '@prisma/client'
import { normalizePhone } from '../lib/phone-utils'

const prisma = new PrismaClient()

function stripPhone(phone: string): string {
  return phone.replace(/[^\d]/g, '')
}

async function main() {
  const isDryRun = process.argv.includes('--dry-run')

  console.log(`\n🔧 Phone Number Fix Script ${isDryRun ? '(DRY RUN)' : '(LIVE)'}\n`)

  const users = await prisma.user.findMany({
    where: { phone: { not: null } },
    select: { id: true, name: true, phone: true },
    orderBy: { id: 'asc' },
  })

  console.log(`📊 Total users with phone: ${users.length}\n`)

  const updates: { id: number; name: string; old: string; new: string }[] = []
  const failures: { id: number; name: string; phone: string; reason: string }[] = []
  let skipped = 0

  for (const user of users) {
    const oldPhone = user.phone!
    const newPhone = normalizePhone(oldPhone)

    if (!newPhone) {
      failures.push({ id: user.id, name: user.name || '?', phone: oldPhone, reason: 'INVALID after normalize' })
      continue
    }

    if (oldPhone !== newPhone) {
      updates.push({ id: user.id, name: user.name || '?', old: oldPhone, new: newPhone })
    } else {
      skipped++
    }
  }

  console.log(`✅ Already correct: ${skipped}`)
  console.log(`🔄 Need update: ${updates.length}`)
  console.log(`❌ Cannot fix: ${failures.length}\n`)

  if (updates.length > 0) {
    console.log('─── Updates ───')
    for (const u of updates) {
      console.log(`  #${u.id} ${u.name}: "${u.old}" → "${u.new}"`)
    }
    console.log('')
  }

  if (failures.length > 0) {
    console.log('─── Failures (manual review needed) ───')
    for (const f of failures) {
      console.log(`  #${f.id} ${f.name}: "${f.phone}" — ${f.reason}`)
    }
    console.log('')
  }

  if (isDryRun) {
    console.log('⏸️  DRY RUN — no changes made. Remove --dry-run to apply.\n')
    return
  }

  if (updates.length === 0) {
    console.log('✨ Nothing to update.\n')
    return
  }

  // Apply updates in batch
  console.log('📝 Applying updates...')
  let applied = 0
  for (const u of updates) {
    try {
      await prisma.user.update({
        where: { id: u.id },
        data: { phone: u.new },
      })
      applied++
    } catch (e: any) {
      console.error(`  ❌ Failed #${u.id}: ${e.message}`)
    }
  }

  console.log(`\n✅ Done! Applied ${applied}/${updates.length} updates.\n`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
