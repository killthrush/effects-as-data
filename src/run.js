const {
  unwrapArgs,
  curry,
  prop,
  toPromise,
  append,
  filter,
  zip,
  isFailure,
  isSuccess,
  toArray
} = require('./util')
const { handleActions } = require('./handle-actions')

const run = (actionHandlers, fn, payload = null, config = {}) => {
  try {
    const h1 = handleActions(run, actionHandlers, config)
    return runComplete(h1, fn, payload, config).then(prop('payload'))
  } catch (e) {
    return Promise.reject(e)
  }
}

const runComplete = (handleActions, fn, payload = null, config = {}) => {
  try {
    let g = fn(payload)
    return runner(handleActions, g, payload, config)
  } catch (e) {
    return Promise.reject(e)
  }
}

const runTest = (actionHandlers, fn, payload = null) => {
  const h1 = handleActions(run, actionHandlers, {})
  return runComplete(h1, fn, payload)
}

const runner = (handleActions, g, input, config = {}, el) => {
  const el1 = getExecutionLog(el)
  let { output, done } = nextOutput(g, input, { actionResultIntercepter: config.actionResultIntercepter })
  const returnResultsAsArray = Array.isArray(output)
  const el2 = addToExecutionLog(el1, input, output)
  if (done) return buildPayload(el2, output)
  return handleActions(output).then((actionResults1) => {
    handleActionResults(toArray(output), actionResults1, el2, config)
    const actionResults2 = returnResultsAsArray ? actionResults1 : unwrapArgs(actionResults1)
    return runner(handleActions, g, actionResults2, config, el2)
  })
}

const handleActionResults = (actions, actionResults, el, config) => {
  handleActionFailures(actions, actionResults, el, config)
  handleActionSuccesses(actions, actionResults, el, config)
}

const handleActionFailures = (actions, actionResults, el, config) => {
  const resultPairs = zip(actions, actionResults)
  const onFailure = config.onFailure || function () {}
  const failures = filter(([action, result]) => isFailure(result), resultPairs)
  failures.forEach(([action, failure]) => {
    onFailure({
      fn: config.name,
      log: el,
      failure,
      action
    })
  })
}

const handleActionSuccesses = (actions, actionResults, el, config) => {
  const resultPairs = zip(actions, actionResults)
  const onSuccess = config.onSuccess || function () {}
  const successes = filter(([action, result]) => isSuccess(result), resultPairs)
  successes.forEach(([action, result]) => {
    onSuccess({
      fn: config.name,
      log: el,
      result,
      action
    })
  })
}

const nextOutput = (g, input, config) => {
  const ari = config.actionResultIntercepter || (v => v)
  const input2 = ari(input)
  let { value: output, done } = g.next(input2)
  return {
    output,
    done
  }
}

const addToExecutionLog = (el, input, output) => {
  const entry = newExecutionLogEntry(input, output)
  return append(entry, el)
}

const newExecutionLogEntry = (input, output) => {
  return [input, output]
}

const getExecutionLog = (el) => {
  return el || []
}

const buildPayload = (log, payload) => {
  return toPromise({
    payload,
    log
  })
}

module.exports = {
  runner,
  run: curry(run),
  runComplete: curry(runComplete),
  runTest: curry(runTest)
}
