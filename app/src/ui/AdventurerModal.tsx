import React, { useMemo, useRef, useState } from 'react'
import { getSpriteStyleFromUrl } from '../core/items'
import { ProgressBar } from './ProgressBar'
import type { InventoryItem, ShopItem, Stats } from '../core/types'
import { useStore } from '../core/store'

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
}

function computePower(stats?: Stats, speed?: number): number | null {
  if (!stats) return null
  const values = [stats.str, stats.int, stats.agi, stats.spr].sort((a, b) => b - a)
  const topTwo = (values[0] || 0) + (values[1] || 0)
  return topTwo + Math.floor(speed ?? (stats.agi ? Math.max(1, Math.floor(stats.agi / 3)) : 1))
}

export function AdventurerModal({ open, onClose, adventurer }: { open: boolean; onClose: () => void; adventurer: AdventurerLike }) {
  if (!open) return null
  const { state, emit } = useStore()
  const memberRef = useMemo(() => state.members.find(m => m.id === adventurer.id) || null, [state.members, adventurer.id])
  const catalog = state.itemsCatalog
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  // Drag & drop handlers
  const dragFrom = useRef<number | null>(null)
  function onDragStart(idx: number) { dragFrom.current = idx }
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
      const emptyIdx = items.findIndex(x => !x)
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
                  <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)' }}>
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
                        <span className="me-2 d-inline-flex align-items-center gap-1">
                          <ProgressBar variant="hp" value={(adventurer.hp ?? adventurer.stats.hp ?? 0) as number} max={(adventurer.hpMax as number) ?? ((adventurer.stats.hp as number) || 0)} width={120} height={8} />
                        </span>
                      ) : null}
                      {typeof (adventurer as any).mpMax === 'number' || typeof (adventurer as any).mp === 'number' ? (
                        <span className="me-2 d-inline-flex align-items-center gap-1">
                          <ProgressBar variant="mp" value={((adventurer as any).mp ?? 0) as number} max={((adventurer as any).mpMax ?? 0) as number} width={120} height={8} />
                        </span>
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
                {Array.isArray(adventurer.items) && (
                  <div className="mb-2">
                    <div className="fw-bold mb-1">Inventory ({(adventurer.items.filter(Boolean) as InventoryItem[]).reduce((n, it) => n + (it.qty || 1), 0)}/12)</div>
                    {memberRef && (
                      <div className="small text-muted mb-1">Drag to move. Drag onto same item to stack. Shift-click stack to split.</div>
                    )}
                    <div className="d-flex flex-wrap gap-2">
                      {Array.from({ length: 12 }).map((_, idx) => {
                        const ref = adventurer.items![idx] as unknown as InventoryItem | undefined
                        if (ref) {
                          const cat = catalog.find(ci => ci.id === ref.id)
                          const style = cat ? getSpriteStyleFromUrl(cat.sprite, (cat as any).tilesetUrl || '') : undefined
                          return (
                            <div
                              key={idx}
                              className={`border rounded d-flex flex-column align-items-center p-1 ${selectedIdx === idx ? 'border-2 border-warning' : ''}`}
                              style={{ width: 95, cursor: memberRef ? 'grab' : 'default' }}
                              title={cat?.name || ref.id}
                              draggable={!!memberRef}
                              onDragStart={() => onDragStart(idx)}
                              onDragOver={onDragOver}
                              onDrop={() => onDrop(idx)}
                              onClick={(e) => swapOrSelectSlot(idx, e)}
                            >
                              <div style={style} />
                              <div className="small text-truncate">{cat?.name || ref.id}{(ref.qty || 1) > 1 ? ` ×${ref.qty}` : ''}</div>
                            </div>
                          )
                        }
                        return (
                          <div
                            key={idx}
                            className={`border rounded d-flex align-items-center justify-content-center text-muted ${selectedIdx === idx ? 'border-2 border-warning' : ''}`}
                            style={{ width: 95, height: 75, cursor: memberRef ? 'copy' : 'default' }}
                            title="Empty slot"
                            onDragOver={onDragOver}
                            onDrop={() => onDrop(idx)}
                            onClick={(e) => swapOrSelectSlot(idx, e)}
                          >
                            –
                          </div>
                        )
                      })}
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


