import prisma from '@/lib/prisma'
import { getNextAvailableId } from '@/lib/id-helper'

async function test() {
  console.log('=== getNextAvailableId Test ===\n')
  
  // Kiểm tra ReservedIds
  const reservedIds = await prisma.reservedId.findMany({
    orderBy: { id: 'asc' }
  })
  console.log('Reserved IDs:', reservedIds.map(r => r.id))
  
  // Kiểm tra User lớn nhất
  const maxUser = await prisma.user.findFirst({
    orderBy: { id: 'desc' },
    select: { id: true, name: true }
  })
  console.log('\nMax User ID (tổng):', maxUser)
  
  // Kiểm tra User lớn nhất không tính reserved
  const maxNormalUser = await prisma.user.findFirst({
    where: {
      id: { notIn: reservedIds.map(r => r.id) }
    },
    orderBy: { id: 'desc' },
    select: { id: true, name: true }
  })
  console.log('Max Normal User ID (không tính reserved):', maxNormalUser)
  
  // Gọi getNextAvailableId
  const nextId = await getNextAvailableId()
  console.log('\ngetNextAvailableId() trả về:', nextId)
  
  await prisma.$disconnect()
}

test().catch(console.error)
