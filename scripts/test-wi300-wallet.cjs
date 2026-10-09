const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
function load(file, mocks = {}) {
  const module = { exports: {} }
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  new Function('require', 'module', 'exports', code)(name => name in mocks ? mocks[name] : require(name), module, module.exports)
  return module.exports
}
const display = load('lib/wi300/wallet-display.ts')
assert.equal(display.walletText('MFC MBDT MBV', false), 'MFC MBDT MBV')
assert.equal(display.walletText('MFC MBDT MBV', true), 'Wi300 Wi Đối ứng Voucher Wi')
assert.equal(display.walletMoney(26866666, true), '26.866.666 VNĐ')
assert.equal(display.walletMoney(26866666, false), '$26866666.00')
assert.equal(display.walletMoney(-1250.25, true), '-1.250,25 VNĐ')
assert.equal(display.walletTransactionAmount(386386, 'BRKD', true), '386.386 Wi Đối ứng')
assert.equal(display.walletTransactionAmount(50000, 'MBV', true), '50.000 VNĐ (Voucher Wi)')
assert.equal(display.walletTransactionAmount(386386, 'BRKD', false), '$386386.00')
let brand = null
const Wallet = load('components/brk/BrkWalletCard.tsx', {
  '@/components/wi300/Wi300BrandContext': { useWi300Brand: () => brand },
  '@/lib/wi300/wallet-display': display,
}).default
const props = { balance: 250000, totalEarned: 300000, totalWithdrawn: 50000 }
const old = renderToStaticMarkup(React.createElement(Wallet, props))
assert.match(old, /Ví MFC/)
assert.match(old, /\$250000.00/)
brand = { variant: 'wi300' }
const wi = renderToStaticMarkup(React.createElement(Wallet, props))
assert.match(wi, /Ví Wi/)
assert.match(wi, /250.000 VNĐ/)
assert.doesNotMatch(wi, /MFC|\$/)
assert.deepEqual(props, { balance: 250000, totalEarned: 300000, totalWithdrawn: 50000 })
console.log('WI300 wallet: brand isolation, VND formatting and unchanged ledger values passed.')
