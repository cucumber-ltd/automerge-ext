const Automerge = require('automerge')

function makeClient(url, EventSource, fetch, docSet, errorHandler) {
  let uid

  const connection = new Automerge.Connection(docSet, msg =>
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid, msg }),
      credentials: 'same-origin',
    }).catch(errorHandler))

  const eventSource = new EventSource(url)

  eventSource.onerror = () => connection.close()

  eventSource.addEventListener('automerge-uid', ({ data }) => {
    uid = data
    connection.open()
  })

  eventSource.addEventListener('automerge-msg', ({ data }) => {
    connection.receiveMsg(JSON.parse(data))
  })
}

module.exports = { makeClient }
