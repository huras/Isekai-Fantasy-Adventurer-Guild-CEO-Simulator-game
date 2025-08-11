import React from 'react'
import { useStore } from '../core/store'

export function Events() {
  const { state } = useStore()
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">Event Log</h5>
        <div className="border rounded-3 p-2" style={{ minHeight: 160, maxHeight: 280, overflowY: 'auto' }}>
          {(state.logs.events || []).slice(0, 50).map((e, i) => (
            <div key={i}>• {e}</div>
          ))}
        </div>
        {state.archives?.fallen?.length ? (
          <div className="mt-3">
            <h6 className="mb-2">Graveyard ⚰️</h6>
            <div className="small text-muted">
              {state.archives.fallen.slice(0, 10).map((f, i) => (
                <div key={i}>☠️ {f.name} — {f.class} · D{f.diedOnDay} · {f.cause}</div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}


