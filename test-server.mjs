const http = require('http');
setTimeout(() => {
  const req = http.get('http://localhost:3000/tools/brk', (res) => {
    console.log('Status:', res.statusCode);
    process.exit(0);
  });
  req.on('error', (e) => {
    console.log('Error:', e.message);
    process.exit(1);
  });
  req.setTimeout(10000, () => { console.log('Timeout'); process.exit(1); });
}, 20000);
