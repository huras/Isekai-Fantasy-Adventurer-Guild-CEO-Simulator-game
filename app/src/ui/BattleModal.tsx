import React from 'react'
import { useStore } from '../core/store'
import { Battle } from './Battle'

export function BattleModal() {
  const { state } = useStore()
  const inBattle = !!state.battle
  if (!inBattle) return null
  return (
    <div
      className="modal fade show"
      style={{ display: 'block', position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1060 }}
      role="dialog"
      aria-modal="true"
      aria-label="Battle in progress"
    >
      <div className="modal-dialog modal-xl modal-dialog-centered" role="document">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 16 }}>
          <div
            className="modal-header border-0 pb-0"
            style={{
              background: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)',
              color: 'white',
              borderRadius: '16px 16px 0 0',
              padding: '1rem 1.25rem',
            }}
          >
            <h5 className="modal-title">⚔️ Battle</h5>
            {/* Unclosable: no close button */}
          </div>
          <div className="modal-body" style={{ padding: '1rem' }}>
            <Battle />
          </div>
        </div>
      </div>
    </div>
  )
}





