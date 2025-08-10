import React from 'react'
import { useStore } from '../core/store'
import { assignMember, generateQuestList, runQuest, unassignMember } from '../core/quests'

export function Quests() {
  const { state, emit } = useStore()

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

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="card-title mb-0">Available Quests</h5>
          <button className="btn btn-sm btn-primary" onClick={refresh}>Refresh</button>
        </div>
        {state.quests.length === 0 ? (
          <div className="text-muted">No quests available. Click Refresh.</div>
        ) : (
          <div className="vstack gap-2">
            {state.quests.map(q => (
              <div key={q.id} className="p-2 border rounded-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{q.name}</strong>
                    <span className="text-muted small ms-1">· Diff {q.diff} · Reward {q.reward}g · Fame +{q.fame}</span>
                    <span className="text-muted small ms-1">· Expires D{q.expiresOnDay}</span>
                  </div>
                  <button className="btn btn-sm btn-outline-success" onClick={() => run(q.id)}>Run</button>
                </div>
                <div className="mt-2 d-flex align-items-center flex-wrap gap-2">
                  {(q.assigned || []).map(m => (
                    <span key={m.id} className="badge text-bg-secondary d-inline-flex align-items-center gap-1">
                      {m.avatar && <img src={m.avatar} width={16} height={16} style={{ objectFit: 'cover', borderRadius: 3 }} />}
                      {m.name}
                      <a href="#" className="text-reset text-decoration-none ms-1" onClick={e => { e.preventDefault(); unassign(q.id, m.id) }}>×</a>
                    </span>
                  ))}
                  <div className="dropdown">
                    <button className="btn btn-sm btn-outline-primary dropdown-toggle" data-bs-toggle="dropdown">Assign</button>
                    <ul className="dropdown-menu">
                      {state.members.filter(m => !(q.assigned || []).some(x => x.id === m.id)).map(m => (
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
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


export default Quests
