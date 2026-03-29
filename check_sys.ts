import prisma from './lib/prisma'

async function check() {
    const sys = await prisma.system.findMany({ take: 5 })
    console.log(sys)
}
check().finally(() => prisma.$disconnect())
