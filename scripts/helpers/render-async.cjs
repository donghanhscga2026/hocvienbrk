const { Writable } = require('node:stream')
const { renderToPipeableStream } = require('react-dom/server')

// Render async Server Components to completion without a Next server or database.
module.exports = function renderAsync(element) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const timeout = setTimeout(() => { stream.abort(); reject(Error('Async render timed out')) }, 10000)
    const stream = renderToPipeableStream(element, {
      onAllReady() { stream.pipe(new Writable({
        write(chunk, _, done) { chunks.push(chunk.toString()); done() },
        final(done) { clearTimeout(timeout); resolve(chunks.join('')); done() },
      })) },
      onError(error) { clearTimeout(timeout); reject(error) },
    })
  })
}
