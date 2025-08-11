import React, { useMemo, useState } from 'react'
import { useStore } from '../core/store'
import { assignMember, generateQuestList, runQuest, unassignMember } from '../core/quests'
import { AdventurerModal } from './AdventurerModal'

export function Quests() {
  const { state, emit } = useStore()
  const inBattle = !!state.battle
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedMember = useMemo(() => state.members.find(x => x.id === selectedId) || null, [state.members, selectedId])
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

  function refresh() {
    // Append more quests for the current day without resetting existing list
    const more = generateQuestList(state.notoriety, state.day)
    state.quests = [...state.quests, ...more]
    emit()
  }

  function assign(qid: string, mid: string) {
    assignMember(state, qid, mid)
    emit()
  }
  function unassign(qid: string, mid: string) {
    unassignMember(state, qid, mid)
    emit()
  }
  function run(qid: string) {
    runQuest(state, qid)
    emit()
  }

  function runAllAssigned() {
    // Snapshot quest ids first since runQuest mutates state.quests
    const toRun = state.quests.filter(q => (q.assigned || []).length > 0).map(q => q.id)
    if (toRun.length === 0) return
    for (const id of toRun) {
      runQuest(state, id)
    }
    emit()
  }

  return (
    <>
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="card-title mb-0">Available Quests</h5>
          <div className="d-flex gap-2">
             <button className="btn btn-sm btn-outline-success" onClick={runAllAssigned} disabled={inBattle || state.quests.every(q => (q.assigned || []).length === 0)}>Run all assigned</button>
             <button className="btn btn-sm btn-primary" onClick={refresh} disabled={inBattle}>Refresh</button>
          </div>
        </div>
        {unassigned.length > 0 && (
          <div className="mb-3">
            <div className="small text-muted mb-1">Available Adventurers ({unassigned.length})</div>
            <div className="d-flex flex-wrap gap-2">
              {unassigned.map(m => (
                <div
                  key={m.id}
                  className="d-flex align-items-center justify-content-center border"
                  style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer' }}
                  title={`${m.name} — ${m.class}`}
                  onClick={() => setSelectedId(m.id)}
                >
                  {m.avatar ? (
                    <img src={m.avatar} width={36} height={36} style={{ objectFit: 'cover' }} />
                  ) : (
                    <span className="small text-muted">
                      {m.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {state.quests.length === 0 ? (
          <div className="text-muted">No quests available. Click Refresh.</div>
        ) : (
          <div className="row g-2">
            {state.quests.map(q => (
              <div key={q.id} className="col-12 col-md-6 col-lg-4">
                <div className="p-2 border rounded-3 h-100 d-flex flex-column">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{q.name}</strong>
                    <span className="text-muted small ms-1">· {q.emoji || '🧭'} Rank {q.rank || 'H'} · Diff {q.diff} · Reward {q.reward}g · Fame +{q.fame}</span>
                    <span className="text-muted small ms-1">· Expires D{q.expiresOnDay}</span>
                    {(() => {
                      const total = Math.max(0, (q.expiresOnDay - q.day))
                      const denom = Math.max(0, total - 1) // full on the last available day
                      const elapsed = Math.max(0, (state.day - q.day))
                      const ratio = denom <= 0 ? 1 : Math.max(0, Math.min(1, elapsed / denom))
                      const pct = Math.round(ratio * 100)
                      const barClass = ratio > 0.66 ? 'bg-danger' : ratio > 0.33 ? 'bg-warning' : 'bg-success'
                      return (
                        <div className="progress mt-1" style={{ height: 6, width: 160 }}>
                          <div className={`progress-bar ${barClass}`} role="progressbar" style={{ width: `${pct}%` }} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} />
                        </div>
                      )
                    })()}
                    {q.daysRequired && <span className="text-muted small ms-1">· Trip {q.daysRequired}d</span>}
                    {q.desc && <div className="small text-muted">{q.desc}</div>}
                    {Array.isArray(q.tags) && q.tags.length > 0 && (
                      <span className="ms-2 small">{q.tags.slice(0, 3).map(t => `[#${t}]`).join(' ')}</span>
                    )}
                  </div>
                  <button className="btn btn-sm btn-outline-success" onClick={() => run(q.id)} disabled={inBattle}>Run</button>
                </div>
                <div className="mt-2 d-flex align-items-center flex-wrap gap-2">
                  {(q.assigned || []).map(m => (
                    <span
                      key={m.id}
                      className="assigned-adventurer-badge badge text-bg-secondary d-inline-flex align-items-center gap-1"
                      onClick={() => setSelectedId(m.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      {m.avatar && <img src={m.avatar} width={16} height={16} style={{ objectFit: 'cover', borderRadius: 3 }} />}
                      {m.name}
                      <a href="#" className="text-reset text-decoration-none ms-1" onClick={e => { e.preventDefault(); e.stopPropagation(); unassign(q.id, m.id) }}>×</a>
                    </span>
                  ))}
                  <div className="dropdown">
                    <button className="btn btn-sm btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown">Assign</button>
                    <ul className="dropdown-menu">
                      {state.members
                        .filter(m => {
                          const alreadyAssignedHere = (q.assigned || []).some(x => x.id === m.id)
                          const assignedElsewhere = state.quests.some(qq => qq.id !== q.id && (qq.assigned || []).some(x => x.id === m.id))
                          const onMission = (state.activeMissions || []).some(mm => (mm.party || []).some(x => x.id === m.id))
                          return !alreadyAssignedHere && !assignedElsewhere && !onMission
                        })
                        .map(m => (
                        <li key={m.id}>
                          <a className="dropdown-item d-flex align-items-center gap-2" href="#" onClick={e => { e.preventDefault(); assign(q.id, m.id) }}>
                            {m.avatar && <img src={m.avatar} width={20} height={20} style={{ objectFit: 'cover', borderRadius: 4 }} />}
                            {m.name} ({m.class})
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {Array.isArray(state.activeMissions) && state.activeMissions.length > 0 && (
          <div className="mt-3">
            <h6 className="mb-2">Active Missions</h6>
            <div className="vstack gap-2">
              {state.activeMissions.map(m => (
                <div key={m.id} className="p-2 border rounded-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{m.name}</strong>
                      <span className="text-muted small ms-1">· {m.emoji || '🧭'} Rank {m.rank || 'H'} · Diff {m.diff} · Ends D{m.endOnDay}</span>
                      <span className="text-muted small ms-1">· Party {m.party.length}</span>
                      <span className="text-muted small ms-1">
                        · {typeof m.battlesPlanned === 'number' && m.battlesPlanned > 0
                          ? `Combat ${m.battlesCleared || 0}/${m.battlesPlanned}`
                          : 'Combat none'}
                      </span>
                      {(state.battle && state.battle.missionId === m.id) && (
                        <span className="badge text-bg-warning ms-2">In battle</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 d-flex align-items-center flex-wrap gap-2">
                    {m.party.map(p => (
                      <span key={p.id} className={`badge ${p.alive === false ? 'text-bg-danger' : 'text-bg-secondary'} d-inline-flex align-items-center gap-1`} onClick={() => setSelectedId(p.id)} style={{ cursor: 'pointer' }}>
                        {p.avatar && <img src={p.avatar} width={16} height={16} style={{ objectFit: 'cover', borderRadius: 3 }} />}
                        {p.name} {p.alive === false ? '☠️' : `❤️${p.hp}/${p.hpMax}${typeof p.mp === 'number' ? ` 🔷${p.mp}/${p.mpMax}` : ''}`}
                      </span>
                    ))}
                  </div>
                  {m.log.length > 0 && (
                    <div className="mt-2 small text-muted">
                      {(m.log || []).slice(0, 3).map((line, idx) => (
                        <div key={idx}>• {line}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    <AdventurerModal
      open={!!selectedMember}
      onClose={() => setSelectedId(null)}
      adventurer={selectedMember || { id: '', name: '', class: '' }}
    />
    </>
  )
}


export default Quests
