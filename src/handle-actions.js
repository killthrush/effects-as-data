const {
  toArray,
  toPromise,
  curry,
  map,
  normalizeListToSuccess,
  normalizeToFailure,
  success
} = require('./util')

const handleActions = (run, handlers, config, actions) => {
  try {
    let a1 = toArray(actions)
    let p1 = map((a) => {
      let plugin = handlers[a.type]
      const noPlugin = typeof plugin === 'undefined'
      if (noPlugin && a.type === 'call') {
        if (a.asyncAction === true) {
          run(handlers, a.fn, a.payload, config)
          return success()
        } else {
          return run(handlers, a.fn, a.payload, config).catch(normalizeToFailure)
        }
      }
      if (noPlugin) {
        throw new Error(`"${a.type}" is not a registered plugin.`)
      }
      let value
      try {
        if (typeof plugin === 'function') {
          value = plugin(a, handlers, config)
        } else {
          value = plugin
        }
      } catch (e) {
        value = normalizeToFailure(e)
      }
      return toPromise(value).catch(normalizeToFailure)
    }, a1)

    return Promise.all(p1).then(normalizeListToSuccess)
  } catch (e) {
    const f = normalizeToFailure(e)
    return Promise.reject(f)
  }
}

module.exports = {
  handleActions: curry(handleActions)
}
