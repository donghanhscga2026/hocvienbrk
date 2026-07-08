import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const BRKP = 17;
const LEVEL_CONFIGS = [
  { level: 1, req: 17, pct: 21 },
  { level: 2, req: 50, pct: 30 },
  { level: 3, req: 250, pct: 39 },
  { level: 4, req: 1000, pct: 52.5 },
  { level: 5, req: 4000, pct: 64.5 },
];

interface SimNode {
  userId: number
  name: string
  level: number
  points: number
  refSysId: number
  depth: number
  activatedAt: Date
  children: number[]
}

function getDayKey(d: Date): string {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function bfsFindFirstAvailable(startUserId: number, state: Map<number, SimNode>): { userId: number; depth: number } {
  const visited = new Set<number>();
  const queue: number[] = [startUserId];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    if (visited.has(cur)) continue;
    visited.add(cur);
    const node = state.get(cur);
    if (!node) continue;
    if (node.children.length < 4) return { userId: node.userId, depth: node.depth };
    const sorted = [...node.children].sort((a, b) => {
      const na = state.get(a), nb = state.get(b);
      if (!na || !nb) return 0;
      const ta = na.activatedAt.getTime(), tb = nb.activatedAt.getTime();
      if (ta !== tb) return ta - tb;
      return a - b;
    });
    sorted.forEach(c => queue.push(c));
  }
  return { userId: startUserId, depth: 0 };
}

function findPlacement4Wide(
  rootId: number,
  referrerUserId: number | null,
  state: Map<number, SimNode>
): number {
  // Phase 1: global BFS from root
  const globalSlot = bfsFindFirstAvailable(rootId, state);
  if (globalSlot.depth < 2) return globalSlot.userId;

  // Phase 2: depth >= 2, use referrer if available
  if (referrerUserId && referrerUserId !== rootId && state.has(referrerUserId)) {
    const refSlot = bfsFindFirstAvailable(referrerUserId, state);
    return refSlot.userId;
  }

  // Fallback: global slot
  return globalSlot.userId;
}

function getAncestorChain(userId: number, state: Map<number, SimNode>): number[] {
  const chain: number[] = [];
  let cur = userId;
  while (cur > 0) {
    const node = state.get(cur);
    if (!node) break;
    cur = node.refSysId;
    if (cur > 0) chain.push(cur);
  }
  return chain;
}

