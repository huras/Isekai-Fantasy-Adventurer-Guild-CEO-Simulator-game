import React, { useMemo, useRef, useState } from 'react'
import { getSpriteStyleFromUrl } from '../core/items'
import { ProgressBar } from './ProgressBar'
import type { InventoryItem, ShopItem, Stats } from '../core/types'
import { useStore } from '../core/store'
import { getExperienceProgress, getExperienceForNextLevel, getExperienceCurveEmoji, getExperienceCurveDescription, calculatePowerLevel } from '../core/leveling'

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
  items?: ShopItem[]
  weekAppeared?: number
  expiresOnWeek?: number
  level?: number
  experience?: number
  experienceCurve?: 'fast' | 'normal' | 'slow' | 'erratic'
}

function computePower(stats?: Stats, speed?: number): number | null {
  if (!stats) return null
  
  // Calculate power based on new stat system
  const attackPower = Math.max(stats.str, stats.mag) // Use higher of physical or magical attack
  const defensePower = Math.min(stats.defense, stats.resistance) // Use lower of physical or magical defense
  const utilityPower = stats.skill + stats.luck // Skill and luck contribute to overall effectiveness
  
  return attackPower + defensePower + Math.floor(utilityPower / 2) + Math.floor(speed ?? (stats.speed ? Math.max(1, Math.floor(stats.speed / 3)) : 1))
}

