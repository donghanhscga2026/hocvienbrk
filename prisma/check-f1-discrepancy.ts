const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function checkDiscrepancy() {
    console.log('========================================');
    console.log('  CHECK: #7 F1 Discrepancy');
    console.log('========================================\n');

    const userId = 7;

    // 1. Genealogy F1s (từ closure table, depth = 1)
    const genealogyF1s = await db.userClosure.findMany({
        where: { ancestorId: userId, depth: 1 },
        include: { descendant: { select: { id: true, email: true, emailVerified: true } } }
    });

    console.log(`🌳 Genealogy F1s: ${genealogyF1s.length}`);
    
    const genealogyF1Ids = new Set();
    const genealogyF1Details = [];

    for (const c of genealogyF1s) {
        if (c.descendantId === 0) continue; // Skip root
        genealogyF1Ids.add(c.descendantId);
        genealogyF1Details.push({
            id: c.descendantId,
            email: c.descendant.email,
            verified: !!c.descendant.emailVerified
        });
    }

    console.log(`   (Sau khi loại root): ${genealogyF1Ids.size}`);

    // 2. Affiliate F1s (từ RegistrationPoint table - chỉ những người đã verify email)
    const affiliatePoints = await db.registrationPoint.findMany({
        where: { referrerId: userId },
        include: { referee: { select: { id: true, email: true, emailVerified: true } } }
    });

    const affiliateF1Ids = new Set();
    for (const p of affiliatePoints) {
        if (p.referee.emailVerified) {
            affiliateF1Ids.add(p.referee.id);
        }
    }

    console.log(`💰 Affiliate F1s (verified): ${affiliateF1Ids.size}`);

    // 3. Tìm F1s trong genealogy nhưng không có trong affiliate
    console.log('\n📋 F1s TRONG Genealogy NHƯNG KHÔNG CÓ trong Affiliate:');
    
    const missingF1s = genealogyF1Details.filter(f => 
        !affiliateF1Ids.has(f.id) && f.id !== 0
    );

    if (missingF1s.length === 0) {
        console.log('   Không có! Hai bên match.');
    } else {
        for (const f of missingF1s) {
            console.log(`   #${f.id} | ${f.email} | Verified: ${f.verified}`);
        }
    }

    // 4. Chi tiết các F1
    console.log('\n📋 TẤT CẢ F1s (Genealogy):');
    
    let countVerified = 0;
    let countUnverified = 0;
    let countRoot = 0;

    for (const f of genealogyF1Details) {
        if (f.id === 0) {
            countRoot++;
            continue;
        }
        if (f.verified) {
            countVerified++;
        } else {
            countUnverified++;
            console.log(`   ❌ #${f.id} | ${f.email} | CHƯA XÁC THỰC EMAIL`);
        }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Verified: ${countVerified}`);
    console.log(`   ❌ Unverified: ${countUnverified}`);
    console.log(`   🚫 Root (id=0): ${countRoot}`);
    console.log(`   📊 Total: ${genealogyF1Details.length}`);

    // 5. Kiểm tra F1 chưa verify
    if (countUnverified > 0) {
        console.log('\n⚠️  LÝ DO: Có F1 chưa xác thực email nên không được cộng điểm!');
        console.log('    Điểm chỉ được cộng khi F1 đã xác thực email.');
    }

    await db.$disconnect();
}

checkDiscrepancy();
