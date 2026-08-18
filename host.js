import { getObserveHome, readDiag, setObserveHome } from './store.mjs'

export const name = 'dsh-observability'
export const inject = ['webServer']

const BODY_CAP = 65536
const LOOPBACK_ORIGIN = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/

const _internal = {
  setDshHome(dir) { setObserveHome(dir) },
  getDshHome() { return getObserveHome() },
}
export { _internal }

const writeJson = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(body))
}

const readJsonBody = (req, cap = BODY_CAP) => new Promise((resolveBody, reject) => {
  let size = 0
  const chunks = []
  req.on('data', (chunk) => {
    size += chunk.length
    if (size > cap) {
      reject(new Error('body too large'))
      req.destroy()
      return
    }
    chunks.push(chunk)
  })
  req.on('end', () => {
    try {
      resolveBody(chunks.length === 0 ? {} : JSON.parse(Buffer.concat(chunks).toString('utf8')))
    } catch {
      reject(new Error('invalid json body'))
    }
  })
  req.on('error', reject)
})

const guard = (req, res) => {
  if (req.method !== 'POST') {
    writeJson(res, 405, { ok: false, error: 'method not allowed' })
    return false
  }
  const headers = req.headers || {}
  if (headers['x-dsh-observability'] !== '1') {
    writeJson(res, 403, { ok: false, error: 'missing csrf header' })
    return false
  }
  const origin = headers.origin
  if (origin !== undefined && origin !== null && !LOOPBACK_ORIGIN.test(origin)) {
    writeJson(res, 403, { ok: false, error: 'origin not allowed' })
    return false
  }
  return true
}

export function apply(ctx) {
  const handle = (fn) => async (req, res) => {
    if (!guard(req, res)) return
    try {
      const body = await readJsonBody(req)
      await fn(req, res, body)
    } catch (error) {
      writeJson(res, 400, { ok: false, error: error && error.message ? error.message : 'bad request' })
    }
  }

  const routes = [
    ctx.webServer.register({
      kind: 'exact',
      path: '/dsh-observability/query',
      handler: handle(async (_req, res, body) => {
        const result = readDiag(getObserveHome(), body && body.limit)
        writeJson(res, 200, { ok: true, items: result.items, truncated: result.truncated })
      }),
    }),
  ]

  ctx.effect(() => () => {
    for (const dispose of routes) {
      if (typeof dispose === 'function') dispose()
    }
  })
}
