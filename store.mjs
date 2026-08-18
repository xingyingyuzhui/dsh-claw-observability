import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

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
      process.stderr.write('[dsh-observability] ' + line)
    } catch { /* nowhere to write */ }
    return false
  }
}
