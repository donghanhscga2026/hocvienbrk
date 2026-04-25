import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('=== GỌI TRỰC TIẾP getSystemGenealogy() ===\n')

  // Import hàm từ admin-actions
  const { getSystemGenealogy } = await import('./app/actions/admin-actions.ts')
  
  const result = await getSystemGenealogy(861, 1, true)

  console.log('RESULT:')
  console.log('Root:', result?.id, result?.name)
  console.log('Children count:', result?.children?.length)

  // Find #885 in children
  const child885 = result?.children?.find((c: any) => c.id === 885)
  console.log('\n#885 (NGUYỄN HỮU HẠNH):')
  console.log('  id:', child885?.id)
  console.log('  name:', child885?.name)
  console.log('  level:', child885?.level)
  console.log('  children:', child885?.children?.length)

  if (child885?.children) {
    child885.children.forEach((c: any) => {
      console.log('    F2:', c.id, c.name, 'level:', c.level)
    })
  }

  // Find #873
  const child873 = result?.children?.find((c: any) => c.id === 873)
  console.log('\n#873 (LÊ LÊ QUẢNG):')
  console.log('  id:', child873?.id)
  console.log('  name:', child873?.name)
  console.log('  level:', child873?.level)
  console.log('  children:', child873?.children?.length)

  // Find #327
  const child327 = result?.children?.find((c: any) => c.id === 327)
  console.log('\n#327 (Nhung Phạm):')
  console.log('  id:', child327?.id)
  console.log('  name:', child327?.name)
  console.log('  level:', child327?.level)
  console.log('  children:', child327?.children?.length)

  if (child327?.children) {
    child327.children.forEach((c: any) => {
      console.log('    F2:', c.id, c.name, 'level:', c.level)
    })
  }

  await prisma.$disconnect()
}

main().catch(console.error)