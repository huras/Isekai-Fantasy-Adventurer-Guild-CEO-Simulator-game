import React from 'react'
import type { Stats } from '../core/types'

type AdventurerLike = {
  id: string
  name: string
  class: string
  avatar?: string | null
  appearance?: string
  personality?: string
  gender?: 'male' | 'female'
  upkeep?: number
  stats?: Stats
  hp?: number
  hpMax?: number
  speed?: number
  skills?: string[]
  weekAppeared?: number
  expiresOnWeek?: number
}

function computePower(stats?: Stats, speed?: number): number | null {
  if (!stats) return null
  const values = [stats.str, stats.int, stats.agi, stats.spr].sort((a, b) => b - a)
  const topTwo = (values[0] || 0) + (values[1] || 0)
  return topTwo + Math.floor(speed ?? (stats.agi ? Math.max(1, Math.floor(stats.agi / 3)) : 1))
}

export function AdventurerModal({ open, onClose, adventurer }: { open: boolean; onClose: () => void; adventurer: AdventurerLike }) {
  if (!open) return null
  const power = computePower(adventurer.stats, adventurer.speed)
  return (
    <div
      className="modal fade show"
      style={{ display: 'block', background: 'rgba(0,0,0,.5)' }}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-dialog modal-lg modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{adventurer.name} — {adventurer.class}</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
          </div>
          <div className="modal-body">
            <div className="row g-3">
              <div className="col-12 col-md-4 d-flex justify-content-center">
                {adventurer.avatar ? (
                  <div style={{ height: 480, borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)' }}>
                    <img
                      src={adventurer.avatar}
                      alt={adventurer.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                ) : (
                  <div className="text-muted">No portrait</div>
                )}
              </div>
              <div className="col-12 col-md-8">
                <div className="mb-2 text-muted small">
                  {adventurer.gender && <span className="me-2 text-uppercase">{adventurer.gender}</span>}
                  {typeof adventurer.upkeep === 'number' && <span className="me-2">Upkeep {adventurer.upkeep}g</span>}
                  {typeof adventurer.expiresOnWeek === 'number' && <span className="me-2">Expires W{adventurer.expiresOnWeek}</span>}
                  {typeof adventurer.weekAppeared === 'number' && <span className="me-2">Appeared W{adventurer.weekAppeared}</span>}
                </div>
                {adventurer.appearance && <div className="mb-2">{adventurer.appearance}</div>}
                {adventurer.personality && <div className="mb-2">Personality: {adventurer.personality}</div>}
                {adventurer.stats && (
                  <div className="mb-2">
                    <div className="fw-bold mb-1">Stats</div>
                    <div className="small text-muted">STR {adventurer.stats.str} · INT {adventurer.stats.int} · AGI {adventurer.stats.agi} · SPR {adventurer.stats.spr}</div>
                    <div className="small text-muted">
                      {typeof adventurer.hpMax === 'number' || typeof adventurer.hp === 'number' ? (
                        <span className="me-2">HP {adventurer.hp ?? adventurer.stats.hp ?? '-'}{typeof adventurer.hpMax === 'number' ? `/${adventurer.hpMax}` : ''}</span>
                      ) : null}
                      {typeof adventurer.speed === 'number' || typeof adventurer.stats.speed === 'number' ? (
                        <span className="me-2">Speed {adventurer.speed ?? adventurer.stats.speed}</span>
                      ) : null}
                      {power !== null && <span className="me-2">Power {power}</span>}
                    </div>
                  </div>
                )}
                {Array.isArray(adventurer.skills) && adventurer.skills.length > 0 && (
                  <div className="mb-2">
                    <div className="fw-bold mb-1">Skills</div>
                    <div className="d-flex flex-wrap gap-1">
                      {adventurer.skills.map((s, i) => (
                        <span key={i} className="badge text-bg-secondary">{s}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}


