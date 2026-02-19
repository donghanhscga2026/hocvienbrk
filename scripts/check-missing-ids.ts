
import fs from 'fs'
import csv from 'csv-parser'

async function checkMissingIds() {
    const ids = new Set<number>()
    const csvFilePath = 'processed-users.preview.csv'

    if (!fs.existsSync(csvFilePath)) {
        console.error(`File not found: ${csvFilePath}`)
        return
    }

    console.log(`Checking IDs in ${csvFilePath}...`)

    fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
            if (row.id) {
                ids.add(parseInt(row.id))
            }
        })
        .on('end', () => {
            console.log(`Found ${ids.size} unique IDs.`)

            const missingIds: number[] = []
            // Check range 0 to 838 (inclusive)
            for (let i = 0; i <= 838; i++) {
                if (!ids.has(i)) {
                    missingIds.push(i)
                }
            }

            if (missingIds.length > 0) {
                console.log(`❌ Missing IDs found (${missingIds.length}):`)
                console.log(missingIds.join(', '))
            } else {
                console.log('✅ No missing IDs in range 0-838.')
            }
        })
}

checkMissingIds()
