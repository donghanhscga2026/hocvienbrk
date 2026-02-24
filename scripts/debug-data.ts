
import fs from 'fs'
import csv from 'csv-parser'

async function main() {
    const courses: any[] = []
    const registrations: any[] = []

    // 1. Phân tích KhoaHoc.csv
    await new Promise((resolve) => {
        fs.createReadStream('KhoaHoc.csv')
            .pipe(csv())
            .on('data', (data) => courses.push(data))
            .on('end', resolve)
    })

    console.log('--- PHÂN TÍCH KHOAHOC.CSV ---')
    console.log(`Tổng số khóa học: ${courses.length}`)
    const courseIds = courses.map(c => c.id_khoa).filter(Boolean)
    const courseLops = courses.map(c => c.id_lop).filter(Boolean)

    console.log('Unique id_khoa in KhoaHoc:', Array.from(new Set(courseIds)))
    console.log('Unique id_lop in KhoaHoc:', Array.from(new Set(courseLops)))

    const aiCourse = courses.find(c =>
        (c.name_lop && c.name_lop.includes('AI')) ||
        (c.mo_ta_ngan && c.mo_ta_ngan.includes('AI')) ||
        (c.mo_ta_dai && c.mo_ta_dai.includes('AI'))
    )
    console.log('Tìm kiếm khóa học AI:', aiCourse ? `Tìm thấy: ${aiCourse.name_lop} (ID: ${aiCourse.id_khoa})` : 'Không thấy')

    // 2. Phân tích LS_DangKy.csv
    await new Promise((resolve) => {
        fs.createReadStream('LS_DangKy.csv')
            .pipe(csv())
            .on('data', (data) => registrations.push(data))
            .on('end', resolve)
    })

    console.log('\n--- PHÂN TÍCH LS_DANGKY.CSV ---')
    console.log(`Tổng số bản ghi: ${registrations.length}`)
    const regKhoas = registrations.map(r => r.id_khoa).filter(Boolean)
    const regLops = registrations.map(r => r.id_lop).filter(Boolean)

    const uniqueRegKhoas = Array.from(new Set(regKhoas))
    console.log('Unique id_khoa in LS_DangKy:', uniqueRegKhoas)

    const missingKhoas = uniqueRegKhoas.filter(id => !courseIds.includes(id))
    console.log('\nCác id_khoa trong LS_DangKy KHÔNG có trong KhoaHoc:', missingKhoas)

    // Kiểm tra xem các id_khoa bị thiếu có nằm trong id_lop không?
    const foundInLop = missingKhoas.filter(id => courseLops.includes(id))
    console.log('Các id_khoa bị thiếu NHƯNG tìm thấy trong cột id_lop của KhoaHoc:', foundInLop)
}

main()