async function main() {
  console.log('Reading data...');
  const members = await prisma.system.findMany({
    where: { onSystem: 4, status: 'ACTIVE' },
    orderBy: { activatedAt: 'asc' },
    select: { userId: true, autoId: true, refSysId: true, level: true, totalPoints: true, activatedAt: true }
  });
  const names = await prisma.user.findMany({
    where: { systems: { some: { onSystem: 4 } } },
    select: { id: true, name: true, referrerId: true }
  });
  const nameMap = new Map<number, string>();
  const referrerMap = new Map<number, number>();
  for (const u of names) {
    nameMap.set(u.id, (u.name || '').trim());
    if (u.referrerId) referrerMap.set(u.id, u.referrerId);
  }

  // Load enrollment referrerIds (priority over user.referrerId)
  const enrolls = await prisma.enrollment.findMany({
    where: { courseId: 22, status: 'ACTIVE', userId: { in: members.map(m => m.userId) } },
    select: { userId: true, referrerId: true }
  });
  const enrollRefMap = new Map<number, number>();
  for (const e of enrolls) {
    if (e.referrerId) enrollRefMap.set(e.userId, e.referrerId);
  }

  // Group by day
  const byDay = new Map<string, typeof members>();
  for (const m of members) {
    if (!m.activatedAt) continue;
    const key = getDayKey(m.activatedAt);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(m);
  }
  const sortedDays = [...byDay.keys()].sort();

  // Simulation state
  const state = new Map<number, SimNode>();
  const levelUps: { userId: number; from: number; to: number; day: string; points: number }[] = [];
  const placementLog: { userId: number; name: string; refSysId: number; day: string }[] = [];
  let rootId = 0;

  for (const day of sortedDays) {
    const dayList = byDay.get(day)!;
    for (const m of dayList) {
      const uid = m.userId;
      if (state.has(uid)) continue;

      let refSysId = 0;
      let depth = 0;
      if (state.size === 0) {
        rootId = uid;
      } else {
        const effectiveReferrer = enrollRefMap.get(uid) ?? referrerMap.get(uid) ?? null;
        refSysId = findPlacement4Wide(rootId, effectiveReferrer, state);
        const parent = state.get(refSysId);
        depth = parent ? parent.depth + 1 : 0;
      }

      state.set(uid, {
        userId: uid,
        name: nameMap.get(uid) || 'N/A',
        level: 1,
        points: BRKP,
        refSysId,
        depth,
        activatedAt: m.activatedAt!,
        children: [],
      });
      if (refSysId > 0) {
        const parent = state.get(refSysId);
        if (parent) parent.children.push(uid);
      }
      placementLog.push({ userId: uid, name: nameMap.get(uid) || 'N/A', refSysId, day });

      // Credit BRKP to all ancestors
      const chain = getAncestorChain(uid, state);
      for (const ancId of chain) {
        const anc = state.get(ancId);
        if (anc) anc.points += BRKP;
      }
    }

    // End-of-day level check (same as Method B: iterative loop over ALL members)
    let hasLevelUp = true;
    while (hasLevelUp) {
      hasLevelUp = false;
      for (const st of state.values()) {
        const curLvl = st.level;
        const next = LEVEL_CONFIGS.find(c => c.level === curLvl + 1);
        if (next && st.points >= next.req) {
          st.level = next.level;
          hasLevelUp = true;
          levelUps.push({ userId: st.userId, from: curLvl, to: next.level, day, points: st.points });
        }
      }
    }
  }

  // === OUTPUT ===
  const lines: string[] = [];
  lines.push('# Báo Cáo Mô Phỏng Rebuild BRK System 4 (Phương Án B)');
  lines.push('');
  lines.push(`Ngày tạo: ${new Date().toISOString().slice(0, 10)}`);
  lines.push(`Tổng số member: ${state.size}`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 1. Cây Placement Kỳ Vọng');
  lines.push('');
  lines.push(`Root: #${rootId} ${nameMap.get(rootId) || ''}`);
  lines.push('');

  function printTree(nodeId: number, depth: number) {
    const node = state.get(nodeId);
    if (!node) return;
    const indent = '  '.repeat(depth);
    const f1Count = node.children.filter(c => state.has(c)).length;
    lines.push(`${indent}#${node.userId} ${node.name} (Lv${node.level}, ${node.points}pts, F1=${f1Count})`);
    for (const child of node.children) {
      printTree(child, depth + 1);
    }
  }
  printTree(rootId, 0);

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 2. Level-Up Records Kỳ Vọng');
  lines.push('');
  lines.push('| User | Name | Từ Lv | Đến Lv | Ngày | Points tại thời điểm |');
  lines.push('|------|------|-------|--------|------|---------------------|');
  for (const lu of levelUps) {
    lines.push(`| #${lu.userId} | ${nameMap.get(lu.userId) || ''} | ${lu.from} | ${lu.to} | ${lu.day} | ${lu.points} |`);
  }

  // === COMPARE WITH CURRENT ===
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 3. So Sánh Với Trạng Thái Hiện Tại');
  lines.push('');
  lines.push('| User | Name | Sim Level | Sim Points | Current Level | Current Points | Kết quả |');
  lines.push('|------|------|-----------|------------|---------------|----------------|---------|');
  let mismatches = 0;
  for (const [uid, sim] of state) {
    const cur = members.find(m => m.userId === uid);
    if (!cur) continue;
    const ok = sim.level === cur.level;
    if (!ok) mismatches++;
    lines.push(`| #${uid} | ${sim.name} | ${sim.level} | ${sim.points} | ${cur.level} | ${Number(cur.totalPoints)} | ${ok ? '✅' : '❌'} |`);
  }
  lines.push('');
  lines.push(`Tổng số member khác level: ${mismatches}/${state.size}`);

  // === PLACEMENT COMPARISON ===
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 4. So Sánh Placement');
  lines.push('');
  lines.push('| User | Name | Sim Parent | Current Parent | Giống? |');
  lines.push('|------|------|-----------|----------------|--------|');
  let placementMatches = 0;
  for (const [uid, sim] of state) {
    const cur = members.find(m => m.userId === uid);
    if (!cur) continue;
    const same = sim.refSysId === cur.refSysId;
    if (same) placementMatches++;
    const curParentName = cur.refSysId ? nameMap.get(cur.refSysId) || 'N/A' : '0';
    const simParentName = sim.refSysId ? nameMap.get(sim.refSysId) || 'N/A' : '0';
    lines.push(`| #${uid} | ${sim.name} | #${sim.refSysId} ${simParentName} | #${cur.refSysId} ${curParentName} | ${same ? '✅' : '❌'} |`);
  }
  lines.push('');
  lines.push(`Số member giữ nguyên parent: ${placementMatches}/${state.size}`);

  // === PROMOTION TIMELINE ===
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 5. Promotion Timeline Chi Tiết Theo User');
  lines.push('');
  const luByUser = new Map<number, typeof levelUps>();
  for (const lu of levelUps) {
    if (!luByUser.has(lu.userId)) luByUser.set(lu.userId, []);
    luByUser.get(lu.userId)!.push(lu);
  }
  for (const [uid, logs] of [...luByUser.entries()].sort((a, b) => a[0] - b[0])) {
    const sim = state.get(uid);
    const cur = members.find(m => m.userId === uid);
    lines.push(`### #${uid} ${nameMap.get(uid) || ''}`);
    lines.push(`- Sim: Lv${sim?.level} (${sim?.points}pts)`);
    lines.push(`- Current: Lv${cur?.level} (${Number(cur?.totalPoints || 0)}pts)`);
    if (logs.length > 0) {
      lines.push('- Kỳ vọng promote:');
      for (const log of logs) {
        lines.push(`  - ${log.day}: Lv${log.from} → Lv${log.to} (${log.points}pts)`);
      }
    }
    // Current level-up records
    const curRecords = await prisma.brkLevelUpRecord.findMany({
      where: { userId: uid, onSystem: 4 },
      orderBy: { promotedAt: 'asc' }
    });
    if (curRecords.length > 0) {
      lines.push('- Current promote:');
      for (const r of curRecords) {
        lines.push(`  - ${r.promotedAt.toISOString().slice(0, 10)}: Lv${r.fromLevel} → Lv${r.toLevel}`);
      }
    }
    lines.push('');
  }

  const output = lines.join('\n');
  console.log(output);
  require('fs').writeFileSync('plan_temp/rebuild_simulation_report.md', output, 'utf-8');
  console.log('\nReport saved to plan_temp/rebuild_simulation_report.md');
}

main().catch(console.error).finally(() => prisma.$disconnect());
