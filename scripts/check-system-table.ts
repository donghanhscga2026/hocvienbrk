import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient() as any

async function test() {
  console.log('=== Check System Table ===\n')
  
  // Kiểm tra System 13809
  const sys13809 = await prisma.system.findUnique({ where: { autoId: 13809 } })
  console.log('System 13809:')
  console.log(sys13809)
  
  // Tìm tất cả System columns
  const columns = await prisma.$queryRaw`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'System' AND table_schema = 'public'
  `
  console.log('\nSystem columns:', columns)
  
  // Kiểm tra xem có System nào được tạo gần đây cho User 327
  const recentSystems = await prisma.system.findMany({
    where: { userId: 327 },
    orderBy: { autoId: 'desc' }
  })
  console.log('\nSystems for User 327:', recentSystems)
  
  await prisma.$disconnect()
}

test().catch(console.error)
