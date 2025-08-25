import React, { useMemo, useState } from 'react'
import type { ActiveMission, Member } from '../core/types'
import { useStore } from '../core/store'
import { createBattleFromMission } from '../core/quests'
import { logEvent } from '../core/logs'

export function BattleAdmin() {
  const { state, emit } = useStore()
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [name, setName] = useState('Test Skirmish')
  const [diff, setDiff] = useState(5)
  const [waves, setWaves] = useState(1)

  const aliveMembers = useMemo(
    () => state.members.filter(m => m.alive !== false),
    [state.members]
  )

  function toggle(id: string) {
    setSelected(s => ({ ...s, [id]: !s[id] }))
  }

  function startBattle() {
    if (state.battle) return
    const party: Member[] = aliveMembers.filter(m => selected[m.id])
    if (party.length === 0) return
    const mission: ActiveMission = {
      id: `admin_${Math.random().toString(36).slice(2, 9)}`,
      name: name || 'Test Battle',
      diff: Math.max(1, Math.min(15, diff)),
      rank: undefined,
      reward: 0,
      fame: 0,
      type: 'Combat',
      tags: ['Admin'],
      emoji: '⚔️',
      job: 'Protect',
      target: 'Monster',
      dayStarted: state.day,
      endOnDay: state.day + 1,
      party: party.map(p => ({ ...p })),
      log: ['🧪 Admin-triggered mission created.'],
      battlesPlanned: Math.max(1, Math.min(5, waves)),
      battlesRemaining: Math.max(1, Math.min(5, waves)),
      battlesCleared: 0,
    }
    state.activeMissions = state.activeMissions || []
    state.activeMissions.unshift(mission)
    state.battle = createBattleFromMission(mission, 1, mission.battlesPlanned || 1)
    logEvent(state, `🧪 Admin: started test battle "${mission.name}" with ${party.length} ally(ies), diff ${mission.diff}, waves ${mission.battlesPlanned}`)
    emit()
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="card-title mb-0">Battle Trigger (admin)</h5>
          <span className="badge text-bg-secondary">Day {state.day}</span>
        </div>
        {state.battle && (
          <div className="alert alert-warning py-2">A battle is currently active. Finish it before starting a new one.</div>
        )}
        <div className="row g-3">
          <div className="col-12 col-md-5">
            <div className="fw-semibold mb-2">Party</div>
            <div className="d-flex flex-column gap-1" style={{ maxHeight: 260, overflowY: 'auto' }}>
              {aliveMembers.map(m => (
                <label key={m.id} className="d-flex align-items-center gap-2">
                  <input type="checkbox" checked={!!selected[m.id]} onChange={() => toggle(m.id)} />
                  {m.avatar && <img src={m.avatar} width={20} height={20} style={{ objectFit: 'cover', borderRadius: 4 }} />}
                  <span>{m.name} <span className="text-muted">({m.class})</span></span>
                </label>
              ))}
            </div>
          </div>
          <div className="col-12 col-md-7">
            <div className="row g-2">
              <div className="col-12">
                <label className="form-label small">Battle name</label>
                <input className="form-control" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="col-6">
                <label className="form-label small">Difficulty (1–15)</label>
                <input type="number" min={1} max={15} className="form-control" value={diff} onChange={e => setDiff(Number(e.target.value || 1))} />
              </div>
              <div className="col-6">
                <label className="form-label small">Waves (1–5)</label>
                <input type="number" min={1} max={5} className="form-control" value={waves} onChange={e => setWaves(Number(e.target.value || 1))} />
              </div>
              <div className="col-12 mt-2">
                <button className="btn btn-primary" disabled={!!state.battle} onClick={startBattle}>Start Test Battle</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}



