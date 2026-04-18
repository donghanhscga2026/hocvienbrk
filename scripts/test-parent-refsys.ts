import prisma from '../lib/prisma'

async function main() {
    const tcaId = 60214
    
    // 1. Lấy max System autoId
    const maxSystem = await prisma.system.findFirst({
        orderBy: { autoId: 'desc' },
        select: { autoId: true }
    })
    console.log('Max System autoId:', maxSystem?.autoId)
    
    // 2. Lấy tất cả TCA members để xem parent relationship
    const allTCAMembers = await (prisma as any).tCAMember.findMany({
        select: { tcaId: true, userId: true, name: true }
    })
    console.log('Tổng TCAMembers:', allTCAMembers.length)
    
    // 3. Tìm các TCA có thể là parent của 60214 (các folder)
    const folders = allTCAMembers.filter(m => m.tcaId < tcaId)
    console.log('Các folder có thể là parent:', folders.slice(0, 10))
    
    // 4. Kiểm tra xem có TCA member nào trong DB không
    const tcaMember = await (prisma as any).tCAMember.findUnique({ 
        where: { tcaId: tcaId }
    })
    console.log('TCAMember 60214:', tcaMember)
    
    await prisma.$disconnect()
}

main()