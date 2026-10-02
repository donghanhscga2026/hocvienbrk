// Chỉ đổi kích thước ảnh logo gốc thành tài sản app, không vẽ lại thiết kế.
const sharp = require('sharp')
const fs = require('node:fs')
const path = require('node:path')
async function run() {
  const source = process.argv[2]
  if (!source) throw Error('Cần đường dẫn ảnh logo gốc.')
  const root = path.resolve(__dirname, '..')
  fs.mkdirSync(path.join(root, 'public/pwa'), { recursive: true })
  const sizes = [['icon-192.png',192,0.90],['icon-512.png',512,0.90],['icon-maskable-512.png',512,0.68],['apple-touch-icon.png',180,0.90]]
  for (const [name,size,scale] of sizes) {
    const logo = await sharp(source).resize(Math.round(size*scale),Math.round(size*scale),{fit:'contain',background:'#ffffff'}).flatten({background:'#ffffff'}).png().toBuffer()
    await sharp({create:{width:size,height:size,channels:3,background:'#ffffff'}}).composite([{input:logo,gravity:'centre'}]).png().toFile(path.join(root,'public/pwa',name))
  }
  const frames = await Promise.all([16,32,48].map(size => sharp(source).resize(size,size,{fit:'contain',background:'#ffffff'}).flatten({background:'#ffffff'}).png().toBuffer()))
  const header = Buffer.alloc(6+16*frames.length); header.writeUInt16LE(1,2); header.writeUInt16LE(frames.length,4)
  let offset = header.length
  frames.forEach((frame,i) => { const pos=6+16*i, size=[16,32,48][i]; header[pos]=size;header[pos+1]=size;header.writeUInt16LE(1,pos+4);header.writeUInt16LE(32,pos+6);header.writeUInt32LE(frame.length,pos+8);header.writeUInt32LE(offset,pos+12);offset+=frame.length })
  fs.writeFileSync(path.join(root,'app/favicon.ico'),Buffer.concat([header,...frames]))
}
run().catch(error=>{console.error(error.message);process.exitCode=1})
