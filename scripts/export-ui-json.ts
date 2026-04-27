
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getUIRenderData() {
  const systemId = 1; // Hệ thống TCA
  
  // 1. Tìm Root
  const rootSys = await prisma.system.findFirst({
    where: { onSystem: systemId, refSysId: 0 },
    include: { user: { select: { id: true, name: true, referrerId: true } } }
  });

  if (!rootSys) return;

  // 2. Lấy toàn bộ closure để tính toán quan hệ
  const allClosures = await prisma.systemClosure.findMany({
    where: { systemId },
    include: { 
      descendant: { 
        include: { user: { select: { id: true, name: true } } } 
      } 
    }
  });

  // 3. Lấy dữ liệu TCA Member cho toàn bộ user trong hệ thống
  const userIds = [...new Set(allClosures.map(c => c.descendant.userId))];
  const tcaMembers = await (prisma as any).tCAMember.findMany({
    where: { userId: { in: userIds } }
  });

  const tcaMap = new Map(tcaMembers.map((m: any) => [m.userId, m]));
  const closureByAncestor = new Map<number, any[]>();
  allClosures.forEach(c => {
    if (!closureByAncestor.has(c.ancestorId)) closureByAncestor.set(c.ancestorId, []);
    closureByAncestor.get(c.ancestorId)!.push(c);
  });

  // 4. Hàm build Node theo đúng chuẩn GenealogyNode của code
  const buildNode = (userId: number, autoId: number): any => {
    const tca = tcaMap.get(userId) as any;
    const closures = closureByAncestor.get(autoId) || [];
    const directChildren = closures.filter(c => c.depth === 1);
    
    // Phân nhóm A, B, C theo logic code
    let groupA: any[] = [], groupB: any[] = [], groupC: any[] = [];
    
    directChildren.forEach(child => {
        const cAutoId = child.descendantId;
        const cUserId = child.descendant.userId;
        const cClosures = closureByAncestor.get(cAutoId) || [];
        const hasF2 = cClosures.some(cc => cc.depth === 1);
        const hasF3 = cClosures.some(cc => cc.depth === 2);
        const cTca = tcaMap.get(cUserId) as any;

        const childData = {
            id: cUserId,
            name: child.descendant.user.name,
            level: cTca?.level || 0,
            personalScore: Number(cTca?.personalScore || 0),
            totalScore: Number(cTca?.totalScore || 0),
            groupName: cTca?.groupName,
            totalSubCount: cClosures.length
        };

        if (!hasF2) groupA.push(childData);
        else if (!hasF3) groupB.push({ ...childData, children: cClosures.filter(cc => cc.depth === 1).map(cc => ({ id: cc.descendant.userId, name: cc.descendant.user.name })) });
        else groupC.push(cAutoId); // Chỉ lưu AutoID để build đệ quy cho Group C
    });

    return {
      id: userId,
      name: rootSys.user.id === userId ? rootSys.user.name : (tca?.name || 'N/A'),
      level: tca?.level || 0,
      personalScore: Number(tca?.personalScore || 0),
      totalScore: Number(tca?.totalScore || 0),
      groupName: tca?.groupName,
      totalSubCount: closures.length,
      f1aCount: groupA.length,
      f1bCount: groupB.length,
      f1cCount: groupC.length,
      groupA,
      groupB,
      children: groupC.map(cAutoId => {
          const cRec = allClosures.find(cc => cc.descendantId === cAutoId && cc.depth === 0);
          return buildNode(cRec?.descendant.userId as number, cAutoId);
      }),
      isRoot: userId === rootSys.userId
    };
  };

  const fullTree = buildNode(rootSys.userId, rootSys.autoId);
  console.log(JSON.stringify(fullTree, null, 2));
}

getUIRenderData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
