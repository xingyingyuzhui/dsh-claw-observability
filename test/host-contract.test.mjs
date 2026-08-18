import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { apply, inject, name, _internal } from '../host.js'

function postReq(body, headers) {
  const req = new EventEmitter()
  req.method = 'POST'
  req.headers = { 'x-dsh-observability': '1', ...(headers || {}) }
  queueMicrotask(() => {
    if (body) req.emit('data', Buffer.from(JSON.stringify(body)))
    req.emit('end')
  })
  return req
}

test('host named exports', () => {
  assert.equal(name, 'dsh-observability')
  assert.deepEqual(inject, ['webServer'])
})

test('apply registers the query route and disposes it', () => {
  const disposed = []
  const routes = []
  const ctx = {
    webServer: {
      register(entry) {
        routes.push(entry)
        return () => disposed.push(entry.path)
      },
    },
    effect(factory) { ctx._stop = factory() },
  }
  apply(ctx)
  assert.equal(routes.length, 1)
  assert.equal(routes[0].path, '/dsh-observability/query')
  ctx._stop()
  assert.deepEqual(disposed, ['/dsh-observability/query'])
})

test('query returns newest sanitized events and rejects missing csrf', async () => {
  const home = await mkdtemp(join(tmpdir(), 'dob-'))
  _internal.setDshHome(home)
  await mkdir(join(home, 'agent-observe'), { recursive: true })
  await writeFile(join(home, 'agent-observe', 'diag.jsonl'), [
    JSON.stringify({ plugin: 'dsh-agent-gate', outcome: 'started', ts: '2026-08-18T10:00:00.000Z', token: 'secret' }),
    JSON.stringify({ plugin: 'dsh-agent-registry', outcome: 'failed', code: 'REGISTRY_SAVE_FAILED', ts: '2026-08-18T11:00:00.000Z', traceId: 'tr_1' }),
    '',
  ].join('\n'))
  const routes = []
  apply({
    webServer: { register(entry) { routes.push(entry); return () => {} } },
    effect() {},
  })
  let status = 0
  let body = ''
  const res = {
    writeHead(code) { status = code },
    end(text) { body = text },
  }
  await routes[0].handler(postReq({ limit: 10 }), res)
  assert.equal(status, 200)
  const payload = JSON.parse(body)
  assert.equal(payload.ok, true)
  assert.equal(payload.items.length, 2)
  assert.equal(payload.items[0].code, 'REGISTRY_SAVE_FAILED')
  assert.equal(payload.items[0].token, undefined)
  assert.equal(payload.items[1].outcome, 'started')

  status = 0
  body = ''
  const bad = postReq({}, { 'x-dsh-observability': undefined })
  bad.headers = {}
  await routes[0].handler(bad, res)
  assert.equal(status, 403)
})
