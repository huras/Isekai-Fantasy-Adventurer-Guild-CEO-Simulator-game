import React, { useEffect, useMemo, useState } from 'react'
import { useStore } from '../core/store'
import { generateCandidates } from '../core/recruitment'
import { loadPortraitManifest } from '../lib/portraits'
import { AdventurerModal } from './AdventurerModal'

export function Recruitment() {
  const { state, emit, actions } = useStore() as any
  const [loading, setLoading] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selectedCandidate = useMemo(() => state.candidates.find((x: any) => x.id === selectedId) || null, [state.candidates, selectedId])

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
    actions.acceptCandidate?.(id)
    emit()
  }

  function reject(id: string) {
    state.candidates = state.candidates.filter((c: { id: string }) => c.id !== id)
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
            {state.candidates.map((c: { id: string; avatar?: string; name: string; class: string; personality: string; appearance: string; stats: any; upkeep: number; expiresOnWeek?: number; weekAppeared?: number }) => (
              <div key={c.id} className="d-flex justify-content-between align-items-center p-2 border rounded-3">
                <div className="d-flex align-items-center gap-2 clickable" onClick={() => setSelectedId(c.id)}>
                  {c.avatar && <img src={c.avatar} width={40} height={40} style={{ objectFit: 'cover', borderRadius: 8 }} />}
                  <div>
                    <div><strong>{c.name}</strong> — {c.class} · <span className="text-muted">{c.personality}</span></div>
                    <div className="small text-muted">{c.appearance}</div>
                    <div className="small text-muted">STR {c.stats.str} INT {c.stats.int} AGI {c.stats.agi} SPR {c.stats.spr} · Upkeep {c.upkeep}g</div>
                  </div>
                </div>
                <div className="d-flex flex-column align-items-end gap-2">
                  {typeof c.expiresOnWeek === 'number' && (
                    <div className="d-flex flex-column align-items-end" style={{ minWidth: 200 }}>
                      {(() => {
                        const appeared = c.weekAppeared ?? state.week
                        const total = Math.max(0, c.expiresOnWeek - appeared)
                        const denom = Math.max(0, total - 1)
                        const elapsed = Math.max(0, state.week - appeared)
                        const ratio = denom <= 0 ? 1 : Math.max(0, Math.min(1, elapsed / denom))
                        const pctRaw = Math.round(ratio * 100)
                        const pct = pctRaw > 0 && pctRaw < 8 ? 8 : pctRaw
                        const left = Math.max(0, (c.expiresOnWeek - state.week))
                        const barClass = ratio > 0.66 ? 'bg-danger' : ratio > 0.33 ? 'bg-warning' : 'bg-success'
                        return (
                          <>
                            <div className="small text-muted">Expires W{c.expiresOnWeek} · {left}w left</div>
                            <div className="progress" style={{ height: 6, width: 160 }}>
                              <div className={`progress-bar ${barClass}`} role="progressbar" style={{ width: `${pct}%` }} aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} />
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  )}
                  <div className="btn-group">
                  <button className="btn btn-sm btn-outline-primary" onClick={() => accept(c.id)}>Accept</button>
                  <button className="btn btn-sm btn-outline-secondary" onClick={() => reject(c.id)}>Reject</button>
                  </div>
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
        skills: selectedCandidate?.skills,
        items: (selectedCandidate?.starterItems as any) || [],
        expiresOnWeek: selectedCandidate?.expiresOnWeek,
        weekAppeared: selectedCandidate?.weekAppeared,
      }} />
    </div>
  )
}


 
