import React, { useMemo, useState } from 'react'
import { useStore } from '../core/store'
import { AdventurerModal } from './AdventurerModal'
import { ProgressBar } from './ProgressBar'
import { getExperienceProgress, getExperienceForNextLevel, getExperienceCurveEmoji, getExperienceCurveDescription } from '../core/leveling'

export function Guild() {
  const { state } = useStore()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = useMemo(() => state.members.find(m => m.id === selectedId) || null, [state.members, selectedId])
  
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title mb-4">🏰 Guild Members</h5>
        {state.members.length === 0 ? (
          <div className="text-center text-muted py-5">
            <div className="fs-1 mb-3">👥</div>
            <div className="fs-5">No members yet.</div>
            <div className="small">Recruit adventurers to build your guild!</div>
          </div>
        ) : (
          <div className="row g-4">
            {state.members.map(m => (
              <div key={m.id} className="col-12 col-md-6 col-lg-4">
                <div 
                  className="card h-100 shadow-sm border-0 clickable guild-card" 
                  onClick={() => setSelectedId(m.id)}
                  style={{
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                    transition: 'all 0.2s ease-in-out',
                    cursor: 'pointer',
                    borderRadius: '16px',
                    border: '1px solid rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <div className="card-body p-3">
                    {/* Header with avatar and name */}
                    <div className="d-flex align-items-center gap-3 mb-3">
                      <div className="position-relative">
                        {m.avatar ? (
                          <img 
                            src={m.avatar} 
                            width={60} 
                            height={60} 
                            style={{ 
                              objectFit: 'cover', 
                              borderRadius: '50%',
                              border: '3px solid #fff',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                            }} 
                          />
                        ) : (
                          <div 
                            className="d-flex align-items-center justify-content-center"
                            style={{
                              width: 60,
                              height: 60,
                              borderRadius: '50%',
                              backgroundColor: '#6c757d',
                              color: 'white',
                              fontSize: '1.5rem',
                              fontWeight: 'bold'
                            }}
                          >
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {m.isPlayer && (
                          <span 
                            className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-primary"
                            style={{ fontSize: '0.7rem' }}
                          >
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="card-title mb-1 fw-bold text-dark">{m.name}</h6>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <div className="badge bg-secondary bg-opacity-75 text-white px-2 py-1">
                            {m.class}
                          </div>
                          <div className="badge bg-info bg-opacity-75 text-white px-2 py-1">
                            Lv.{m.level}
                          </div>
                        </div>
                        <div className="small text-muted d-flex align-items-center gap-1">
                          {getExperienceCurveEmoji(m.experienceCurve)} {m.experienceCurve}
                        </div>
                      </div>
                    </div>

                    {/* Experience Bar */}
                    <div className="mb-3">
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <span className="small text-muted">⭐</span>
                        <span className="small text-muted">EXP</span>
                        <span className="small text-muted ms-auto">
                          {m.experience}/{getExperienceForNextLevel(m)}
                        </span>
                      </div>
                      <div className="w-100">
                        <ProgressBar 
                          variant="hp" 
                          value={getExperienceProgress(m) * 100} 
                          max={100} 
                          width="100%" 
                          height={6} 
                        />
                      </div>
                    </div>

                    {/* Health and Mana Bars */}
                    <div className="mb-3">
                      {/* HP Bar */}
                      <div className="d-flex align-items-center gap-2 mb-2">
                        <span className="small text-muted" style={{ minWidth: '20px' }}>❤️</span>
                        <div className="flex-grow-1">
                          <ProgressBar 
                            variant="hp" 
                            value={m.hp || 0} 
                            max={m.hpMax || 1} 
                            width="100%" 
                            height={8} 
                          />
                        </div>
                        <span className="small text-danger fw-bold" style={{ minWidth: '35px', fontSize: '0.75rem' }}>
                          {m.hp}/{m.hpMax}
                        </span>
                      </div>
                      
                      {/* MP Bar */}
                      {typeof m.mpMax === 'number' && m.mpMax > 0 && (
                        <div className="d-flex align-items-center gap-2">
                          <span className="small text-muted" style={{ minWidth: '20px' }}>🔮</span>
                          <div className="flex-grow-1">
                            <ProgressBar 
                              variant="mp" 
                              value={m.mp || 0} 
                              max={m.mpMax || 1} 
                              width="100%" 
                              height={8} 
                            />
                          </div>
                          <span className="small text-info fw-bold" style={{ minWidth: '35px', fontSize: '0.75rem' }}>
                            {m.mp}/{m.mpMax}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Compact Combat Stats */}
                    <div className="mb-2">
                      <div className="d-flex flex-wrap gap-2">
                        <div className="px-2 py-1 border rounded-3 bg-light small" title="Strength">💪 STR {m.stats?.str ?? 0}</div>
                        <div className="px-2 py-1 border rounded-3 bg-light small" title="Magic">🔮 MAG {m.stats?.mag ?? 0}</div>
                        <div className="px-2 py-1 border rounded-3 bg-light small" title="Skill">🎯 SKL {m.stats?.skill ?? 0}</div>
                        <div className="px-2 py-1 border rounded-3 bg-light small" title="Speed">🏃 SPD {m.stats?.speed ?? 0}</div>
                        <div className="px-2 py-1 border rounded-3 bg-light small" title="Luck">🍀 LCK {m.stats?.luck ?? 0}</div>
                        <div className="px-2 py-1 border rounded-3 bg-light small" title="Defense">🛡️ DEF {m.stats?.defense ?? 0}</div>
                        <div className="px-2 py-1 border rounded-3 bg-light small" title="Resistance">✨ RES {m.stats?.resistance ?? 0}</div>
                      </div>
                      <div className="small text-muted mt-1">💰 Upkeep {m.upkeep}g/day</div>
                    </div>

                    {/* Footer */}
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="small text-muted">
                        🎯 {m.skills?.length || 0} skills
                      </div>
                      <div className="small text-muted">
                        {m.alive === false ? '💀 Fallen' : '✅ Active'}
                      </div>
                    </div>
                  </div>
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
          items: selected.items as any,
          level: selected.level,
          experience: selected.experience,
          experienceCurve: selected.experienceCurve,
        }} />
      )}
    </div>
  )
}




