const C = require('../lib/constants')
const mkdirp = require('mkdirp').sync
mkdirp(C.DATAROOT)
mkdirp(C.COLLECTION_PATH)

const DEVMODE = !!(process.env['SCIENCEFAIR_DEVMODE'])
if (DEVMODE) {
  require('debug-menu').install()
  require('../mocks/populated_collection')({}, (err, local) => {
    if (err) throw err

    local.close(start)
  })
} else {
  start()
}

function start () {
  const requireDir = require('require-dir')
  const choo = require('choo')
  const app = choo()

  const model = {
    state: {
      results: [],
      tags: { tags: {}, showAddField: false },
      datasources: [
        {
          name: 'eLife',
          search: (q) => { console.log(q) }
        }
      ],
      detailshown: true,
      currentsearch: { query: '', tags: [] }
    },
    effects: requireDir('./effects'),
    reducers: requireDir('./reducers')
  }

  require('../lib/localcollection')((err, db) => {
    if (err) throw err

    console.log(db)
    model.state.collection = db
    console.log(model)

    app.model(model)

    app.router('/', (route) => [
      route('/', require('./views/home'))
    ])

    const tree = app.start()
    document.body.appendChild(tree)
  })
}
