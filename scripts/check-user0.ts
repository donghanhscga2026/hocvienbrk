import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
async function main() {
  try {
    const user0 = await p.user.findUnique({ where: { id: 0 }, select: { id: true, name: true } })
    console.log('User id=0:', JSON.stringify(user0))
  } catch(e: any) {
    console.log('Error:', e.message)
  }
  await p.$disconnect()
}
main()
