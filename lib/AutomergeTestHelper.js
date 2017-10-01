const Automerge = require('automerge')

function connect(docSetA, docSetB) {
  let connectionA, connectionB
  connectionA = new Automerge.Connection(docSetA, msg => {
    connectionB.receiveMsg(msg)
  })
  connectionB = new Automerge.Connection(docSetB, msg => {
    connectionA.receiveMsg(msg)
  })
  return [connectionA, connectionB]
}

function link(docSetA, docSetB) {
  const [connectionA, connectionB] = connect(docSetA, docSetB)

  const link = {
    open: () => {
      connectionA.open()
      connectionB.open()
      return link
    },

    close: () => {
      connectionA.close()
      connectionB.close()
      return link
    },
  }
  return link
}

module.exports = { link }
