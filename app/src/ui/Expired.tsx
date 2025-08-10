import React, { useMemo, useState } from 'react'
import { useStore } from '../core/store'
import { AdventurerModal } from './AdventurerModal'

export function Expired() {
  const { state } = useStore()
  const expiredQuests = state.archives.quests || []
  const expiredCandidates = state.archives.candidates || []
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(() => expiredCandidates.find(c => c.id === selectedId) || null, [expiredCandidates, selectedId])
  return (
    <div className="row g-3">
      <div className="col-12 col-lg-6">
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Expired Quests</h5>
            {expiredQuests.length === 0 ? (
              <div className="text-muted">None</div>
            ) : (
              <ul className="list-group">
                {expiredQuests.map(q => (
                  <li key={q.id} className="list-group-item d-flex justify-content-between">
                    <span>{q.name}</span>
                    <span className="text-muted small">Day {q.expiredOnDay}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <div className="col-12 col-lg-6">
        <div className="card">
          <div className="card-body">
            <h5 className="card-title">Expired Candidates</h5>
            {expiredCandidates.length === 0 ? (
              <div className="text-muted">None</div>
            ) : (
              <ul className="list-group">
                {expiredCandidates.map(c => (
                  <li key={c.id} className="list-group-item d-flex justify-content-between clickable" onClick={() => setSelectedId(c.id)}>
                    <span>{c.name} — {c.class}</span>
                    <span className="text-muted small">Week {c.expiredOnWeek}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <AdventurerModal open={!!selected} onClose={() => setSelectedId(null)} adventurer={{
        id: selected?.id || '',
        name: selected?.name || '',
        class: selected?.class || '',
        avatar: selected?.avatar,
        appearance: selected?.appearance,
        personality: selected?.personality,
        gender: selected?.gender,
        upkeep: selected?.upkeep,
        stats: selected?.stats,
        weekAppeared: selected?.weekAppeared,
        expiresOnWeek: selected?.expiredOnWeek,
      }} />
    </div>
  )
}


