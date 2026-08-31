
const fs = require('fs');
const csv = require('csv-parser');

async function inspect() {
    console.log("=== COMPREHENSIVE DATA INSPECTION ===");

    // 1. Parse KhoaHoc.csv
    const courses = [];
    await new Promise((resolve) => {
        fs.createReadStream('KhoaHoc.csv')
            .pipe(csv({
                mapHeaders: ({ header }) => header.trim(),
                mapValues: ({ value }) => value.trim()
            }))
            .on('data', (data) => courses.push(data))
            .on('end', resolve);
    });

    console.log(`\n--- KHOA HOC SUMMARY (${courses.length} entries) ---`);
    courses.forEach((c, i) => {
        console.log(`${i + 1}. id_khoa: [${c.id_khoa}] | id_lop: [${c.id_lop}] | name: ${c.name_lop}`);
    });

    // 2. Parse LS_DangKy.csv
    const registrations = [];
    await new Promise((resolve) => {
        fs.createReadStream('LS_DangKy.csv')
            .pipe(csv({
                mapHeaders: ({ header }) => header.trim(),
                mapValues: ({ value }) => value.trim()
            }))
            .on('data', (data) => registrations.push(data))
            .on('end', resolve);
    });

    console.log(`\n--- LS DANG KY SUMMARY (${registrations.length} entries) ---`);
    const regCounts = {};
    registrations.forEach(r => {
        // Kiểm tra mối liên hệ: LS_DangKy.id_khoa -> KhoaHoc.id_khoa
        const key = r.id_khoa || r.id_lop || 'UNKNOWN';
        if (!regCounts[key]) regCounts[key] = { count: 0, sample_lop: r.id_lop };
        regCounts[key].count++;
    });

    const courseIds = new Set(courses.map(c => c.id_khoa));
    const courseLops = new Set(courses.map(c => c.id_lop));

    console.log("\nBreakdown of registrations and matching status:");
    Object.entries(regCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .forEach(([key, info]) => {
            let match = "MISSING";
            if (courseIds.has(key)) match = "MATCHED (id_khoa)";
            else if (courseLops.has(key)) match = "MATCHED (id_lop)";
            else {
                // Thử tìm xem có khóa học nào có id_khoa bắt đầu bằng key không (ví dụ AF386 vs AF)
                const fuzzy = courses.find(c => c.id_khoa.startsWith(key) || key.startsWith(c.id_khoa));
                if (fuzzy) match = `FUZZY MATCH with ${fuzzy.id_khoa}`;
            }
            console.log(`- ${key} (Lop: ${info.sample_lop}): ${info.count} regs | ${match}`);
        });
}

inspect();
