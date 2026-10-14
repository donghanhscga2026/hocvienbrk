// Loader cách ly cho regression tests: hỗ trợ alias và JSON, không khởi động Next.
const fs = require('node:fs'), path = require('node:path'), ts = require('typescript')
const root = path.resolve(__dirname, '../..')
module.exports = function load(file, mocks = {}) {
  const cache = new Map()
  function read(target) {
    if (cache.has(target)) return cache.get(target).exports
    if (target.endsWith('.json')) return JSON.parse(fs.readFileSync(path.join(root, target), 'utf8'))
    const mod = { exports: {} }; cache.set(target, mod)
    const code = ts.transpileModule(fs.readFileSync(path.join(root, target), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
    new Function('require', 'module', 'exports', code)(name => {
      if (name in mocks) return mocks[name]
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? name.slice(2) : path.posix.join(path.posix.dirname(target), name)
        if ('@/' + base in mocks) return mocks['@/' + base]
        const found = [base, base + '.ts', base + '.tsx', base + '.json'].find(file => fs.existsSync(path.join(root, file)) && fs.statSync(path.join(root, file)).isFile())
        if (found) return read(found)
      }
      return require(name)
    }, mod, mod.exports)
    return mod.exports
  }
  return read(file)
}
