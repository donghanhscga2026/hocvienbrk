import { processPaymentEmails } from '../lib/auto-verify'

async function main() {
  console.log('🚀 Test auto-verify...')
  const result = await processPaymentEmails()
  console.log('\n✅ KẾT QUẢ:', JSON.stringify(result, null, 2))
}
main().catch(e => console.error('ERROR:', e))
