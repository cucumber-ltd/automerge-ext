const Automerge = require('automerge')

/**
 * Creates a proxy for a model which automatically syncs its state with other models
 *
 * @param docSet the docSet the Automerge doc lives in
 * @param docId the id of the Automerge doc
 * @param Model constructor of the model to proxy
 * @param exposeAutomergeProperties set to true if `#state` should expose Automerge properties
 * @returns Proxy
 */
function make(docSet, docId, Model, exposeAutomergeProperties) {
  let doc = docSet.getDoc(docId)
  if (!doc)
    throw new Error(`No doc for docId ${docId}. Make sure it's created first!`)
  const model = new Model(doc)

  const DocHandler = {
    get(target, key) {
      // TODO: Don't wrap query methods in Automerge.change
      if (typeof model[key] === 'function') {
        return (...args) => {
          let result = null
          const oldDoc = docSet.getDoc(docId)
          const newDoc = Automerge.change(oldDoc, key, doc => {
            model.doc = doc
            result = model[key](...args)
          })
          docSet.setDoc(docId, newDoc)
          return result
        }
      } else if (key === 'doc') {
        // Strip out the Automerge objectId properties.
        const doc = docSet.getDoc(docId)
        if (!doc) return doc
        if (exposeAutomergeProperties) return doc
        return JSON.parse(
          JSON.stringify(
            doc,
            (key, value) => (key === '_objectId' ? undefined : value)
          )
        )
      } else {
        return target[key]
      }
    },
  }

  return new Proxy({}, DocHandler)
}

module.exports = { make }
