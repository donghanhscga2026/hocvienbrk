import { rebuildSystem4Data } from '@/lib/brk/rebuild-service'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log("🚀 Starting live rebuild of System 4 data using official business logic...")
  await rebuildSystem4Data('B')
  console.log("🎉 Rebuild completed successfully using 100% live code!")
}

main().finally(() => prisma.$disconnect())
