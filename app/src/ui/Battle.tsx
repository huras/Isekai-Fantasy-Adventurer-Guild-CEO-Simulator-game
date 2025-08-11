import React from 'react'
import { useStore } from '../core/store'

export function Battle() {
  const { state, actions } = useStore()
  const b = state.battle
  if (!b) {
    return (
      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Battle</h5>
          <div className="text-muted">No active battle.</div>
        </div>
      </div>
    )
  }
  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="card-title mb-0">{b.questName} — Wave {b.wave}/{b.wavesTotal}</h5>
          <div className="text-muted small">Diff {b.diff}</div>
        </div>
        <div className="row g-3">
          <div className="col-12 col-md-6">
            <div className="fw-bold mb-1">Allies</div>
            <div className="d-flex flex-wrap gap-2">
              {b.allies.map((a, i) => (
                <span key={a.id} className="badge text-bg-secondary">
                  {a.name} ❤️{a.hp}/{a.hpMax}
                </span>
              ))}
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="fw-bold mb-1">Enemies</div>
            <div className="d-flex flex-wrap gap-2">
              {b.enemies.map((e, i) => (
                <span key={e.id} className="badge text-bg-danger">
                  {e.name} ❤️{e.hp}/{e.hpMax}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-2">Turn: {b.turnSide === 'ally' ? 'Allies' : 'Enemies'}</div>
          <div className="d-flex gap-2">
            <button className="btn btn-sm btn-primary" onClick={() => actions.battleAttack()}>Attack</button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => actions.battleDefend()}>Defend</button>
            <button className="btn btn-sm btn-outline-info" onClick={() => actions.battleUseItem()}>Use Item</button>
          </div>
        </div>
        {b.log.length > 0 && (
          <div className="mt-3 small text-muted">
            {b.log.slice(0, 6).map((line, i) => (
              <div key={i}>• {line}</div>
            ))}
          </div>
        )}
        {state.isGameOver && (
          <div className="alert alert-danger mt-3">Game Over. Your party has fallen.</div>
        )}
      </div>
    </div>
  )
}


