const fs = require('node:fs')
const path = require('node:path')
const webPush = require('web-push')
// No network calls. Write private keys only to an ignored local file.
const args = Object.fromEntries(process.argv.slice(2).map(v => {
  const split = v.indexOf('=')
  return [v.slice(2,split),v.slice(split+1)]
}))
if (!args.subject || !args.origins) {
  console.log('Usage: node scripts/generate-web-push-keys.cjs --subject=mailto:you@example.com --origins=https://your-site.example')
  console.log('Creates .env.web-push.local (mode 600); refuses to overwrite. Never commit or share the private key.')
  process.exit(0)
}
if (!/^mailto:[^\s@]+@[^\s@]+$/.test(args.subject)) throw new Error('Use a real contact email as mailto:...')
const origins=args.origins.split(',')
if (!origins.every(origin => { try { const u=new URL(origin);return u.origin===origin && u.protocol==='https:' } catch {return false} })) throw new Error('Origins must be exact HTTPS origins, separated by commas.')
const keys=webPush.generateVAPIDKeys()
const output=path.resolve(__dirname,'..','.env.web-push.local')
fs.writeFileSync(output,[
  'WEB_PUSH_VAPID_PUBLIC_KEY='+keys.publicKey,
  'WEB_PUSH_VAPID_PRIVATE_KEY='+keys.privateKey,
  'WEB_PUSH_VAPID_SUBJECT='+args.subject,
  'WEB_PUSH_ORIGINS='+args.origins,
  ''
].join('\n'),{flag:'wx',mode:0o600})
console.log('Created .env.web-push.local. Add its four values to Vercel environment variables, then redeploy. Keys were not printed.')
