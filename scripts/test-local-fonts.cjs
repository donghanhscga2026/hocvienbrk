// Parse the actual files with the same font reader used by Next.js.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const exported=require('next/dist/compiled/@next/font/dist/fontkit').default
const readFont=exported.default || exported
const dir=path.join(__dirname,'../public/fonts')
const files=fs.readdirSync(dir).filter(name=>name.endsWith('.woff2'))
assert.equal(files.length,15)
for(const name of files){
  const buffer=fs.readFileSync(path.join(dir,name))
  assert.equal(buffer.subarray(0,4).toString(),'wOF2',name+' must contain WOFF2 bytes')
  const font=readFont(buffer)
  assert.ok(font.familyName && font.numGlyphs>0,name+' must parse as a font')
}
console.log('15 local WOFF2 fonts parsed successfully.')
