import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function repairSystemClosures() {
    console.log('=== Repair System Closures ===')
    
    // Lấy tất cả system có refSysId > 0
    const systems = await prisma.system.findMany({
        where: { refSysId: { gt: 0 }, onSystem: 1 }
    })
    
    console.log(`Found ${systems.length} systems with refSysId > 0`)
    
    let fixed = 0
    
    for (const sys of systems) {
        // Kiểm tra closure hiện tại
        const closures = await prisma.systemClosure.findMany({
            where: { descendantId: sys.autoId },
            orderBy: { depth: 'desc' }
        })
        
        // Nếu thiếu closure (cần có từ root đến parent)
        const parentSys = await prisma.system.findFirst({
            where: { userId: sys.refSysId, onSystem: sys.onSystem }
        })
        
        if (!parentSys) {
            console.log(`Skip #${sys.userId} - parent #${sys.refSysId} not found in system`)
            continue
        }
        
        // Lấy TẤT CẢ ancestors của parent (từ root đến parent)
        const parentClosures = await prisma.systemClosure.findMany({
            where: { systemId: sys.onSystem, descendantId: parentSys.autoId },
            orderBy: { depth: 'desc' }
        })
        
        console.log(`#${sys.userId}: có ${closures.length} closure, parent #${sys.refSysId} có ${parentClosures.length} closure`)
        
        // Xóa closure cũ và tạo lại đúng
        if (closures.length < parentClosures.length + 1) {
            console.log(`  -> Fixing...`)
            await prisma.systemClosure.deleteMany({
                where: { descendantId: sys.autoId }
            })
            
            // Tạo closure cho chính mình
            await prisma.systemClosure.create({
                data: {
                    ancestorId: sys.autoId,
                    descendantId: sys.autoId,
                    depth: 0,
                    systemId: sys.onSystem
                }
            })
            
            // Tạo closure từ parent
            for (const pc of parentClosures) {
                await prisma.systemClosure.create({
                    data: {
                        ancestorId: pc.ancestorId,
                        descendantId: sys.autoId,
                        depth: pc.depth + 1,
                        systemId: sys.onSystem
                    }
                }).catch(() => {})
            }
            
            fixed++
        }
    }
    
    console.log(`=== Hoàn tất: ${fixed} đã fix ===`)
    
    // Verify #3773
    const sys3773 = await prisma.system.findFirst({ where: { userId: 3773, onSystem: 1 } })
    const c3773 = await prisma.systemClosure.findMany({ where: { descendantId: sys3773.autoId } })
    console.log('\n#3773 after fix:')
    for (const c of c3773) {
        const a = await prisma.system.findUnique({ where: { autoId: c.ancestorId } })
        console.log(`  depth ${c.depth} -> #${a?.userId}`)
    }
    
    // Verify #866
    const sys866 = await prisma.system.findFirst({ where: { userId: 866, onSystem: 1 } })
    const c866 = await prisma.systemClosure.findMany({ where: { descendantId: sys866.autoId } })
    console.log('\n#866 after fix:')
    for (const c of c866) {
        const a = await prisma.system.findUnique({ where: { autoId: c.ancestorId } })
        console.log(`  depth ${c.depth} -> #${a?.userId}`)
    }
}

repairSystemClosures()
    .then(() => process.exit(0))
    .catch(e => { console.error(e); process.exit(1); })