const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app/tools/email-mkt/EMAIL_MKT_PLAN.md');
const content = fs.readFileSync(filePath, 'utf8');

// This is a common Mojibake pattern: UTF-8 bytes read as Windows-1252 and then saved as UTF-8.
// We need to convert the string back to bytes using 'latin1' (which is 1-to-1 with the first 256 Unicode points)
// and then re-read those bytes as UTF-8.
const buffer = Buffer.from(content, 'latin1');
const fixedContent = buffer.toString('utf8');

console.log('Sample after repair:', fixedContent.substring(0, 500));

fs.writeFileSync(filePath, fixedContent, 'utf8');
console.log('Repair complete.');
