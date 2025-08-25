import React, { useEffect, useMemo, useState } from 'react'
import { useStore } from '../core/store'

type Tab = { key: string; label: string; icon?: string; render: () => React.ReactNode; highlight?: boolean }

function normalizeHash() {
  const raw = (window.location.hash || '').replace(/^#/, '')
  if (!raw) return ''
  if (raw.startsWith('tab=')) return raw.slice(4)
  if (raw.startsWith('/')) return raw.slice(1)
  return raw
}

export function Tabs({ tabs }: { tabs: Tab[] }) {
  const { state } = useStore()
  const inBattle = !!state.battle
  const keys = useMemo(() => tabs.map(t => t.key), [tabs])
  const defaultKey = tabs[0]?.key || 'dashboard'
  const initial = (() => {
    const k = normalizeHash()
    return keys.includes(k) ? k : defaultKey
  })()
  const [active, setActive] = useState(initial)

  useEffect(() => {
    const desired = `#${active}`
    if (window.location.hash !== desired) window.history.replaceState(null, '', desired)
  }, [active])

  useEffect(() => {
    const onHashChange = () => {
      const k = normalizeHash()
      if (keys.includes(k)) setActive(k)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [keys])

  return (
    <div className="container-fluid py-3" style={{ minHeight: 'calc(100vh - 56px)' }}>
      <div className="row g-3">
        <div className="col-12 col-lg-3">
          <div className="list-group">
            {tabs.map(t => (
              <a
                key={t.key}
                href={`#${t.key}`}
                className={`list-group-item list-group-item-action${active === t.key ? ' active' : ''} ${t.highlight ? 'list-group-item-warning' : ''} ${inBattle ? 'disabled' : ''}`}
                aria-disabled={inBattle}
                onClick={e => {
                  e.preventDefault()
                  if (inBattle) return
                  setActive(t.key)
                }}
              >
                {t.icon ? `${t.icon} ` : ''}{t.label}
              </a>
            ))}
          </div>
        </div>
        <div className="col-12 col-lg-9">
          {tabs.map(t => active === t.key && <div key={t.key} aria-hidden={inBattle}>{t.render()}</div>)}
        </div>
      </div>
    </div>
  )
}


