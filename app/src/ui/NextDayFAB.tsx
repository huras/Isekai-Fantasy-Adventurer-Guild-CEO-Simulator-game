import React, { useEffect, useMemo, useState } from 'react'
import { useStore } from '../core/store'

export function NextDayFAB() {
  const { state, actions } = useStore()
  const inBattle = !!state.battle
  const disabled = inBattle || state.isGameOver
  const [confirmOpen, setConfirmOpen] = useState(false)
  const unassigned = useMemo(() => {
    const assignedIds = new Set<string>()
    for (const q of state.quests) {
      for (const m of q.assigned || []) assignedIds.add(m.id)
    }
    const onMissionIds = new Set<string>()
    for (const m of state.activeMissions || []) {
      for (const p of m.party || []) onMissionIds.add(p.id)
    }
    return state.members.filter(m => m.alive !== false && !assignedIds.has(m.id) && !onMissionIds.has(m.id))
  }, [state.members, state.quests, state.activeMissions])

  useEffect(() => {
    function onKeydown(e: KeyboardEvent) {
      if ((e.key === 'n' || e.key === 'N') && !disabled) {
        e.preventDefault()
        if (unassigned.length > 0) setConfirmOpen(true)
        else actions.nextDay()
      }
    }
    window.addEventListener('keydown', onKeydown)
    return () => window.removeEventListener('keydown', onKeydown)
  }, [disabled, actions, unassigned.length])

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        zIndex: 1050,
        pointerEvents: 'none',
      }}
    >
      <button
        className={`btn ${disabled ? 'btn-secondary' : 'btn-warning'} btn-lg shadow-lg rounded-pill`}
        style={{ pointerEvents: 'auto', paddingLeft: 20, paddingRight: 20 }}
        onClick={() => {
          if (disabled) return
          if (unassigned.length > 0) setConfirmOpen(true)
          else actions.nextDay()
        }}
        disabled={disabled}
        title={inBattle ? 'Resolve the battle to continue to the next day' : 'Advance to the next day (shortcut: N)'}
      >
        ⏭️ Next Day
      </button>
      {confirmOpen && (
        <div
          className="modal fade show"
          style={{ display: 'block', background: 'rgba(0,0,0,.4)' }}
          role="dialog"
          aria-modal="true"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setConfirmOpen(false) }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Proceed without assignments?</h5>
                <button type="button" className="btn-close" aria-label="Close" onClick={() => setConfirmOpen(false)} />
              </div>
              <div className="modal-body">
                <div className="mb-2">You have {unassigned.length} unassigned adventurer{unassigned.length !== 1 ? 's' : ''}. Passing the day may waste potential.</div>
                <div className="small text-muted">{unassigned.slice(0, 8).map(m => m.name).join(', ')}{unassigned.length > 8 ? '…' : ''}</div>
              </div>
              <div className="modal-footer">
                <a href="#quests" className="btn btn-outline-primary" onClick={() => setConfirmOpen(false)}>Review assignments</a>
                <button className="btn btn-secondary" onClick={() => setConfirmOpen(false)}>Cancel</button>
                <button className="btn btn-warning" onClick={() => { setConfirmOpen(false); actions.nextDay() }}>Proceed anyway</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


