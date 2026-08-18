import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'client.js'), 'utf8')

test('generated client keeps the factory contract', () => {
  assert.match(src, /Do not edit by hand/)
  assert.match(src, /id: 'dsh-observability'/)
  assert.match(src, /inject = \['slots', 'locale'\]/)
  assert.match(src, /return module\.exports/)
  assert.match(src, /settings\.section/)
  assert.match(src, /nav: '运行诊断'/)
  assert.match(src, /tracePlaceholder/)
  assert.match(src, /function filterDiag/)
  assert.match(src, /data-dob-pick/)
  assert.match(src, /X-DSH-Observability/)
})
