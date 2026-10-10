import assert from 'node:assert/strict'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { CODES, currentTraceId, diagFile, operation, runWithTrace, setObserveHome } from '../observe.mjs'
import { sanitizeEvent } from '../sanitize.mjs'

test('sanitize drops secrets and unknown fields', () => {
  const row = sanitizeEvent({
    plugin: 'dsh-claw-memory',
    operation: 'write_vault',
    outcome: 'failed',
    token: 'ghp_secret',
    prompt: 'full prompt',
    error: { name: 'Error', message: 'bearer abc failed' },
    extra: { dump: true },
  })
  assert.equal(row.plugin, 'dsh-claw-memory')
  assert.equal(row.token, undefined)
  assert.equal(row.prompt, undefined)
  assert.equal(row.extra, undefined)
  assert.equal(row.error.message, '[redacted]')
})

test('operation emits one terminal and keeps a trace', async () => {
  const home = await mkdtemp(join(tmpdir(), 'obs-'))
  setObserveHome(home)
  const op = operation({ plugin: 'dsh-claw-registry', feature: 'agent', operation: 'create_agent' })
  op.start()
  op.stage('reserve_dir')
  const done = op.success({ slug: 'demo' })
  assert.equal(done.outcome, 'succeeded')
  assert.match(done.traceId, /^tr_/)
  assert.equal(op.success({ slug: 'again' }), null)
  const text = await readFile(diagFile(home), 'utf8')
  const rows = text.trim().split('\n').map((line) => JSON.parse(line))
  assert.equal(rows.filter((row) => row.outcome === 'succeeded').length, 1)
  assert.ok(rows.some((row) => row.outcome === 'started'))
})

test('runWithTrace inherits across child operations', () => {
  setObserveHome(join(tmpdir(), 'obs-als'))
  runWithTrace('tr_fixedtrace01', () => {
    assert.equal(currentTraceId(), 'tr_fixedtrace01')
    const parent = operation({ plugin: 'dsh-claw-registry', operation: 'create_agent' })
    parent.run(() => {
      const child = operation({ plugin: 'dsh-claw-identity', operation: 'write_identity' })
      assert.equal(child.traceId, 'tr_fixedtrace01')
      assert.equal(child.parentOperationId, parent.operationId)
      child.degraded(CODES.MEMORY_READ_FALLBACK_EMPTY, { skipReason: 'enoent' })
    })
    parent.success()
  })
})
