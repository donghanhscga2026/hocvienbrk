const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app/tools/email-mkt/EMAIL_MKT_PLAN.md');
const buffer = fs.readFileSync(filePath);

// Treat the buffer as Windows-1252 (or ISO-8859-1) and convert back to UTF-8
// In Node.js, reading as 'binary' or 'latin1' and then treating that as UTF-8 can sometimes work if the bytes are preserved.
const latin1Content = buffer.toString('binary');
const utf8Content = Buffer.from(latin1Content, 'binary').toString('utf8');

// Check if it looks better
console.log('Sample after repair:', utf8Content.substring(0, 500));

fs.writeFileSync(filePath, utf8Content, 'utf8');
console.log('Repair complete.');
