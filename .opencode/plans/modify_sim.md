const fs = require('fs');
const content = fs.readFileSync('scripts/_simulate_brk.ts', 'utf8');

// 1. Add printDetailedMemberReport after printSummary
const oldMethod = `  printSummary(day: number, label: string) {
    const active = this.countActive()
    const official = this.countOfficial()
    const bonusEligible = this.countF1BonusEligible()
    const top = [...this.data.members].filter(m => !m.isCancelled).sort((a, b) => b.cash - a.cash).slice(0, 5)
    this.dayLog.push(\`=== \${label}: \${active} active, \${official} official, \${bonusEligible} bonus-eligible ===\`)
    for (const m of top) {
      this.dayLog.push(\`  TOP: uid=\${m.userId} \${m.name} Lv\${m.level} BRKP=\${Math.round(m.brkp)} Cash=\${m.cash.toLocaleString()} VND\`)
    }
  }
}`;

const newMethod = `  printSummary(day: number, label: string) {
    const active = this.countActive()
    const official = this.countOfficial()
    const bonusEligible = this.countF1BonusEligible()
    const top = [...this.data.members].filter(m => !m.isCancelled).sort((a, b) => b.cash - a.cash).slice(0, 5)
    this.dayLog.push(\`=== \${label}: \${active} active, \${official} official, \${bonusEligible} bonus-eligible ===\`)
    for (const m of top) {
      this.dayLog.push(\`  TOP: uid=\${m.userId} \${m.name} Lv\${m.level} BRKP=\${Math.round(m.brkp)} Cash=\${m.cash.toLocaleString()} VND\`)
    }
  }

  printDetailedMemberReport(memberIds: number[], label: string) {
    const members = memberIds.map(id => this.getMember(id)!).filter(Boolean).sort((a, b) => b.cash - a.cash)
    
    this.dayLog.push(\`\n==================== \${label} ====================\`)
    this.dayLog.push(\`UserId | Name                        | Lv |   BRKP |       BRKD |      Cash |  Voucher |  Comm   |  Bonus  |  Refund | F1\`)
    this.dayLog.push(\`-------|------------------------------|----|--------|------------|-----------|----------|---------|---------|---------|----\`)
    
    let totalCash = 0, totalVoucher = 0, totalBrkp = 0
    for (const m of members) {
      const activeF1 = m.f1Ids.filter(fid => {
        const f1 = this.data.members.find(mm => mm.userId === fid)
        return f1 && !f1.isCancelled
      }).length
      this.dayLog.push(
        \`\${String(m.userId).padStart(7)} | \${m.name.padEnd(28)} | \${String(m.level).padStart(2)} | \` +
        \`\${Math.round(m.brkp).toLocaleString().padStart(6)} | \${Math.round(m.brkd).toLocaleString().padStart(10)} | \` +
        \`\${m.cash.toLocaleString().padStart(9)} | \${m.voucherBalance.toLocaleString().padStart(8)} | \` +
        \`\${m.commissionsEarned.toLocaleString().padStart(7)} | \${m.bonusPoolReceived.toLocaleString().padStart(7)} | \` +
        \`\${m.refundReceived.toLocaleString().padStart(7)} | \${activeF1}\`
      )
      totalCash += m.cash
      totalVoucher += m.voucherBalance
      totalBrkp += m.brkp
    }
    this.dayLog.push(\`-------|------------------------------|----|--------|------------|-----------|----------|---------|---------|---------|----\`)
    this.dayLog.push(\`TOTAL  |                              |    | \${Math.round(totalBrkp).toLocaleString().padStart(6)} | \${''.padStart(10)} | \${totalCash.toLocaleString().padStart(9)} | \${totalVoucher.toLocaleString().padStart(8)} |\`)
  }
}`;

if (!content.includes(oldMethod)) {
  console.error('ERROR: Could not find printSummary method');
  process.exit(1);
}

let result = content.replace(oldMethod, newMethod);

// 2. Add originalIds and NGAY MAI report
const initLogLine = "sim.dayLog.push(\`[INIT] After distributing initial commissions - Root BRKP=\${Math.round(sim.getMember(3773)?.brkp || 0)}\`)";

const newInitLines = initLogLine + "\n\n  // ======================== NGAY MAI (5/7) ========================\n" +
  "  const originalIds = realSystems.map(s => s.userId)\n" +
  "  sim.printDetailedMemberReport(originalIds, 'NGAY MAI (5/7) - TRUOC KHI TANG TRUONG')\n" +
  "  for (const line of sim.dayLog.slice(-40)) {\n" +
  "    console.log(line)\n" +
  "  }";

if (!result.includes(initLogLine)) {
  console.error('ERROR: Could not find init log line');
  process.exit(1);
}

result = result.replace(initLogLine, newInitLines);

// 3. Remove duplicate originalIds
const dupLine = 'const originalIds = realSystems.map(s => s.userId)';
const regex = new RegExp(dupLine.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
const matches = result.match(regex);
console.log('Found', matches ? matches.length : 0, 'occurrences of originalIds');

if (matches && matches.length === 2) {
  const idx = result.lastIndexOf(dupLine);
  result = result.substring(0, idx) + result.substring(idx + dupLine.length);
}

fs.writeFileSync('scripts/_simulate_brk.ts', result, 'utf8');
console.log('DONE - File updated');

// Verify
const check = fs.readFileSync('scripts/_simulate_brk.ts', 'utf8');
console.log('Has method:', check.includes('printDetailedMemberReport'));
console.log('Has report:', check.includes('NGAY MAI'));
console.log('originalIds count:', (check.match(regex) || []).length);
