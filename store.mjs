import { appendFileSync, closeSync, mkdirSync, openSync, readSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { sanitizeEvent } from './sanitize.mjs'

const READ_CAP = 1048576
const DEFAULT_LIMIT = 500
const MAX_LIMIT = 2000

let observeHome = process.env.DSH_HOME || join(homedir(), '.dsh')

export function setObserveHome(dir) {
  observeHome = dir
}

export function getObserveHome() {
  return observeHome
}

export function diagFile(home) {
  return join(home || observeHome, 'agent-observe', 'diag.jsonl')
}

export function writeDiag(event) {
  const line = JSON.stringify(event) + '\n'
  try {
    const file = diagFile(observeHome)
    mkdirSync(dirname(file), { recursive: true })
    appendFileSync(file, line)
    return true
  } catch (error) {
    try {
      process.stderr.write('[dsh-claw-observability] ' + line)
    } catch { /* nowhere to write */ }
    return false
  }
}

export function readDiag(home, limit) {
  const cap = Number.isFinite(Number(limit)) ? Math.max(1, Math.min(MAX_LIMIT, Math.floor(Number(limit)))) : DEFAULT_LIMIT
  const file = diagFile(home)
  let text = ''
  let truncated = false
  try {
    const stat = statSync(file)
    const start = stat.size > READ_CAP ? stat.size - READ_CAP : 0
    truncated = start > 0
    const fd = openSync(file, 'r')
    try {
      const buf = Buffer.alloc(stat.size - start)
      readSync(fd, buf, 0, buf.length, start)
      text = buf.toString('utf8')
    } finally {
      closeSync(fd)
    }
  } catch {
    return { items: [], truncated: false }
  }
  const lines = text.split('\n')
  if (truncated && lines.length) lines.shift()
  const rows = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    try {
      rows.push(sanitizeEvent(JSON.parse(line)))
    } catch { /* skip bad line */ }
  }
  return { items: rows.slice(-cap).reverse(), truncated }
}
