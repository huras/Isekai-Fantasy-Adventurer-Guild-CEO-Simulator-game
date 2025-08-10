import React, { useMemo, useState } from 'react'
import { useStore } from '../core/store'
import { AdventurerModal } from './AdventurerModal'

export function Guild() {
  const { state } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(() => state.members.find(m => m.id === selectedId) || null, [state.members, selectedId])
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">Guild Members</h5>
        {state.members.length === 0 ? (
          <div className="text-muted">No members yet.</div>
        ) : (
          <div className="vstack gap-2">
            {state.members.map(m => (
              <div key={m.id} className="d-flex align-items-center gap-2 p-2 border rounded-3 clickable" onClick={() => setSelectedId(m.id)}>
                {m.avatar && <img src={m.avatar} width={40} height={40} style={{ objectFit: 'cover', borderRadius: 8 }} />}
                <div>
                  <div><strong>{m.name}</strong> — {m.class} {m.isPlayer && <span className="badge text-bg-info ms-1">You</span>}</div>
                  <div className="small text-muted">{m.appearance}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <AdventurerModal open={!!selected} onClose={() => setSelectedId(null)} adventurer={{
          id: selected.id,
          name: selected.name,
          class: selected.class,
          avatar: selected.avatar,
          appearance: selected.appearance,
          personality: selected.personality,
          gender: selected.gender,
          upkeep: selected.upkeep,
          stats: selected.stats,
          hp: selected.hp,
          hpMax: selected.hpMax,
          speed: selected.speed,
          skills: selected.skills,
        }} />
      )}
    </div>
  )
}


