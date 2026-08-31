
import fs from 'fs'
import csv from 'csv-parser'
import { createObjectCsvWriter } from 'csv-writer'
import path from 'path'

// Format ngày tháng từ DD/MM/YYYY H:mm:ss sang ISO
function parseDate(dateStr: string): string {
    if (!dateStr) return new Date().toISOString()
    try {
        // Giả sử định dạng DD/MM/YYYY H:mm:ss (ví dụ: 06/08/2023 6:08:37)
        // Hoặc DD/MM/YYYY (ví dụ: 27/01/2025)
        const [datePart, timePart] = dateStr.trim().split(' ')
        const [day, month, year] = datePart.split('/').map(Number)

        // Validate date
        if (!day || !month || !year) return new Date().toISOString()

        let hour = 0, minute = 0, second = 0
        if (timePart) {
            [hour, minute, second] = timePart.split(':').map(Number)
        }

        // Lưu ý: Month trong JS bắt đầu từ 0
        return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0).toISOString()
    } catch (e) {
        console.warn(`Invalid date: ${dateStr}. Using current time.`)
        return new Date().toISOString()
    }
}

async function main() {
    const inputFilePath = 'User old - User.csv'
    const outputFilePath = 'processed-users.preview.csv'

    if (!fs.existsSync(inputFilePath)) {
        console.error(`File not found: ${inputFilePath}`)
        process.exit(1)
    }

    const rawRows: any[] = []

    // Map: NameNormalized -> UserID[]
    // Dùng để tra cứu referrer nếu referrerId là tên
    const nameMap = new Map<string, string[]>()

    console.log('📖 Reading CSV data...')

    await new Promise((resolve, reject) => {
        fs.createReadStream(inputFilePath)
            .pipe(csv())
            .on('data', (data) => {
                rawRows.push(data)

                // Build Name Map
                const name = data.name ? data.name.trim() : ''
                if (name) {
                    const normalized = name.toLowerCase()
                    if (!nameMap.has(normalized)) {
                        nameMap.set(normalized, [])
                    }
                    nameMap.get(normalized)?.push(data.id)
                }
            })
            .on('end', resolve)
            .on('error', reject)
    })

    console.log(`📊 Loaded ${rawRows.length} rows. Processing...`)

    const processedData: any[] = []
    let resolvedCount = 0
    let ambiguousCount = 0
    let notFoundCount = 0

    for (const row of rawRows) {
        const id = row.id

        // 1. Xử lý Email
        let email = row.email ? row.email.trim() : ''
        if (!email) {
            email = `noemail${id}@gmail.com`
        }

        // 2. Xử lý Phone
        let phone = row.phone ? row.phone.trim() : ''
        if (!phone) {
            const idSuffix = id.toString().padStart(3, '0')
            phone = `000000${idSuffix}` // Fake phone logic
        }

        // 3. Xử lý Password
        let password = row.password ? row.password.trim() : ''
        if (!password) {
            password = 'Brk@3773'
        }

        // 4. Xử lý Role
        let role = row.role ? row.role.trim() : ''
        if (!role) {
            role = 'STUDENT'
        }

        // 5. Xử lý Referrer
        let referrerId = row.referrerId ? row.referrerId.trim() : null

        // Nếu referrerId là tên (không phải số)
        if (referrerId && isNaN(parseInt(referrerId))) {
            const referrerNameNormalized = referrerId.toLowerCase()
            const foundIds = nameMap.get(referrerNameNormalized)

            if (foundIds && foundIds.length === 1) {
                // Tìm thấy chính xác 1 người -> RESOLVED
                referrerId = foundIds[0]
                resolvedCount++
                // console.log(`   ✅ Resolved referrer "${row.referrerId}" -> ID: ${referrerId}`)
            } else if (foundIds && foundIds.length > 1) {
                // Tìm thấy nhiều người trùng tên -> AMBIGUOUS
                // console.warn(`   ⚠️  Ambiguous referrer "${row.referrerId}" for User ${id}. Matches IDs: ${foundIds.join(', ')}. Leaving NULL.`)
                ambiguousCount++
                referrerId = null
            } else {
                // Không tìm thấy -> NOT FOUND
                // console.warn(`   ❌ Referrer "${row.referrerId}" not found for User ${id}. Leaving NULL.`)
                notFoundCount++
                referrerId = null
            }
        } else if (referrerId && !isNaN(parseInt(referrerId))) {
            // Là số -> Giữ nguyên (Check tồn tại sẽ ở bước import)
        } else {
            referrerId = null
        }

        // 6. Xử lý CreatedAt
        const createdAt = parseDate(row.createdAt)

        processedData.push({
            id: id,
            name: row.name,
            email: email,
            phone: phone,
            password: password,
            role: role,
            referrerId: referrerId,
            createdAt: createdAt
        })
    }

    console.log(`\n--- Summary ---`)
    console.log(`Toal Users: ${processedData.length}`)
    console.log(`Referrers Resolved (Name->ID): ${resolvedCount}`)
    console.log(`Referrers Ambiguous (Skipped):   ${ambiguousCount}`)
    console.log(`Referrers Not Found (Skipped):   ${notFoundCount}`)

    // Ghi ra file CSV mới
    const csvWriter = createObjectCsvWriter({
        path: outputFilePath,
        header: [
            { id: 'id', title: 'id' },
            { id: 'name', title: 'name' },
            { id: 'email', title: 'email' },
            { id: 'phone', title: 'phone' },
            { id: 'password', title: 'password' },
            { id: 'role', title: 'role' },
            { id: 'referrerId', title: 'referrerId' },
            { id: 'createdAt', title: 'createdAt' },
        ]
    })

    await csvWriter.writeRecords(processedData)
    console.log(`\n✅ Saved to: ${outputFilePath}`)
}

main()
