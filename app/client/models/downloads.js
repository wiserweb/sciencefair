const all = require('lodash/every')
const uniqBy = require('lodash/uniqBy')
const speedometer = require('speedometer')
const datasource = require('../lib/getdatasource')

const debug = require('debug')('sciencefair:downloads')

module.exports = (state, bus) => {
  state.downloads = {
    speed: { up: 0, down: 0 }
  }

  const render = () => bus.emit('renderer:render')

  const downspeed = speedometer()
  const upspeed = speedometer()

  const speed = () => state.downloads.speed
  const setspeed = speed => { state.downloads.speed = speed }

  const add = papers => {
    if (!Array.isArray(papers)) papers = [papers]
    debug('adding downloads', papers)

    papers = papers.filter(p => !p.downloading && !(p.progress === 1))
    if (papers.length === 0) {
      debug ('no papers to download')
      return
    }

    const allready = all(papers.forEach(p => p.candownload()))

    papers.forEach(p => {
      const dl = p.download()
      if (dl) dl.on('progress', render).on('end', render)
    })

    if (!allready) {
      bus.emit('notification:add', {
        title: `Download${papers.length > 1 ? 's' : ''} queued`,
        message: 'Datasource is still syncing metadata, downloads queued'
      })
    }

    bus.emit('tags:add', { tag: '__local', papers: papers })
  }

  const updatespeed = data => {
    upspeed(data.up)
    downspeed(data.down)
    const before = speed()
    const after = { up: upspeed(), down: downspeed() }
    const changed = before.up !== after.up || before.down !== after.down
    if (changed) {
      setspeed(after)
      render()
    }
  }

  const poll = () => datasource.all().forEach(ds => updatespeed(ds.speed()))

  setInterval(poll, 1000)

  bus.on('downloads:add', add)
}


// // this subscription sets downloads running that were part-completed
// // when the app last quit
//
// const localcollection = require('../lib/localcollection')
// const getpaper = require('../lib/getpaper')
//
// const restartdownloads = cb => localcollection(
//   (err, db) => {
//     let n = 0
//     db.docstore
//       .createReadStream()
//       .on('data', data => {
//         n++
//       })
//       .on('end', () => {
//         let loaded = 0
//         let incomplete = 0
//         db.docstore
//           .createReadStream()
//           .on('data', data => {
//             const paper = getpaper(data.value)
//             paper.filesPresent((err, progress) => {
//               if (err) return cb(err)
//               loaded ++
//               if (progress < 100) {
//                 console.log('restarting paper download')
//                 incomplete++
//                 paper.download(() => {})
//               }
//               if (loaded === n) cb(null, incomplete)
//             })
//           })
//       })
//       .on('error', cb)
//   }
// )
//
// module.exports = (emit, done) => restartdownloads((err, n) => {
//   if (err) return done(err)
//   if (n > 0) {
//     emit('note_add', {
//       title: 'Restoring downloads',
//       message: `${n} partially completed download${n === 1 ? '' : 's'} ha${n === 1 ? 's' : 've'} been restarted`
//     }, done)
//   } else {
//     done()
//   }
// })
