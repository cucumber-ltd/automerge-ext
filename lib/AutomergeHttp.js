const Automerge = require('automerge')

function makeClient(url, EventSource, fetch, docSet, errorHandler) {
  let uid

  const eventSource = new EventSource(url)

  const connection = new Automerge.Connection(docSet, msg => {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid, msg }),
      credentials: 'same-origin',
    }).catch(errorHandler)
  })

  eventSource.addEventListener('automerge-msg', ({ data }) => {
    connection.receiveMsg(JSON.parse(data))
  })

  return new Promise((resolve, reject) => {
    eventSource.addEventListener('automerge-uid', ({ data }) => {
      uid = data
      connection.open()
      resolve(uid)
    })

    eventSource.onerror = errorEvent => {
      connection.close()
      reject(new Error(`EventSource error. HTTP Status: ${errorEvent.status}`))
    }
  })
}

module.exports = { makeClient }