export function AdventurerModal({ open, onClose, adventurer }: { open: boolean; onClose: () => void; adventurer: AdventurerLike }) {
  if (!open) return null
  
  // Add CSS for dragging effects
  React.useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .dragging {
        cursor: grabbing !important;
        z-index: 1000;
      }
      .inventory-slot {
        transition: all 0.2s ease;
      }
      .inventory-slot:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      }
      .inventory-slot.dragging {
        transform: scale(0.95) rotate(2deg);
        opacity: 0.6;
        z-index: 1000;
      }
    `
    document.head.appendChild(style)
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }
  }, [])
  
  const { state, emit } = useStore()
  const memberRef = useMemo(() => state.members.find(m => m.id === adventurer.id) || null, [state.members, adventurer.id])
  const catalog = state.itemsCatalog
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  // Drag & drop handlers
  const dragFrom = useRef<number | null>(null)
  function onDragStart(idx: number) { 
    dragFrom.current = idx
    // Set the drag image to show only the item being dragged
    const dragElement = document.querySelector(`[data-item-slot="${idx}"]`) as HTMLElement
    if (dragElement) {
      const rect = dragElement.getBoundingClientRect()
      const dragImage = dragElement.cloneNode(true) as HTMLElement
      dragImage.style.position = 'absolute'
      dragImage.style.top = '-1000px'
      dragImage.style.left = '-1000px'
      dragImage.style.width = `${rect.width}px`
      dragImage.style.height = `${rect.height}px`
      dragImage.style.opacity = '0.8'
      dragImage.style.transform = 'rotate(5deg)'
      document.body.appendChild(dragImage)
      
      const event = window.event as DragEvent
      if (event && event.dataTransfer) {
        event.dataTransfer.setDragImage(dragImage, rect.width / 2, rect.height / 2)
      }
      
      // Remove the temporary drag image after a short delay
      setTimeout(() => {
        if (document.body.contains(dragImage)) {
          document.body.removeChild(dragImage)
        }
      }, 100)
    }
  }
  function onDragOver(e: React.DragEvent) { e.preventDefault() }
  function onDrop(idx: number) {
    if (!memberRef) return
    const from = dragFrom.current
    dragFrom.current = null
    if (from === null || from === idx) return
    const items = (memberRef.items = memberRef.items || []) as unknown as InventoryItem[]
    while (items.length < 12) items.push(undefined as unknown as ShopItem)
    const a = items[from]
    const b = items[idx]
    // Attempt stacking when same id and stackable in catalog
    if (a && b && a.id === b.id) {
      const cat = catalog.find(ci => ci.id === a.id)
      if ((cat as any)?.stackable) {
        b.qty = (b.qty || 1) + (a.qty || 1)
        items[from] = undefined as unknown as InventoryItem
      } else {
        // non-stackable, just swap
        items[from] = b
        items[idx] = a
      }
    } else if (a && !b) {
      // move to empty slot
      items[idx] = a
      items[from] = undefined as unknown as InventoryItem
    } else {
      // swap different items
      items[from] = b
      items[idx] = a
    }
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i]) { items.length = i + 1; break }
      if (i === 0) items.length = 0
    }
    emit()
  }

  function swapOrSelectSlot(targetIdx: number, e?: React.MouseEvent) {
    if (!memberRef) return
    // Shift-click to split stack
    if (e && (e as any).shiftKey) {
      const items = (memberRef.items = memberRef.items || []) as unknown as InventoryItem[]
      const src = items[targetIdx]
      if (!src || (src.qty || 1) <= 1) return
      // Normalize to 12 visible slots so conceptual empty slots exist beyond current length
      while (items.length < 12) items.push(undefined as unknown as InventoryItem)
      // Prefer the next free slot after the clicked one, wrapping around; skip the source slot
      let emptyIdx = -1
      for (let i = 1; i < 12; i++) {
        const idx = (targetIdx + i) % 12
        if (idx === targetIdx) continue
        if (!items[idx]) { emptyIdx = idx; break }
      }
      if (emptyIdx === -1) return
      const half = Math.floor((src.qty || 1) / 2)
      src.qty = (src.qty || 1) - half
      items[emptyIdx] = { id: src.id, qty: half }
      emit()
      return
    }
    const items = (memberRef.items = memberRef.items || []) as unknown as InventoryItem[]
    // normalize to 12 slots (sparse ok)
    while (items.length < 12) items.push(undefined as unknown as ShopItem)
    if (selectedIdx === null) {
      if (items[targetIdx]) setSelectedIdx(targetIdx)
      return
    }
    if (selectedIdx === targetIdx) { setSelectedIdx(null); return }
    const a = items[selectedIdx]
    const b = items[targetIdx]
    items[selectedIdx] = b
    items[targetIdx] = a
    // trim trailing empties
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i]) { items.length = i + 1; break }
      if (i === 0) items.length = 0
    }
    setSelectedIdx(null)
    emit()
  }
  const power = computePower(adventurer.stats, adventurer.speed)
  return (
    <div
      className="modal fade show"
      style={{ display: 'block', background: 'rgba(0,0,0,.6)' }}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="modal-dialog modal-xl modal-dialog-centered">
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px' }}>
          {/* Simple Header */}
          <div className="modal-header border-0 pb-0" style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            borderRadius: '16px 16px 0 0',
            padding: '1.5rem'
          }}>
            <div className="text-center">
              <h3 className="modal-title mb-2 fw-bold" style={{ fontSize: '1.8rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                {adventurer.name} — {adventurer.class}
              </h3>
              <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap mb-2">
                {adventurer.level && (
                  <span className="badge bg-warning bg-opacity-75 text-dark px-3 py-2" style={{ fontSize: '0.9rem', borderRadius: '20px' }}>
                    Lv.{adventurer.level}
                  </span>
                )}
                {power !== null && (
                  <span className="badge bg-success bg-opacity-75 text-white px-3 py-2" style={{ fontSize: '0.9rem', borderRadius: '20px' }}>
                    ⚔️ Power {power}
                  </span>
                )}
              </div>
            </div>
            
            <button 
              type="button" 
              className="btn-close btn-close-white position-absolute" 
              aria-label="Close" 
              onClick={onClose}
              style={{ 
                fontSize: '1.2rem',
                top: '1rem',
                right: '1rem'
              }}
            />
          </div>

          <div className="modal-body p-0">
            {/* Full-Width Portrait Section */}
            {null}
 
            <div className="p-4">
              <div className="row g-4">
                {/* Left Column - Character Info */}
                <div className="col-12 col-lg-5">
                  {/* Full Portrait Above Character Details */}
                  <div className="text-center mb-4">
                    {adventurer.avatar ? (
                      <div style={{ 
                        width: '100%',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                        margin: '0 auto'
                      }}>
                        <img
                          src={adventurer.avatar}
                          alt={adventurer.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ) : (
                      <div style={{ 
                        width: '100%',
                        maxWidth: '320px',
                        height: '200px',
                        borderRadius: '12px',
                        backgroundColor: '#e9ecef',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto',
                        fontSize: '4rem',
                        color: '#6c757d',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
                      }}>
                        👤
                      </div>
                    )}
                  </div>
                  {/* Character Details Card */}
                  <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                    <div className="card-body">
                      <h6 className="card-title fw-bold mb-3 text-primary">
                        <span className="me-2">👤</span>Character Details
                      </h6>
                      
                      {/* Basic Info */}
                      <div className="mb-3">
                        {adventurer.appearance && (
                          <div className="mb-3 p-3 bg-light rounded-3" style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>
                            <div className="small text-muted mb-1">Appearance</div>
                            {adventurer.appearance}
                          </div>
                        )}
                        
                        <div className="row g-2 mb-3">
                          {adventurer.gender && (
                            <div className="col-6">
                              <div className="small text-muted">Gender</div>
                              <div className="fw-bold text-capitalize">{adventurer.gender}</div>
                            </div>
                          )}
                          {typeof adventurer.upkeep === 'number' && (
                            <div className="col-6">
                              <div className="small text-muted">Daily Upkeep</div>
                              <div className="fw-bold text-warning">{adventurer.upkeep}g</div>
                            </div>
                          )}
                        </div>
                        
                        {adventurer.personality && (
                          <div className="mb-3">
                            <div className="small text-muted mb-1">Personality</div>
                            <div className="fw-bold text-info">{adventurer.personality}</div>
                          </div>
                        )}
                        
                        <div className="row g-2">
                          {typeof adventurer.weekAppeared === 'number' && (
                            <div className="col-6">
                              <div className="small text-muted">Appeared</div>
                              <div className="fw-bold">Week {adventurer.weekAppeared}</div>
                            </div>
                          )}
                          {typeof adventurer.expiresOnWeek === 'number' && (
                            <div className="col-6">
                              <div className="small text-muted">Expires</div>
                              <div className="fw-bold text-danger">Week {adventurer.expiresOnWeek}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column - Stats & Skills */}
                <div className="col-12 col-lg-7">
                  {/* Stats Card */}
                  {adventurer.stats && (
                    <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
                      <div className="card-body">
                        <h6 className="card-title fw-bold mb-3 text-success">
                          <span className="me-2">📊</span>Combat Stats
                        </h6>
                        <div className="d-flex flex-wrap gap-2">
                          <div className="px-2 py-1 border rounded-3 bg-light small" title="Strength">💪 STR {adventurer.stats.str}</div>
                          <div className="px-2 py-1 border rounded-3 bg-light small" title="Magic">🔮 MAG {adventurer.stats.mag}</div>
                          <div className="px-2 py-1 border rounded-3 bg-light small" title="Skill">🎯 SKL {adventurer.stats.skill}</div>
                          <div className="px-2 py-1 border rounded-3 bg-light small" title="Speed">🏃 SPD {adventurer.speed ?? adventurer.stats.speed}</div>
                          <div className="px-2 py-1 border rounded-3 bg-light small" title="Luck">🍀 LCK {adventurer.stats.luck}</div>
                          <div className="px-2 py-1 border rounded-3 bg-light small" title="Defense">🛡️ DEF {adventurer.stats.defense}</div>
                          <div className="px-2 py-1 border rounded-3 bg-light small" title="Resistance">✨ RES {adventurer.stats.resistance}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Health & Mana Card */}
                  <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
                    <div className="card-body">
                      <h6 className="card-title fw-bold mb-3 text-danger">
                        <span className="me-2">❤️</span>Vitality
                      </h6>
                      
                      {/* HP Bar */}
                      <div className="mb-3">
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <span className="small text-muted" style={{ minWidth: '20px' }}>❤️</span>
                          <div className="flex-grow-1">
                            <ProgressBar 
                              variant="hp" 
                              value={adventurer.hp || 0} 
                              max={adventurer.hpMax || 1} 
                              width="100%" 
                              height={10} 
                            />
                          </div>
                          <span className="fw-bold text-danger" style={{ minWidth: '45px', fontSize: '0.9rem' }}>
                            {adventurer.hp}/{adventurer.hpMax}
                          </span>
                        </div>
                      </div>
                      
                      {/* MP Bar */}
                      {typeof (adventurer as any).mpMax === 'number' && (adventurer as any).mpMax > 0 && (
                        <div className="mb-3">
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <span className="small text-muted" style={{ minWidth: '20px' }}>🔮</span>
                            <div className="flex-grow-1">
                              <ProgressBar 
                                variant="mp" 
                                value={(adventurer as any).mp || 0} 
                                max={(adventurer as any).mpMax || 1} 
                                width="100%" 
                                height={10} 
                              />
                            </div>
                            <span className="fw-bold text-info" style={{ minWidth: '45px', fontSize: '0.9rem' }}>
                              {(adventurer as any).mp}/{(adventurer as any).mpMax}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Level & Experience Card */}
                  {(adventurer.level || adventurer.experience || adventurer.experienceCurve) && (
                    <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
                      <div className="card-body">
                        <h6 className="card-title fw-bold mb-3 text-warning">
                          <span className="me-2">⭐</span>Level & Experience
                        </h6>
                        
                        <div className="row g-3 mb-3">
                          <div className="col-6">
                            <div className="text-center p-3 bg-light rounded-3">
                              <div className="h4 mb-1 text-primary">Lv.{adventurer.level || 1}</div>
                              <div className="small text-muted">Level</div>
                            </div>
                          </div>
                          <div className="col-6">
                            <div className="text-center p-3 bg-light rounded-3">
                              <div className="h4 mb-1 text-secondary d-flex align-items-center justify-content-center gap-1">
                                {adventurer.experienceCurve ? getExperienceCurveEmoji(adventurer.experienceCurve) : '❓'} 
                                {adventurer.experienceCurve || 'Unknown'}
                              </div>
                              <div className="small text-muted">Experience Curve</div>
                            </div>
                          </div>
                        </div>
                        
                        {adventurer.experience !== undefined && adventurer.experienceCurve && (
                          <div className="mb-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <span className="small text-muted">Experience Progress</span>
                              <span className="small fw-bold">
                                {adventurer.experience}/{getExperienceForNextLevel({ level: adventurer.level || 1, experience: adventurer.experience, experienceCurve: adventurer.experienceCurve } as any)}
                              </span>
                            </div>
                            <ProgressBar 
                              variant="hp" 
                              value={getExperienceProgress({ level: adventurer.level || 1, experience: adventurer.experience, experienceCurve: adventurer.experienceCurve } as any) * 100} 
                              max={100} 
                              width="100%" 
                              height={12} 
                            />
                          </div>
                        )}
                        
                        {adventurer.experienceCurve && (
                          <div className="p-3 bg-light rounded-3">
                            <div className="small text-muted">
                              <strong>Experience Curve:</strong> {getExperienceCurveDescription(adventurer.experienceCurve)}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Skills Card */}
                  {Array.isArray(adventurer.skills) && adventurer.skills.length > 0 && (
                    <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
                      <div className="card-body">
                        <h6 className="card-title fw-bold mb-3 text-info">
                          <span className="me-2">⚔️</span>Skills ({adventurer.skills.length})
                        </h6>
                        <div className="d-flex flex-wrap gap-2">
                          {adventurer.skills.map((s, i) => (
                            <span key={i} className="badge text-bg-info px-3 py-2" style={{ fontSize: '0.9rem' }}>{s}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Inventory Section - Full Width */}
              {Array.isArray(adventurer.items) && (
                <div className="mt-4">
                  <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                    <div className="card-body">
                      <h6 className="card-title fw-bold mb-3 text-success">
                        <span className="me-2">🎒</span>Inventory ({(adventurer.items.filter(Boolean) as InventoryItem[]).reduce((n, it) => n + (it.qty || 1), 0)}/12)
                      </h6>
                      {memberRef && (
                        <div className="alert alert-info small mb-3">
                          <strong>💡 Tips:</strong> Drag to move items. Drag onto same item to stack. Shift-click stack to split.
                        </div>
                      )}
                      <div className="d-flex flex-wrap gap-3">
                        {Array.from({ length: 12 }).map((_, idx) => {
                          const ref = adventurer.items![idx] as unknown as InventoryItem | undefined
                          if (ref) {
                            const cat = catalog.find(ci => ci.id === ref.id)
                            const style = cat ? getSpriteStyleFromUrl(cat.sprite, (cat as any).tilesetUrl || '') : undefined
                            return (
                              <div
                                key={idx}
                                className={`inventory-slot border rounded-3 d-flex flex-column align-items-center p-2 position-relative ${selectedIdx === idx ? 'border-3 border-warning shadow' : 'border-2'} ${dragFrom.current === idx ? 'dragging' : ''}`}
                                style={{ 
                                  width: 100, 
                                  cursor: memberRef ? 'grab' : 'default',
                                  transition: 'all 0.2s ease',
                                  backgroundColor: selectedIdx === idx ? '#fff3cd' : '#f8f9fa'
                                }}
                                title={cat?.name || ref.id}
                                draggable={!!memberRef}
                                onDragStart={() => onDragStart(idx)}
                                onDragOver={onDragOver}
                                onDrop={() => onDrop(idx)}
                                onClick={(e) => swapOrSelectSlot(idx, e)}
                                data-item-slot={idx}
                              >
                                <div style={style} className="mb-1" />
                                <div className="small text-truncate text-center fw-bold" style={{ fontSize: '0.75rem' }}>
                                  {cat?.name || ref.id}
                                </div>
                                {(ref.qty || 1) > 1 && (
                                  <div 
                                    className="badge bg-primary position-absolute" 
                                    style={{ 
                                      top: '4px', 
                                      right: '4px',
                                      fontSize: '0.7rem',
                                      minWidth: '20px',
                                      height: '20px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                  >
                                    {ref.qty}
                                  </div>
                                )}
                              </div>
                            )
                          }
                          return (
                            <div
                              key={idx}
                              className={`inventory-slot border-2 border-dashed rounded-3 d-flex align-items-center justify-content-center text-muted ${selectedIdx === idx ? 'border-warning bg-warning bg-opacity-10' : ''}`}
                              style={{ 
                                width: 100, 
                                height: 80, 
                                cursor: memberRef ? 'copy' : 'default',
                                transition: 'all 0.2s ease'
                              }}
                              title="Empty slot"
                              onDragOver={onDragOver}
                              onDrop={() => onDrop(idx)}
                              onClick={(e) => swapOrSelectSlot(idx, e)}
                              data-item-slot={idx}
                            >
                              <span className="small">+</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Footer */}
          <div className="modal-footer border-0 pt-0">
            <button 
              className="btn btn-primary px-4 py-2" 
              onClick={onClose}
              style={{ borderRadius: '8px', fontWeight: '600' }}
            >
              ✨ Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


