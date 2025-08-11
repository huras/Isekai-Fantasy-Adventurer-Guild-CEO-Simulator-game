import React, { useMemo } from 'react'
import { useStore } from '../core/store'

export function Kitchen() {
  const { state, actions } = useStore()
  const food = state.kitchen?.foodStorage || []
  const waiting = state.kitchen?.waitingForBreakfast || []

  const foodCounts = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    for (const f of food) {
      const key = f.name
      const entry = map.get(key) || { name: f.name, count: 0 }
      entry.count += 1
      map.set(key, entry)
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [food])

  const hungryNames = useMemo(() => {
    const idToName = new Map(state.members.map(m => [m.id, m.name] as const))
    return waiting.map(id => idToName.get(id) || id)
  }, [waiting, state.members])

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between">
          <h5 className="card-title m-0">Kitchen</h5>
          <button className="btn btn-sm btn-primary" onClick={() => actions.serveBreakfast()}>Serve Breakfast</button>
        </div>

        <div className="row mt-3 g-3">
          <div className="col-12 col-md-6">
            <div className="fw-bold text-uppercase small text-muted mb-2">Food Storage</div>
            {foodCounts.length === 0 ? (
              <div className="text-muted">No food in storage. Buy food from the Shop.</div>
            ) : (
              <ul className="list-group">
                {foodCounts.map(fc => (
                  <li key={fc.name} className="list-group-item d-flex justify-content-between align-items-center">
                    {fc.name}
                    <span className="badge text-bg-secondary">{fc.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="col-12 col-md-6">
            <div className="fw-bold text-uppercase small text-muted mb-2">Waiting For Breakfast</div>
            {hungryNames.length === 0 ? (
              <div className="text-muted">No one is waiting. All fed for D{state.day}.</div>
            ) : (
              <ul className="list-group">
                {hungryNames.map((name, i) => (
                  <li key={i} className="list-group-item">{name}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}



