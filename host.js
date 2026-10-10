import { getObserveHome, readDiag, setObserveHome } from './store.mjs'
import { registerJsonRoute } from 'dsh-claw-core/http'

export const name = 'dsh-claw-observability'
export const inject = ['connection']

const _internal = {
  setDshHome(dir) { setObserveHome(dir) },
  getDshHome() { return getObserveHome() },
}
export { _internal }

export function apply(ctx) {
  registerJsonRoute(ctx, {
    path: '/api/dsh-claw/observability/query',
    handle: async (body) => {
      const result = readDiag(getObserveHome(), body && body.limit)
      return { items: result.items, truncated: result.truncated }
    },
  })
}
