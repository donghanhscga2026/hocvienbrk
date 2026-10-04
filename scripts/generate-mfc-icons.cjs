// Chỉ đổi kích thước ảnh logo gốc thành tài sản app, không vẽ lại thiết kế.
const sharp = require('sharp')
const fs = require('node:fs')
const path = require('node:path')
async function run() {
  const root = path.resolve(__dirname, '..')
  const source = process.argv[2] || path.join(root, 'public/brand/mfc-logo.png')
  const transparent = { r: 0, g: 0, b: 0, alpha: 0 }
  fs.mkdirSync(path.join(root, 'public/pwa'), { recursive: true })
  const sizes = [['icon-192.png',192,0.90],['icon-512.png',512,0.90],['icon-maskable-512.png',512,0.68],['apple-touch-icon.png',180,0.90]]
  for (const [name,size,scale] of sizes) {
    // Android maskable cần nền kín; các biểu tượng còn lại giữ alpha của logo.
    const background = name.includes('maskable') ? '#ffffff' : transparent
    const logo = await sharp(source).resize(Math.round(size*scale),Math.round(size*scale),{fit:'contain',background:transparent}).png().toBuffer()
    await sharp({create:{width:size,height:size,channels:4,background}}).composite([{input:logo,gravity:'centre'}]).png().toFile(path.join(root,'public/pwa',name))
  }
  const frames = await Promise.all([16,32,48].map(size => sharp(source).resize(size,size,{fit:'contain',background:transparent}).png().toBuffer()))
  const header = Buffer.alloc(6+16*frames.length); header.writeUInt16LE(1,2); header.writeUInt16LE(frames.length,4)
  let offset = header.length
  frames.forEach((frame,i) => { const pos=6+16*i, size=[16,32,48][i]; header[pos]=size;header[pos+1]=size;header.writeUInt16LE(1,pos+4);header.writeUInt16LE(32,pos+6);header.writeUInt32LE(frame.length,pos+8);header.writeUInt32LE(offset,pos+12);offset+=frame.length })
  fs.writeFileSync(path.join(root,'app/favicon.ico'),Buffer.concat([header,...frames]))
  // Logo đầu trang và ảnh đại diện khi chia sẻ dùng cùng một thiết kế, nền trong suốt.
  await sharp(source).resize(200,200,{fit:'contain',background:transparent}).png().toFile(path.join(root,'public/logobrk-50px.png'))
  await sharp(source).resize(1200,630,{fit:'contain',background:transparent}).png().toFile(path.join(root,'public/og-image.png'))
}
run().catch(error=>{console.error(error.message);process.exitCode=1})
