
const fs = require('fs');
const csv = require('csv-parser');
const { createObjectCsvWriter } = require('csv-writer');

async function readCsv(filePath) {
    const results = [];
    return new Promise((resolve) => {
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => resolve(results));
    });
}

async function cleanup() {
    console.log("=== BẮT ĐẦU DỌN DẸP DỮ LIỆU CHUẨN HÓA ===");

    // 1. CLEAN USERS
    const users = await readCsv('User.csv');
    const emailMap = {}; // email -> first_id
    const cleanedUsers = users.map(u => {
        const email = u.email.toLowerCase().trim();
        if (emailMap[email]) {
            const firstId = parseInt(emailMap[email]);
            const currentId = parseInt(u.id);
            if (currentId > firstId) {
                const parts = u.email.split('@');
                u.email = `${parts[0]}_${u.id}@${parts[1]}`;
                console.log(`Fix duplicate email: ${email} -> ${u.email} (ID: ${u.id})`);
            }
        } else {
            emailMap[email] = u.id;
        }
        return u;
    });

    // 1.2 CLEAN COURSES (Ensure id_khoa is unique)
    const courses = await readCsv('Course.csv');
    const courseKhoaMap = {};
    const cleanedCourses = courses.map(c => {
        const khoa = c.id_khoa.trim();
        if (courseKhoaMap[khoa]) {
            c.id_khoa = `${khoa}_${c.id}`;
            console.log(`Fix duplicate id_khoa: ${khoa} -> ${c.id_khoa}`);
        } else {
            courseKhoaMap[khoa] = true;
        }
        return c;
    });

    const userWriter = createObjectCsvWriter({
        path: 'User.csv',
        header: Object.keys(cleanedUsers[0]).map(k => ({ id: k, title: k }))
    });
    await userWriter.writeRecords(cleanedUsers);

    const courseWriter = createObjectCsvWriter({
        path: 'Course.csv',
        header: Object.keys(cleanedCourses[0]).map(k => ({ id: k, title: k }))
    });
    await courseWriter.writeRecords(cleanedCourses);
    console.log("✅ Đã cập nhật User.csv và Course.csv");

    // 2. CLEAN ENROLLMENTS
    const enrollments = await readCsv('Enrollment.csv');
    const seenPairs = new Set();
    const cleanedEnrollments = [];
    let dupCount = 0;

    enrollments.forEach(e => {
        const key = `${e.userId}-${e.courseId}`;
        if (!seenPairs.has(key)) {
            seenPairs.add(key);
            cleanedEnrollments.push(e);
        } else {
            dupCount++;
        }
    });

    const enrollWriter = createObjectCsvWriter({
        path: 'Enrollment.csv',
        header: Object.keys(cleanedEnrollments[0]).map(k => ({ id: k, title: k }))
    });
    await enrollWriter.writeRecords(cleanedEnrollments);
    console.log(`✅ Đã cập nhật Enrollment.csv (Loại bỏ ${dupCount} dòng trùng lặp)`);
}

cleanup();
