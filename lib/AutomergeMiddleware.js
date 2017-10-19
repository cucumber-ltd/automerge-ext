const Automerge = require('automerge')
const SseStream = require('ssestream')
const uuid = require('uuid')

/**
 * Creates an Express middleware that acts as a bidirectional transport for Automerge
 * connections. Each HTTP client acts as a peer, and the server acts as a peer.
 *
 * Messages from client to server are sent via HTTP POST.
 * Messages from server to client are sent via Server-Sent Events (EventSource).
 *
 * @param path the path to use for both POST and EventSource
 * @param docSet the docSet containing the server's Automerge documents
 * @returns {Function} an Express middleware
 */
function make(path, docSet) {
  const connections = new Map()

  return function(req, res, next) {
    if (req.url === path) {
      if (req.method === 'GET') {
        const sse = new SseStream(req)
        sse.pipe(res)

        const uid = uuid.v4()
        sse.write({ event: 'automerge-uid', data: uid })
        const connection = new Automerge.Connection(docSet, msg => sse.write({ event: 'automerge-msg', data: msg }))
        connections.set(uid, connection)
        connection.open()

        req.on('close', () => {
          connection.close()
          connections.delete(uid)
          sse.unpipe(res)
        })
      } else if (req.method === 'POST') {
        const { uid, msg } = req.body
        const connection = connections.get(uid)
        connection.receiveMsg(msg)
        res.end()
      } else {
        next()
      }
    }
  }
}

module.exports = { make }