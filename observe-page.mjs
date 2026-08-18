import { NS, pluginLabel } from './observe-i18n.mjs'
import { diagFacets, emptyDiagQuery, filterDiag, serializeDiag } from './observe-filter.mjs'

function rangeLabel(t, range) {
  if (range === 'yesterday') return t('rangeYesterday')
  if (range === 'week') return t('rangeWeek')
  if (range === 'month') return t('rangeMonth')
  if (range === 'all') return t('rangeAll')
  return t('rangeToday')
}

function outcomeLabel(t, outcome) {
  if (outcome === 'failed') return t('outcomeFailed')
  if (outcome === 'rejected') return t('outcomeRejected')
  if (outcome === 'degraded') return t('outcomeDegraded')
  if (outcome === 'succeeded') return t('outcomeSucceeded')
  if (outcome === 'started') return t('outcomeStarted')
  return t('outcomeAll')
}

export function createDiagPage(React, t, post, toast, subscribeLocale, ReactDOM) {
  return function DiagPage() {
    const el = React.createElement
    const [, setLocaleTick] = React.useState(0)
    React.useEffect(() => {
      if (typeof subscribeLocale !== 'function') return undefined
      return subscribeLocale(() => setLocaleTick((n) => n + 1))
    }, [subscribeLocale])
    const [rows, setRows] = React.useState([])
    const [truncated, setTruncated] = React.useState(false)
    const [query, setQuery] = React.useState(emptyDiagQuery)
    const [openPick, setOpenPick] = React.useState('')
    const [menuBox, setMenuBox] = React.useState(null)
    const [busy, setBusy] = React.useState(false)
    const facets = diagFacets(rows)
    const visible = filterDiag(rows, query)

    const load = React.useCallback(() => {
      setBusy(true)
      return post('/dsh-observability/query', { limit: 500 }).then((data) => {
        setRows(Array.isArray(data.items) ? data.items : [])
        setTruncated(data.truncated === true)
      }).catch((err) => {
        toast(String(err.message || t('fail')))
      }).finally(() => setBusy(false))
    }, [])

    React.useEffect(() => { load() }, [load])

    React.useEffect(() => {
      if (!openPick) return undefined
      const onDown = (event) => {
        const target = event.target
        if (target && target.closest && (target.closest('[data-dob-pick]') || target.closest('[data-dob-menu]'))) return
        setOpenPick('')
      }
      document.addEventListener('mousedown', onDown, true)
      return () => document.removeEventListener('mousedown', onDown, true)
    }, [openPick])

    const download = React.useCallback((format) => {
      const text = serializeDiag(visible, format)
      if (typeof document === 'undefined') return
      const blob = new Blob([text], { type: format === 'md' ? 'text/markdown;charset=utf-8' : 'application/jsonl;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = format === 'md' ? 'dsh-diag.md' : 'dsh-diag.jsonl'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => { URL.revokeObjectURL(url) }, 3000)
      toast(t('exported'))
    }, [visible])

    function when(at) {
      if (!at) return ''
      const date = new Date(at)
      if (Number.isNaN(date.getTime())) return at
      const pad = (n) => String(n).padStart(2, '0')
      return pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds())
    }

    function pick(id, label, value) {
      return el('button', {
        type: 'button',
        className: 'dob-pick',
        'data-dob-pick': id,
        'data-open': openPick === id ? 'true' : 'false',
        onClick: (event) => {
          if (openPick === id) {
            setOpenPick('')
            return
          }
          const rect = event.currentTarget.getBoundingClientRect()
          setMenuBox({ top: rect.bottom + 4, left: rect.left, minWidth: rect.width })
          setOpenPick(id)
        },
      },
        el('span', { className: 'dob-pick-k' }, label),
        el('span', { className: 'dob-pick-v' }, value),
      )
    }

    function menu(id, options, current, onSelect) {
      if (openPick !== id || !menuBox) return null
      const node = el('div', {
        className: 'dob-menu',
        'data-dob-menu': id,
        style: { top: menuBox.top, left: menuBox.left, minWidth: menuBox.minWidth },
      }, options.map((option) => el('button', {
        key: option.id,
        type: 'button',
        'data-on': option.id === current ? 'true' : 'false',
        onClick: () => {
          onSelect(option.id)
          setOpenPick('')
        },
      }, option.label)))
      if (ReactDOM && typeof ReactDOM.createPortal === 'function' && typeof document !== 'undefined') {
        return ReactDOM.createPortal(node, document.body)
      }
      return node
    }

    const emptyText = rows.length === 0 ? t('empty') : t('emptyFilter')
    const pluginValue = query.plugin === 'all' ? t('pluginAll') : pluginLabel(t, query.plugin)
    const codeValue = query.code === 'all' ? t('codeAll') : query.code

    return el('div', { className: 'dob-page' },
      el('div', { className: 'dob-filters' },
        pick('range', t('filterTime'), rangeLabel(t, query.range)),
        pick('outcome', t('filterOutcome'), outcomeLabel(t, query.outcome)),
        pick('plugin', t('filterPlugin'), pluginValue),
        pick('code', t('filterCode'), codeValue),
        el('input', {
          className: 'dob-search',
          value: query.trace,
          placeholder: t('tracePlaceholder'),
          onChange: (event) => setQuery({ ...query, trace: event.target.value }),
        }),
        query.trace
          ? el('button', { type: 'button', className: 'dob-btn', onClick: () => setQuery({ ...query, trace: '' }) }, t('clearTrace'))
          : null,
      ),
      menu('range', [
        { id: 'today', label: t('rangeToday') },
        { id: 'yesterday', label: t('rangeYesterday') },
        { id: 'week', label: t('rangeWeek') },
        { id: 'month', label: t('rangeMonth') },
        { id: 'all', label: t('rangeAll') },
      ], query.range, (id) => setQuery({ ...query, range: id })),
      menu('outcome', [
        { id: 'all', label: t('outcomeAll') },
        { id: 'failed', label: t('outcomeFailed') },
        { id: 'rejected', label: t('outcomeRejected') },
        { id: 'degraded', label: t('outcomeDegraded') },
        { id: 'succeeded', label: t('outcomeSucceeded') },
        { id: 'started', label: t('outcomeStarted') },
      ], query.outcome, (id) => setQuery({ ...query, outcome: id })),
      menu('plugin', [{ id: 'all', label: t('pluginAll') }].concat(facets.plugins.map((id) => ({ id, label: pluginLabel(t, id) }))), query.plugin, (id) => setQuery({ ...query, plugin: id })),
      menu('code', [{ id: 'all', label: t('codeAll') }].concat(facets.codes.map((id) => ({ id, label: id }))), query.code, (id) => setQuery({ ...query, code: id })),
      el('div', { className: 'dob-toolbar' },
        el('span', { className: 'dob-count' }, t('count', { shown: visible.length, total: rows.length })),
        el('button', { type: 'button', className: 'dob-btn', disabled: busy, onClick: load }, t('refresh')),
        el('button', { type: 'button', className: 'dob-btn', disabled: busy || visible.length === 0, onClick: () => download('jsonl') }, t('exportJson')),
        el('button', { type: 'button', className: 'dob-btn', disabled: busy || visible.length === 0, onClick: () => download('md') }, t('exportMd')),
      ),
      truncated ? el('p', { className: 'dob-note' }, t('truncated')) : null,
      visible.length === 0
        ? el('p', { className: 'dob-empty' }, emptyText)
        : el('div', { className: 'dob-list' }, visible.map((row, index) => el('div', {
          key: (row.operationId || row.traceId || '') + index,
          className: 'dob-row',
        },
          el('div', { className: 'dob-head' },
            el('span', { className: 'dob-kind', 'data-outcome': row.outcome || '' }, outcomeLabel(t, row.outcome)),
            el('span', { className: 'dob-title' }, [pluginLabel(t, row.plugin), row.operation].filter(Boolean).join(' · ')),
            row.code ? el('span', { className: 'dob-code' }, row.code) : null,
          ),
          el('div', { className: 'dob-meta' }, [
            when(row.ts),
            typeof row.durationMs === 'number' ? row.durationMs + 'ms' : '',
            row.stage && row.stage !== 'start' ? row.stage : '',
          ].filter(Boolean).join(' · ')),
          row.traceId ? el('div', { className: 'dob-meta' },
            el('button', {
              type: 'button',
              className: 'dob-trace',
              onClick: () => setQuery({ ...query, trace: row.traceId, range: 'all' }),
            }, row.traceId),
          ) : null,
          row.error && row.error.message ? el('div', { className: 'dob-meta' }, row.error.message) : null,
        ))),
    )
  }
}

export function registerSettings(ctx, React, t, Page) {
  const slots = ctx.get('slots')
  if (slots == null || React == null) return function () {}
  return slots.inject('settings.section', function () {
    return slots.register({
      name: 'settings.section',
      id: 'dsh-observability',
      order: 22,
      locale: NS,
      label() { return t('nav') },
    }, Page)
  })
}
