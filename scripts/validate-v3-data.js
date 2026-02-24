
const fs = require('fs');
const csv = require('csv-parser');

async function readCsv(filePath) {
    const results = [];
    return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results))
            .on('error', reject);
    });
}

async function validate() {
    console.log("=== BẮT ĐẦU KIỂM TRA DỮ LIỆU CHUẨN HÓA ===");

    try {
        const users = await readCsv('User.csv');
        const courses = await readCsv('Course.csv');
        const enrollments = await readCsv('Enrollment.csv');

        console.log(`\n1. Kiểm tra số lượng:\n- Users: ${users.length}\n- Courses: ${courses.length}\n- Enrollments: ${enrollments.length}`);

        const errors = [];
        const warnings = [];

        // HASH MAPS FOR LOOKUP
        const userIds = new Set(users.map(u => u.id));
        const userEmails = new Set();
        const courseIds = new Set(courses.map(c => c.id));
        const courseKhoas = new Set(courses.map(c => c.id_khoa));
        const enrollmentPairs = new Set();

        // VALIDATE USERS
        users.forEach(u => {
            if (!u.id) errors.push(`User thiếu ID: ${JSON.stringify(u)}`);
            if (userEmails.has(u.email)) errors.push(`User trùng Email: ${u.email}`);
            userEmails.add(u.email);
        });

        // VALIDATE COURSES
        courses.forEach(c => {
            if (!c.id) errors.push(`Course thiếu ID: ${c.id_khoa}`);
            if (courseKhoas.has(c.id_khoa) && courses.filter(x => x.id_khoa === c.id_khoa).length > 1) {
                // Check for real duplicates manually if Set isn't enough
            }
        });

        // VALIDATE ENROLLMENTS (INTEGRITY)
        enrollments.forEach((e, index) => {
            const rowNum = index + 2;
            if (!userIds.has(e.userId)) {
                errors.push(`[Dòng ${rowNum}] Enrollment có userId (${e.userId}) không tồn tại trong User.csv`);
            }
            if (!courseIds.has(e.courseId)) {
                errors.push(`[Dòng ${rowNum}] Enrollment có courseId (${e.courseId}) không tồn tại trong Course.csv`);
            }

            const pair = `${e.userId}-${e.courseId}`;
            if (enrollmentPairs.has(pair)) {
                warnings.push(`[Dòng ${rowNum}] Trùng lặp Enrollment cho User ${e.userId} và Course ${e.courseId} (Sẽ bị bỏ qua khi nạp)`);
            }
            enrollmentPairs.add(pair);

            if (!['ACTIVE', 'PENDING'].includes(e.status)) {
                warnings.push(`[Dòng ${rowNum}] Trạng thái status '${e.status}' không chuẩn (Nên là ACTIVE hoặc PENDING)`);
            }
        });

        console.log("\n2. Kết quả kiểm tra lỗi:");
        if (errors.length === 0) {
            console.log("✅ KHÔNG có lỗi nghiêm trọng (Ràng buộc dữ liệu tốt)");
        } else {
            console.log(`❌ Có ${errors.length} lỗi cần xử lý:`);
            errors.slice(0, 10).forEach(err => console.log(` - ${err}`));
            if (errors.length > 10) console.log("   ... và nhiều lỗi khác");
        }

        console.log("\n3. Cảnh báo (Nên lưu ý):");
        if (warnings.length === 0) {
            console.log("✅ Không có cảnh báo.");
        } else {
            console.log(`⚠️ Có ${warnings.length} cảnh báo:`);
            warnings.slice(0, 5).forEach(w => console.log(` - ${w}`));
        }

    } catch (err) {
        console.error("❌ Lỗi khi đọc file:", err.message);
    }
}

validate();
