/* eslint-env mocha */
const assert = require('assert')
const Automerge = require('automerge')
const express = require('express')
const bodyParser = require('body-parser')
const EventSource = require('eventsource')
const fetch = require('node-fetch')
const AutomergeModel = require('../lib/AutomergeModel')
const AutomergeMiddleware = require('../lib/AutomergeMiddleware')
const AutomergeHttp = require('../lib/AutomergeHttp')
const AutomergeTestHelper = require('../lib/AutomergeTestHelper')

class TodoList {
  addTodo({ text }) {
    if (this._doc.todos === undefined) this._doc.todos = []
    this._doc.todos.push({ text, done: false })
  }

  getTodos() {
    return this._doc.todos
  }
}

describe('AutomergeModel over HTTP', () => {
  it('sends to server', async () => {
    const app = express()
    app.use(bodyParser.json())

    const serverDocSet = new Automerge.DocSet()
    app.use(AutomergeMiddleware.make('/automerge', serverDocSet))
    const port = 8898
    await new Promise((resolve, reject) => app.listen(port, err => err ? reject(err) : resolve()))
    const url = `http://localhost:${port}/automerge`

    const aslaksDocSet = new Automerge.DocSet()
    AutomergeHttp.makeClient(url, EventSource, fetch, aslaksDocSet, err => console.error(err))

    const juliensDocSet = new Automerge.DocSet()
    AutomergeHttp.makeClient(url, EventSource, fetch, juliensDocSet, err => console.error(err))

    return new Promise(resolve => {
      const docId = 'the-doc'
      aslaksDocSet.setDoc(docId, Automerge.init())

      const aslaksTodoList = AutomergeModel.make(aslaksDocSet, docId, TodoList, ['addTodo'])
      aslaksTodoList.addTodo({ text: 'HELLO' })

      juliensDocSet.registerHandler((id, doc) => {
        const juliensTodoList = AutomergeModel.make(juliensDocSet, docId, TodoList, ['addTodo'])
        assert.deepEqual(juliensTodoList.getTodos(), [{ text: 'HELLO', done: false }])
        resolve()
      })
    })
  })
})

describe('AutomergeModel', () => {
  it('mutates the model', () => {
    const docId = 'the-doc'
    const joesDocSet = new Automerge.DocSet()
    joesDocSet.setDoc(docId, Automerge.init())

    const joesTodoList = AutomergeModel.make(joesDocSet, docId, TodoList, ['addTodo'])
    joesTodoList.addTodo({ text: 'buy milk' })
    assert.deepEqual(joesTodoList.doc, {
      todos: [{ text: 'buy milk', done: false }],
    })
  })

  it('syncs two models modified after connection', () => {
    const docId = 'the-doc'
    const aslaksDocSet = new Automerge.DocSet()
    aslaksDocSet.setDoc(docId, Automerge.init())

    const mattsDocSet = new Automerge.DocSet()

    const link = AutomergeTestHelper.link(aslaksDocSet, mattsDocSet)
    link.open()

    const aslaksTodoList = AutomergeModel.make(aslaksDocSet, docId, TodoList, ['addTodo'])
    aslaksTodoList.addTodo({ text: 'buy milk' })

    const mattsTodoList = AutomergeModel.make(mattsDocSet, docId, TodoList, ['addTodo'])

    assert.deepEqual(mattsTodoList.doc, {
      todos: [{ text: 'buy milk', done: false }],
    })
  })

  it('syncs two models modified before connection', () => {
    const docId = 'the-doc'
    const aslaksDocSet = new Automerge.DocSet()
    aslaksDocSet.setDoc(docId, Automerge.init())

    const mattsDocSet = new Automerge.DocSet()

    const aslaksTodoList = AutomergeModel.make(aslaksDocSet, docId, TodoList, ['addTodo'])
    aslaksTodoList.addTodo({ text: 'buy milk' })

    const link = AutomergeTestHelper.link(aslaksDocSet, mattsDocSet)
    link.open()

    const mattsTodoList = AutomergeModel.make(mattsDocSet, docId, TodoList, ['addTodo'])

    assert.deepEqual(mattsTodoList.doc, {
      todos: [{ text: 'buy milk', done: false }],
    })

    mattsTodoList.addTodo({ text: 'eat crisps' })

    assert.deepEqual(aslaksTodoList.doc, {
      todos: [
        { text: 'buy milk', done: false },
        { text: 'eat crisps', done: false }
      ],
    })
  })
})
