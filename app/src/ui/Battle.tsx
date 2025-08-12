import React, { useState } from 'react'
import { useStore } from '../core/store'
import { applyItemEffect } from '../core/effects'

export function Battle() {
  const { state, actions } = useStore()
  const b = state.battle
  const [selectedTarget, setSelectedTarget] = useState<{ side: 'ally' | 'enemy'; index: number } | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string>('')
  const [showBattleLog, setShowBattleLog] = useState(false)
  
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
                <button key={a.id} className={`badge ${selectedTarget?.side==='ally'&&selectedTarget.index===i?'text-bg-primary':'text-bg-secondary'}`} onClick={() => setSelectedTarget({ side: 'ally', index: i })}>
                  {a.name} ❤️{a.hp}/{a.hpMax}
                </button>
              ))}
            </div>
          </div>
          <div className="col-12 col-md-6">
            <div className="fw-bold mb-1">Enemies</div>
            <div className="d-flex flex-wrap gap-2">
              {b.enemies.map((e, i) => (
                <button key={e.id} className={`badge ${selectedTarget?.side==='enemy'&&selectedTarget.index===i?'text-bg-danger':'text-bg-secondary'}`} onClick={() => setSelectedTarget({ side: 'enemy', index: i })}>
                  {e.name} ❤️{e.hp}/{e.hpMax}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="mt-3">
          <div className="mb-2">Turn: {b.turnSide === 'ally' ? 'Allies' : 'Enemies'}</div>
          <div className="d-flex flex-wrap gap-2 align-items-end">
            <div className="d-flex gap-2 align-items-end">
              <div>
                <label className="form-label small mb-1">Guild Items</label>
                <select className="form-select form-select-sm" value={selectedItemId} onChange={e => setSelectedItemId(e.target.value)}>
                  <option value="">Select…</option>
                  {(() => {
                    // Only items carried by allies are usable in battle
                    const carriedIds: string[] = []
                    for (const ally of b.allies) {
                      const m = state.members.find(mm => mm.id === ally.id)
                      const inv = (m?.items || []).filter(Boolean) as { id: string; qty?: number }[]
                      for (const it of inv) {
                        const base = state.itemsCatalog.find(bi => bi.id === it.id)
                        const usable = base && (base as any).use
                        if (usable) carriedIds.push(it.id)
                      }
                    }
                    return carriedIds.map((id, i) => {
                      const base = state.itemsCatalog.find(bi => bi.id === id)
                      return base ? <option key={`${id}_${i}`} value={id}>{base.name}</option> : null
                    })
                  })()}
                </select>
              </div>
              <div>
                <label className="form-label small mb-1">Target</label>
                <div>
                  <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => setSelectedTarget({ side: 'ally', index: 0 })}>Ally</button>
                  <button className="btn btn-sm btn-outline-secondary me-1" onClick={() => setSelectedTarget({ side: 'enemy', index: 0 })}>Enemy</button>
                </div>
              </div>
              <button className="btn btn-sm btn-outline-info" disabled={!selectedItemId} onClick={() => {
                if (!selectedItemId) return
                const base = state.itemsCatalog.find(i => i.id === selectedItemId)
                if (!base) return
                // choose first ally who has this item as the user, and consume from that ally
                let userMember = null as any
                for (const ally of b.allies) {
                  const m = state.members.find(mm => mm.id === ally.id)
                  if (!m) continue
                  const inv = (m.items || []).filter(Boolean) as { id: string; qty?: number }[]
                  const slotIdx = inv.findIndex(i => i.id === selectedItemId)
                  if (slotIdx >= 0) { userMember = m; break }
                }
                if (!userMember) return
                const target = selectedTarget?.side === 'enemy' ? b.enemies[selectedTarget.index] : b.allies[selectedTarget?.index || 0]
                applyItemEffect(base, { state, source: 'member', user: userMember, target, battle: { allies: b.allies, enemies: b.enemies } })
                
                // Log item usage to event log
                const targetName = selectedTarget?.side === 'enemy' ? `enemy ${target.name}` : `ally ${target.name}`
                state.logs.events.unshift(`🧪 ${userMember.name} used ${base.name} on ${targetName}`)
                
                // consume 1 from that member
                const inv = (userMember.items || []).filter(Boolean) as { id: string; qty?: number }[]
                const slot = inv.find(i => i.id === selectedItemId)
                if (slot) {
                  slot.qty = Math.max(0, (slot.qty || 1) - 1)
                  if (slot.qty <= 0) {
                    userMember.items = (userMember.items || []).map((x: any) => x?.id === selectedItemId ? undefined as any : x)
                  } else {
                    userMember.items = (userMember.items || []).map((x: any) => x?.id === selectedItemId ? { id: selectedItemId, qty: slot.qty } : x)
                  }
                }
                ;(useStore() as any).emit?.()
              }}>Use</button>
            </div>
            <div className="d-flex gap-2 ms-auto">
              <button className="btn btn-sm btn-primary" onClick={() => actions.battleAttack()}>Attack</button>
              <button className="btn btn-sm btn-outline-secondary" onClick={() => actions.battleDefend()}>Defend</button>
            </div>
          </div>
        </div>
        {b.log.length > 0 && (
          <div className="mt-3">
            <div 
              className="text-primary text-decoration-underline" 
              style={{ cursor: 'pointer' }}
              onClick={() => setShowBattleLog(!showBattleLog)}
            >
              {showBattleLog ? '▼ Hide Battle Log' : `▶ Show Battle Log (${b.log.length} entries)`}
            </div>
            {showBattleLog && (
              <div className="mt-2 small text-muted border rounded p-2 bg-light">
                {b.log.map((line, i) => (
                  <div key={i}>• {line}</div>
                ))}
              </div>
            )}
          </div>
        )}
        {state.isGameOver && (
          <div className="alert alert-danger mt-3">Game Over. Your party has fallen.</div>
        )}
      </div>
    </div>
  )
}


