const fs = require('fs');
const content = fs.readFileSync('app/tools/email-mkt/EMAIL_MKT_PLAN.md', 'utf-8');
const lines = content.split('\n');

console.log('=== FIRST 15 LINES ===');
console.log(lines.slice(0, 15).join('\n'));

console.log('\n=== SECTIONS ===');
const sections = lines.filter(l => l.startsWith('## '));
sections.forEach(s => console.log('  ' + s));

console.log('\n=== CODE BLOCKS BY LANGUAGE ===');
const codeBlocks = lines.filter(l => l.startsWith('```'));
const langs = {};
for (let i = 0; i < codeBlocks.length; i++) {
  const lang = codeBlocks[i].replace('```', '').trim();
  if (!langs[lang]) langs[lang] = 0;
  langs[lang]++;
}
for (const [k, v] of Object.entries(langs)) {
  console.log('  ' + (k || '(plain)') + ': ' + v + ' blocks');
}

console.log('\n=== LAST 5 LINES ===');
console.log(lines.slice(-5).join('\n'));

console.log('\nTotal: ' + lines.length + ' lines, ' + (content.length / 1024).toFixed(0) + ' KB');
