import React from 'react'
import { useStore } from '../core/store'
import { autoAssign } from '../core/quests'

export function Header() {
  const { state, actions, emit } = useStore() as any
  const week = Math.floor((state.day - 1) / 7) + 1
  return (
    <nav className="navbar navbar-dark bg-dark">
      <div className="container-fluid">
        <span className="navbar-brand">⚔️ Guild CEO Simulator</span>
        <div className="d-flex gap-3 align-items-center text-light small">
          <div>Money: {state.money}g</div>
          <div>Notoriety: {state.notoriety}</div>
          <div>Day {state.day} / Week {week}</div>
          <div className="vr" />
          <div className="form-check form-switch m-0">
            <input className="form-check-input" type="checkbox" id="autoAssignHeader" checked={state.settings.autoAssign} onChange={e => { state.settings.autoAssign = e.target.checked; if (state.settings.autoAssign) { autoAssign(state) } emit(); }} />
            <label className="form-check-label text-light" htmlFor="autoAssignHeader">Auto-assign</label>
          </div>
          <button className="btn btn-warning btn-sm" onClick={() => actions.nextDay()}>Next Day</button>
          <button className="btn btn-outline-light btn-sm" onClick={() => actions.save()}>Save</button>
          <button className="btn btn-outline-light btn-sm" onClick={() => actions.load()}>Load</button>
          <button className="btn btn-outline-danger btn-sm" onClick={() => actions.reset()}>Reset</button>
        </div>
      </div>
    </nav>
  )
}


