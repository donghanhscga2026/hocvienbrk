
import fs from 'fs'
import csv from 'csv-parser'

const results: any[] = []
const emailCount: Record<string, number> = {}

fs.createReadStream('processed-users.preview.csv')
    .pipe(csv())
    .on('data', (data) => {
        results.push(data)
        const email = data.email
        emailCount[email] = (emailCount[email] || 0) + 1
    })
    .on('end', () => {
        console.log('Duplicate Emails Found:')
        for (const [email, count] of Object.entries(emailCount)) {
            if (count > 1) {
                console.log(`- ${email}: ${count} times`)
                // Tìm các ID trùng
                const ids = results.filter(r => r.email === email).map(r => r.id)
                console.log(`  IDs: ${ids.join(', ')}`)
            }
        }
    })
