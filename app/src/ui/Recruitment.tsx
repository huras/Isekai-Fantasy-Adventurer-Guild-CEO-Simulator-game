import React, { useEffect, useMemo, useState } from 'react'
import { useStore } from '../core/store'
import { generateCandidates } from '../core/recruitment'
import { loadPortraitManifest } from '../lib/portraits'
import { AdventurerModal } from './AdventurerModal'

export function Recruitment() {
  const { state, emit } = useStore()
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedCandidate = useMemo(() => state.candidates.find(x => x.id === selectedId) || null, [state.candidates, selectedId])

  useEffect(() => {
    (async () => { await loadPortraitManifest() })()
  }, [])

  async function refresh() {
    setLoading(true)
    const list = await generateCandidates(state.notoriety, state.week)
    state.candidates = list
    emit()
    setLoading(false)
  }

  function accept(id: string) {
    const idx = state.candidates.findIndex(c => c.id === id)
    if (idx === -1) return
    const c = state.candidates.splice(idx, 1)[0]
    const hpMax = c.stats.hp ?? 20
    const recruitBonus = state.modifiers.recruitStatBonus || 0
    const member = {
      id: `mem_${Math.random().toString(36).slice(2, 9)}`,
      name: c.name,
      class: c.class,
      personality: c.personality,
      gender: c.gender,
      appearance: c.appearance,
      avatar: c.avatar,
      upkeep: c.upkeep,
      stats: {
        str: c.stats.str + recruitBonus,
        int: c.stats.int + recruitBonus,
        agi: c.stats.agi + recruitBonus,
        spr: c.stats.spr + recruitBonus,
      },
      hpMax,
      hp: hpMax,
      speed: Math.max(1, Math.floor(((c.stats.agi ?? 3) + recruitBonus) / 3)),
      skills: c.skills || [],
    }
    state.members.push(member as any)
    emit()
  }

  function reject(id: string) {
    state.candidates = state.candidates.filter(c => c.id !== id)
    emit()
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="card-title mb-0">Weekly Candidates</h5>
          <button className="btn btn-sm btn-primary" onClick={refresh} disabled={loading}>{loading ? 'Loading…' : 'Refresh'}</button>
        </div>
        {state.candidates.length === 0 ? (
          <div className="text-muted">No candidates yet. Click Refresh.</div>
        ) : (
          <div className="vstack gap-2">
            {state.candidates.map(c => (
              <div key={c.id} className="d-flex justify-content-between align-items-center p-2 border rounded-3">
                <div className="d-flex align-items-center gap-2 clickable" onClick={() => setSelectedId(c.id)}>
                  {c.avatar && <img src={c.avatar} width={40} height={40} style={{ objectFit: 'cover', borderRadius: 8 }} />}
                  <div>
                    <div><strong>{c.name}</strong> — {c.class} · <span className="text-muted">{c.personality}</span></div>
                    <div className="small text-muted">{c.appearance}</div>
                    <div className="small text-muted">STR {c.stats.str} INT {c.stats.int} AGI {c.stats.agi} SPR {c.stats.spr} · Upkeep {c.upkeep}g</div>
                  </div>
                </div>
                <div className="btn-group">
                  <button className="btn btn-sm btn-outline-primary" onClick={() => accept(c.id)}>Accept</button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => reject(c.id)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <AdventurerModal open={!!selectedCandidate} onClose={() => setSelectedId(null)} adventurer={{
        id: selectedCandidate?.id || '',
        name: selectedCandidate?.name || '',
        class: selectedCandidate?.class || '',
        avatar: selectedCandidate?.avatar,
        appearance: selectedCandidate?.appearance,
        personality: selectedCandidate?.personality,
        gender: selectedCandidate?.gender,
        upkeep: selectedCandidate?.upkeep,
        stats: selectedCandidate?.stats,
        expiresOnWeek: selectedCandidate?.expiresOnWeek,
        weekAppeared: selectedCandidate?.weekAppeared,
      }} />
    </div>
  )
}


 
