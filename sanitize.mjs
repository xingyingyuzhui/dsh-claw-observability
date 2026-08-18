const ALLOWED = new Set([
  'ts', 'level', 'plugin', 'feature', 'operation', 'stage', 'outcome', 'code',
  'traceId', 'operationId', 'parentOperationId',
  'agentId', 'sessionId', 'childSessionId', 'durationMs',
  'recovery', 'error', 'state', 'remainingArtifacts',
  'decision', 'matchedLayer', 'reason', 'policyHash', 'tool',
  'skipReason', 'fileCount', 'bytes', 'slug',
])

const SECRET = /(api[_-]?key|token|secret|password|authorization|bearer|cookie|sk-[a-z0-9]|ghp_|github_pat)/i

export function redactText(value) {
  const text = String(value == null ? '' : value)
  if (!text) return ''
  if (SECRET.test(text)) return '[redacted]'
  return text.length > 240 ? text.slice(0, 237) + '…' : text
}

export function serializeError(error) {
  if (!error) return undefined
  if (typeof error === 'string') return { type: 'Error', message: redactText(error) }
  return {
    type: error.name || error.constructor && error.constructor.name || 'Error',
    message: redactText(error.message || error),
  }
}

export function sanitizeEvent(raw) {
  const value = raw && typeof raw === 'object' ? raw : {}
  const out = {}
  for (const key of ALLOWED) {
    if (value[key] == null || value[key] === '') continue
    if (key === 'error') {
      const err = serializeError(value.error)
      if (err) out.error = err
      continue
    }
    if (key === 'recovery' && value.recovery && typeof value.recovery === 'object') {
      out.recovery = {
        attempted: value.recovery.attempted === true,
        outcome: value.recovery.outcome === 'failed' ? 'failed' : (value.recovery.outcome === 'succeeded' ? 'succeeded' : String(value.recovery.outcome || '')),
      }
      continue
    }
    if (key === 'remainingArtifacts' && Array.isArray(value.remainingArtifacts)) {
      out.remainingArtifacts = value.remainingArtifacts.filter((item) => typeof item === 'string').slice(0, 12)
      continue
    }
    if (key === 'reason' || key === 'skipReason') {
      out[key] = redactText(value[key])
      continue
    }
    out[key] = value[key]
  }
  return out
}
