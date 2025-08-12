import React, { useMemo, useRef, useState } from 'react'
import { getSpriteStyle, getSpriteStyleFromUrl } from '../core/items'
import { ProgressBar } from './ProgressBar'
import type { InventoryItem, ShopItem, Stats } from '../core/types'
import { useStore } from '../core/store'
import { getExperienceProgress, getExperienceForNextLevel, getExperienceCurveEmoji, getExperienceCurveDescription, calculatePowerLevel } from '../core/leveling'
import { applyItemEffect } from '../core/effects'

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
            position: relative;
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
      .inventory-slot .custom-popover {
        position: absolute;
        right: 4px;
        bottom: 40px;
        background: #fff;
        border: 1px solid rgba(0,0,0,.175);
        border-radius: .5rem;
        box-shadow: 0 .5rem 1rem rgba(0,0,0,.15);
        z-index: 4;
        min-width: 140px;
      }
      .inventory-slot .custom-popover .popover-body { padding: 8px; }
      .inventory-slot.equipped {
        border-color: #000000 !important;
        box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.25);
      }
      .equipped-badge {
        position: absolute;
        bottom: 4px;
        left: 50%;
        transform: translateX(-50%) translateY(75%);
        background-color: #000000 !important;
        font-size: 0.65rem;
        z-index: 2;
        opacity: 0.75;
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
  const [actionIdx, setActionIdx] = useState<number | null>(null)
  const [unstackModal, setUnstackModal] = useState<{ slotIdx: number; max: number; amount: number } | null>(null)
  const [statsDetailed, setStatsDetailed] = useState<boolean>(false)
  const currentMpMax = (memberRef?.mpMax ?? (adventurer as any).mpMax) as number | undefined
  const currentMp = (memberRef?.mp ?? (adventurer as any).mp) as number | undefined
  const [guildFilter, setGuildFilter] = useState('')
  const [selectedGuildId, setSelectedGuildId] = useState<string | null>(null)

  const groupedGuildInventory = useMemo(() => {
    const map = new Map<string, { item: ShopItem; count: number }>()
    for (const it of state.inventory || []) {
      const bucket = map.get(it.id)
      if (!bucket) map.set(it.id, { item: it, count: 1 })
      else bucket.count += 1
    }
    let arr = Array.from(map.values())
    if (guildFilter.trim()) {
      const q = guildFilter.trim().toLowerCase()
      arr = arr.filter(v => v.item.name.toLowerCase().includes(q) || (v.item.desc || '').toLowerCase().includes(q))
    }
    arr.sort((a, b) => a.item.name.localeCompare(b.item.name))
    return arr
  }, [state.inventory, guildFilter])

  // Ensure the member inventory carries qty and instanceIds even before global loader normalization
  React.useEffect(() => {
    if (!memberRef) return
    const items = (memberRef.items = memberRef.items || []) as unknown as InventoryItem[]
    let changed = false
    for (let i = 0; i < items.length; i++) {
      const it = items[i] as any
      if (!it) continue
      const qty = Math.max(1, it.qty || 1)
      const ids: string[] = Array.isArray(it.instanceIds) ? [...it.instanceIds] : []
      if (ids.length < qty) {
        for (let k = ids.length; k < qty; k++) ids.push(`inst_${(crypto as any)?.randomUUID?.() || Math.random().toString(36).slice(2, 11)}`)
      }
      if (ids.length > qty) ids.length = qty
      if (it.qty !== qty || JSON.stringify(it.instanceIds || []) !== JSON.stringify(ids)) {
        items[i] = { id: it.id, qty, instanceIds: ids }
        changed = true
      }
    }
    if (changed) emit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberRef?.id])

  function isStackable(id: string): boolean {
    const cat = catalog.find(ci => ci.id === id)
    return !!(cat as any)?.stackable
  }

  function addToMember(id: string, count: number): number {
    if (!memberRef || count <= 0) return 0
    const items = (memberRef.items = memberRef.items || []) as unknown as InventoryItem[]
    while (items.length < 12) items.push(undefined as unknown as ShopItem)
    let added = 0
    const stackable = isStackable(id)
    if (stackable) {
      const existingIdx = items.findIndex(x => x && x.id === id)
      if (existingIdx !== -1) {
        const ex = items[existingIdx]!
        ex.qty = (ex.qty || 1) + count
        ex.instanceIds = ex.instanceIds || []
        for (let i = 0; i < count; i++) ex.instanceIds.push(`inst_${crypto.randomUUID?.() || Math.random().toString(36).slice(2,9)}`)
        return count
      }
    }
    // place into empty slots one by one
    for (let i = 0; i < 12 && added < count; i++) {
      if (!items[i]) {
        if (stackable) {
          items[i] = { id, qty: count, instanceIds: Array.from({ length: count }, () => `inst_${crypto.randomUUID?.() || Math.random().toString(36).slice(2,9)}`) }
          added = count
          break
        } else {
          items[i] = { id, qty: 1, instanceIds: [`inst_${crypto.randomUUID?.() || Math.random().toString(36).slice(2,9)}`] }
          added += 1
        }
      }
    }
    return added
  }

  function removeFromMember(slotIdx: number, units: number): number {
    if (!memberRef || units <= 0) return 0
    const items = (memberRef.items = memberRef.items || []) as unknown as InventoryItem[]
    const src = items[slotIdx]
    if (!src) return 0
    const available = src.qty || 1
    const taking = Math.min(available, units)
    const remaining = available - taking
    if (remaining <= 0) {
      // Remove whole stack
      const removedInst = (src.instanceIds || []).slice(0)
      items[slotIdx] = undefined as unknown as InventoryItem
      // Prune equipped instances that no longer exist
      if (memberRef.equippedInstanceIds && memberRef.equippedInstanceIds.length) {
        const allLeftInst = (memberRef.items || []).flatMap(s => (s as any)?.instanceIds || [])
        memberRef.equippedInstanceIds = memberRef.equippedInstanceIds.filter(eid => allLeftInst.includes(eid))
      }
    } else {
      src.qty = remaining
      src.instanceIds = (src.instanceIds || []).slice(0, remaining)
      // Prune equipped instances that were removed from this stack
      if (memberRef.equippedInstanceIds && memberRef.equippedInstanceIds.length) {
        const allLeftInst = (memberRef.items || []).flatMap(s => (s as any)?.instanceIds || [])
        memberRef.equippedInstanceIds = memberRef.equippedInstanceIds.filter(eid => allLeftInst.includes(eid))
      }
    }
    // trim trailing empties
    for (let i = items.length - 1; i >= 0; i--) {
      if (items[i]) { items.length = i + 1; break }
      if (i === 0) items.length = 0
    }
    return taking
  }

  function removeFromGuild(id: string, units: number): number {
    if (units <= 0) return 0
    let removed = 0
    const next: ShopItem[] = []
    for (let i = 0; i < state.inventory.length; i++) {
      const it = state.inventory[i]
      if (it.id === id && removed < units) {
        removed += 1
        continue
      }
      next.push(it)
    }
    if (removed > 0) state.inventory = next
    return removed
  }

  function addToGuild(id: string, units: number) {
    const base = catalog.find(ci => ci.id === id)
    if (!base) return 0
    const additions: ShopItem[] = []
    for (let i = 0; i < units; i++) additions.push({ ...base })
    state.inventory = [...state.inventory, ...additions]
    return units
  }

  function giveFromGuildToAdventurer(units: number) {
    if (!selectedGuildId || !memberRef) return
    // compute how many we can actually add
    const stackable = isStackable(selectedGuildId)
    let capacity = 0
    if (stackable) {
      // can always add to existing or single empty slot
      capacity = units
    } else {
      const items = (memberRef.items = memberRef.items || []) as unknown as InventoryItem[]
      while (items.length < 12) items.push(undefined as unknown as ShopItem)
      const empties = items.filter(x => !x).length
      capacity = Math.min(units, empties)
    }
    if (capacity <= 0) return
    const removed = removeFromGuild(selectedGuildId, capacity)
    if (removed <= 0) return
    const added = addToMember(selectedGuildId, removed)
    // if for some reason not all added, return remainder to guild
    if (added < removed) addToGuild(selectedGuildId, removed - added)
    emit()
  }

  function sendSelectedToGuild(units: number) {
    if (selectedIdx === null || !memberRef) return
    const items = (memberRef.items = memberRef.items || []) as unknown as InventoryItem[]
    const src = items[selectedIdx]
    if (!src) return
    const take = removeFromMember(selectedIdx, units)
    if (take > 0) {
      addToGuild(src.id, take)
      emit()
    }
  }

  function useItemAtSlot(slotIdx: number, target: 'self' | 'guildmaster' = 'self') {
    if (!memberRef) return
    const items = (memberRef.items = memberRef.items || []) as unknown as InventoryItem[]
    const src = items[slotIdx]
    if (!src) return
    const base = catalog.find(ci => ci.id === src.id)
    if (!base) return
    // Apply effect to the member for now (simple UX: use on self)
    applyItemEffect(base, { state, source: 'member', user: memberRef, target: memberRef, battle: null })
    // consume 1 unit
    const consumed = removeFromMember(slotIdx, 1)
    if (consumed > 0) emit()
  }

  function toggleEquipAtSlot(slotIdx: number) {
    if (!memberRef) return
    const items = (memberRef.items = memberRef.items || []) as unknown as InventoryItem[]
    const src = items[slotIdx]
    if (!src) return
    memberRef.equippedInstanceIds = memberRef.equippedInstanceIds || []
    // choose first instance id in the stack as the equip target
    const instId = (src.instanceIds && src.instanceIds[0]) || `inst_${src.id}_legacy`
    console.log('[Equip] toggleEquipAtSlot', {
      memberId: memberRef.id,
      slotIdx,
      itemId: src.id,
      stackQty: src.qty,
      stackInstanceIds: src.instanceIds,
      chosenInstanceId: instId,
      equippedBefore: [...(memberRef.equippedInstanceIds || [])],
    })
    const isEquipped = memberRef.equippedInstanceIds.includes(instId)
    if (isEquipped) {
      memberRef.equippedInstanceIds = memberRef.equippedInstanceIds.filter(x => x !== instId)
      console.log('[Equip] unequipped instance', instId, 'equippedAfter', memberRef.equippedInstanceIds)
    } else {
      // Simple rule: only equip items that have equip bonuses in catalog
      const base = catalog.find(ci => ci.id === src.id)
      const canEquip = !!(base as any)?.equip
      console.log('[Equip] base item', base, 'canEquip', canEquip, 'equipData', (base as any)?.equip)
      if (!canEquip) return
      memberRef.equippedInstanceIds.push(instId)
      console.log('[Equip] equipped instance', instId, 'equippedAfter', memberRef.equippedInstanceIds)
    }
    // Force UI update
    emit()
  }

  // Drag & drop handlers
  const dragFrom = useRef<number | null>(null)
  const dragFromGuild = useRef<{ id: string; count: number } | null>(null)
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
  function onDrop(e: React.DragEvent, idx: number) {
    if (!memberRef) return
    // If dragging from guild inventory into this slot
    if (dragFromGuild.current) {
      const { id, count } = dragFromGuild.current
      dragFromGuild.current = null
      // default move 1, Shift moves all available
      const unitsRequested = e.shiftKey ? count : 1
      const removed = removeFromGuild(id, unitsRequested)
      if (removed > 0) {
        const added = addToMemberAtSlot(id, removed, idx)
        if (added < removed) addToGuild(id, removed - added)
      }
      emit()
      return
    }
    // Else handle slot-to-slot move
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
        b.instanceIds = [...(b.instanceIds || []), ...((a.instanceIds || []))]
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

  function onGuildDragStart(id: string, count: number, e?: React.DragEvent) {
    dragFromGuild.current = { id, count }
    // Optional: light drag image using the target element
    const target = e?.currentTarget as HTMLElement | undefined
    if (target && (e as any).dataTransfer) {
      const rect = target.getBoundingClientRect()
      const ghost = target.cloneNode(true) as HTMLElement
      ghost.style.position = 'absolute'
      ghost.style.top = '-1000px'
      ghost.style.left = '-1000px'
      ghost.style.opacity = '0.8'
      document.body.appendChild(ghost)
      ;(e as any).dataTransfer.setDragImage(ghost, rect.width / 2, rect.height / 2)
      setTimeout(() => { if (document.body.contains(ghost)) document.body.removeChild(ghost) }, 100)
    }
  }

  function onDropToGuild(e: React.DragEvent) {
    e.preventDefault()
    // Only support dropping from a member slot
    const from = dragFrom.current
    dragFrom.current = null
    if (from === null || !memberRef) return
    const items = (memberRef.items = memberRef.items || []) as unknown as InventoryItem[]
    const src = items[from]
    if (!src) return
    const units = e.shiftKey ? (src.qty || 1) : 1
    const taken = removeFromMember(from, units)
    if (taken > 0) addToGuild(src.id, taken)
    emit()
  }

  function addToMemberAtSlot(id: string, count: number, targetIdx: number) {
    if (!memberRef || count <= 0) return 0
    const items = (memberRef.items = memberRef.items || []) as unknown as InventoryItem[]
    while (items.length < 12) items.push(undefined as unknown as ShopItem)
    const stackable = isStackable(id)
    const target = items[targetIdx]
    let remaining = count
    let added = 0
    if (!target) {
      if (stackable) {
        items[targetIdx] = { id, qty: remaining, instanceIds: Array.from({ length: remaining }, () => `inst_${crypto.randomUUID?.() || Math.random().toString(36).slice(2,9)}`) }
        added += remaining
        remaining = 0
      } else {
        items[targetIdx] = { id, qty: 1, instanceIds: [`inst_${crypto.randomUUID?.() || Math.random().toString(36).slice(2,9)}`] }
        added += 1
        remaining -= 1
        // place any remaining into next empty slots
        for (let i = 0; i < 12 && remaining > 0; i++) {
          if (!items[i]) { items[i] = { id, qty: 1, instanceIds: [`inst_${crypto.randomUUID?.() || Math.random().toString(36).slice(2,9)}`] }; remaining -= 1; added += 1 }
        }
      }
    } else if (target.id === id && stackable) {
      target.qty = (target.qty || 1) + remaining
      target.instanceIds = (target.instanceIds || [])
      for (let i = 0; i < remaining; i++) target.instanceIds.push(`inst_${crypto.randomUUID?.() || Math.random().toString(36).slice(2,9)}`)
      added += remaining
      remaining = 0
    } else {
      // If occupied by a different item, try to place in next empty slot
      for (let i = 0; i < 12 && remaining > 0; i++) {
        if (!items[i]) {
          if (stackable) { items[i] = { id, qty: remaining, instanceIds: Array.from({ length: remaining }, () => `inst_${crypto.randomUUID?.() || Math.random().toString(36).slice(2,9)}`) }; added += remaining; remaining = 0; break }
          items[i] = { id, qty: 1, instanceIds: [`inst_${crypto.randomUUID?.() || Math.random().toString(36).slice(2,9)}`] }; remaining -= 1; added += 1
        }
      }
    }
    return added
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
      const inst = (src.instanceIds || [])
      const movedInst = inst.slice(0, half)
      const remainInst = inst.slice(half)
      src.qty = (src.qty || 1) - half
      src.instanceIds = remainInst
      items[emptyIdx] = { id: src.id, qty: half, instanceIds: movedInst }
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
  // Compute power including equipped bonuses if available
  const power = (() => {
    const base = adventurer.stats
    if (!base) return null
    const equippedItemIds = (memberRef?.equippedInstanceIds || []).map(eid => {
      const inv = (memberRef?.items || []) as InventoryItem[]
      const it = inv.find(s => s && (s.instanceIds || []).includes(eid))
      return it?.id
    }).filter(Boolean) as string[]
    const bonuses = equippedItemIds.map(id => (catalog.find(ci => ci.id === id) as any)?.equip?.bonuses || []).flat()
    if ((window as any).DEV_LOG) {
      console.log('[Equip] recompute power', { equippedInstanceIds: memberRef?.equippedInstanceIds, equippedItemIds, bonuses })
    }
    const bonusMap: Record<string, number> = {}
    for (const b of bonuses) { bonusMap[b.stat] = (bonusMap[b.stat] || 0) + (b.delta || 0) }
    // Include activeBuffs
    const buffs = (memberRef?.activeBuffs || [])
    for (const b of buffs) { bonusMap[b.stat] = (bonusMap[b.stat] || 0) + (b.delta || 0) }
    const eff = {
      ...base,
      str: base.str + (bonusMap['str'] || 0),
      mag: base.mag + (bonusMap['mag'] || 0),
      skill: base.skill + (bonusMap['skill'] || 0),
      speed: base.speed + (bonusMap['speed'] || 0),
      luck: base.luck + (bonusMap['luck'] || 0),
      defense: base.defense + (bonusMap['defense'] || 0),
      resistance: base.resistance + (bonusMap['resistance'] || 0),
    }
    const spd = (adventurer as any).speed ?? eff.speed
    return computePower(eff, spd)
  })()
  return (
    <div
      className="modal fade show"
      style={{ display: 'block', background: 'rgba(0,0,0,.6)' }}
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {unstackModal && (
        <UnstackModal
          open={!!unstackModal}
          max={unstackModal.max}
          amount={unstackModal.amount}
          setAmount={(n) => setUnstackModal(prev => prev ? { ...prev, amount: Math.max(1, Math.min(prev.max, n)) } : prev)}
          onClose={() => setUnstackModal(null)}
          onConfirm={() => {
            if (!memberRef || !unstackModal) return
            const items = (memberRef.items = memberRef.items || []) as unknown as InventoryItem[]
            while (items.length < 12) items.push(undefined as unknown as ShopItem)
            const idx = unstackModal.slotIdx
            const src = items[idx] as any
            const move = Math.max(1, Math.min(unstackModal.amount, (src?.qty || 1) - 1))
            // find next empty slot
            let emptyIdx = -1
            for (let i = 1; i < 12; i++) { const j = (idx + i) % 12; if (!items[j]) { emptyIdx = j; break } }
            if (emptyIdx === -1 || move <= 0) { setUnstackModal(null); return }
            const movedInst = (src.instanceIds || []).splice(0, move)
            src.qty = (src.qty || 1) - move
            items[emptyIdx] = { id: src.id, qty: move, instanceIds: movedInst }
            emit()
            setUnstackModal(null)
          }}
        />
      )}
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
                  {/* Equipped Items (horizontal scroll) */}
                  {memberRef && Array.isArray(memberRef.equippedInstanceIds) && memberRef.equippedInstanceIds.length > 0 && (
                    <div className="mb-3">
                      <div className="small text-muted mb-1 d-flex align-items-center gap-2">
                        <span>Equipped</span>
                        <span className="badge text-bg-secondary">{memberRef.equippedInstanceIds.length}</span>
                      </div>
                      <div
                        className="d-flex gap-2 pe-1"
                        style={{ overflowX: 'auto', paddingBottom: 4 }}
                      >
                        {memberRef.equippedInstanceIds.map((eid, i) => {
                          const inv = (memberRef.items || []) as InventoryItem[]
                          const stack = inv.find(s => s && (s.instanceIds || []).includes(eid)) as any
                          const cat = stack ? catalog.find(ci => ci.id === stack.id) : null as any
                          if (!cat) return null
                          const iconStyle = (cat?.tilesetUrl ? getSpriteStyleFromUrl(cat.sprite, cat.tilesetUrl) : getSpriteStyle(cat.sprite))
                          return (
                            <div key={`${eid}_${i}`} className="d-inline-flex align-items-center gap-2 border rounded-3 bg-light px-2 py-1" style={{ whiteSpace: 'nowrap' }}>
                              <span style={{ ...iconStyle, width: 32, height: 32, display: 'inline-block' }} />
                              <span className="small fw-semibold text-truncate" style={{ maxWidth: 160 }}>{cat.name}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Stats Card */}
                  {adventurer.stats && (
                    <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
                      <div className="card-body">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <h6 className="card-title fw-bold mb-0 text-success">
                            <span className="me-2">📊</span>Combat Stats
                          </h6>
                          <button
                            className="btn btn-sm btn-outline-secondary"
                            onClick={() => setStatsDetailed(v => !v)}
                            title={statsDetailed ? 'Show compact chips' : 'Show detailed breakdown'}
                          >
                            {statsDetailed ? 'Compact' : 'Details'}
                          </button>
                        </div>
                        {(() => {
                          const base = adventurer.stats
                          // Helper: icon style for an item
                          const getIcon = (it: any) => (it?.tilesetUrl ? getSpriteStyleFromUrl(it.sprite, it.tilesetUrl) : getSpriteStyle(it?.sprite))
                          // Equipped contributions
                          const equippedItemIds = (memberRef?.equippedInstanceIds || []).map((eid: string) => {
                            const inv = (memberRef?.items || []) as InventoryItem[]
                            const it = inv.find(s => s && (s.instanceIds || []).includes(eid))
                            return it?.id
                          }).filter(Boolean) as string[]
                          const equipSources = equippedItemIds
                            .map(id => catalog.find(ci => ci.id === id))
                            .filter(Boolean) as any[]
                          // Buff contributions (from items when possible)
                          const buffSources = (memberRef?.activeBuffs || []).map(b => ({
                            stat: b.stat,
                            delta: b.delta,
                            item: b.sourceItemId ? catalog.find(ci => ci.id === b.sourceItemId) : null
                          }))
                          // Build per-stat breakdown
                          type StatKey = 'str'|'mag'|'skill'|'speed'|'luck'|'defense'|'resistance'
                          const order: { key: StatKey; label: string; icon: string; base: number }[] = [
                            { key: 'str', label: 'STR', icon: '💪', base: base.str },
                            { key: 'mag', label: 'MAG', icon: '🔮', base: base.mag },
                            { key: 'skill', label: 'SKL', icon: '🎯', base: base.skill },
                            { key: 'speed', label: 'SPD', icon: '🏃', base: (adventurer.speed ?? base.speed) },
                            { key: 'luck', label: 'LCK', icon: '🍀', base: base.luck },
                            { key: 'defense', label: 'DEF', icon: '🛡️', base: base.defense },
                            { key: 'resistance', label: 'RES', icon: '✨', base: base.resistance },
                          ]
                          const breakdown = order.map(s => {
                            const sources: { label: string; delta: number; iconStyle?: any }[] = []
                            // Equip bonuses from each equipped item
                            for (const it of equipSources) {
                              const bonuses = ((it as any).equip?.bonuses || []) as { stat: string; delta: number }[]
                              const matched = bonuses.filter(b => b.stat === s.key)
                              if (matched.length) {
                                const sum = matched.reduce((n, b) => n + (b.delta || 0), 0)
                                sources.push({ label: it.name, delta: sum, iconStyle: getIcon(it) })
                              }
                            }
                            // Buff bonuses
                            for (const b of buffSources) {
                              if (b.stat !== s.key) continue
                              sources.push({ label: b.item?.name || 'Buff', delta: b.delta, iconStyle: b.item ? getIcon(b.item) : undefined })
                            }
                            const total = s.base + sources.reduce((n, src) => n + src.delta, 0)
                            return { ...s, total, sources }
                          })

                          if (!statsDetailed) {
                            return (
                              <div className="d-flex flex-wrap gap-2">
                                {breakdown.map(s => (
                                  <div key={s.key} className="px-2 py-1 border rounded-3 bg-light small" title={s.label}>
                                    {s.icon} {s.label} {s.total}
                                  </div>
                                ))}
                              </div>
                            )
                          }

                          return (
                            <div className="vstack gap-1">
                              {breakdown.map(s => (
                                <div key={s.key} className="px-2 py-1 border rounded-3 bg-light small">
                                  <div>
                                    {s.icon} {s.label} {s.total}:
                                    <span className="ms-2">Base {s.base}</span>
                                    {s.sources.map((src, i) => (
                                      <span key={i} className="ms-2 d-inline-flex align-items-center gap-1">
                                        <span>+</span>
                                        {src.iconStyle && (
                                          <span style={{ ...src.iconStyle, width: 32, height: 32, display: 'inline-block',
                                            //  transform: "scale(0.5)"
                                          }} />
                                        )}
                                        <span>{src.delta}</span>
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })()}
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
                      {typeof currentMpMax === 'number' && currentMpMax > 0 && (
                        <div className="mb-3">
                          <div className="d-flex align-items-center gap-2 mb-2">
                            <span className="small text-muted" style={{ minWidth: '20px' }}>🔮</span>
                            <div className="flex-grow-1">
                              <ProgressBar 
                                variant="mp" 
                                value={currentMp || 0} 
                                max={currentMpMax || 1} 
                                width="100%" 
                                height={10} 
                              />
                            </div>
                            <span className="fw-bold text-info" style={{ minWidth: '45px', fontSize: '0.9rem' }}>
                              {currentMp || 0}/{currentMpMax}
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
                      {/* Transfer Toolbar with draggable Guild inventory */}
                      <div className="d-flex flex-column gap-2 mb-3">
                        <div className="d-flex gap-2 align-items-end">
                          <div className="flex-grow-1" style={{ minWidth: 220 }}>
                            <label className="form-label small mb-1">Guild inventory</label>
                            <input className="form-control form-control-sm" placeholder="Search items" value={guildFilter} onChange={e => setGuildFilter(e.target.value)} />
                          </div>
                          <div className="small text-muted">Tip: Drag items from here into the adventurer slots. Hold Shift to move all.</div>
                        </div>
                        <div className="d-flex flex-wrap gap-2 p-2 border rounded-3 bg-light" onDragOver={onDragOver} onDrop={onDropToGuild}>
                          {groupedGuildInventory.length === 0 ? (
                            <div className="small text-muted">No items</div>
                          ) : groupedGuildInventory.map(({ item, count }) => (
                            <div key={item.id} className="d-flex align-items-center gap-2 border rounded-3 bg-white px-2 py-1" draggable onDragStart={(e) => onGuildDragStart(item.id, count, e)} title={item.desc} style={{ cursor: 'grab' }}>
                              <div style={{ ...(item.tilesetUrl ? getSpriteStyleFromUrl(item.sprite, item.tilesetUrl) : getSpriteStyle(item.sprite)) }} />
                              <div className="small fw-semibold text-truncate" style={{ maxWidth: 140 }}>{item.name}</div>
                              <span className="badge text-bg-secondary">×{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="d-flex flex-wrap gap-3">
                        {Array.from({ length: 12 }).map((_, idx) => {
                          const ref = adventurer.items![idx] as unknown as InventoryItem | undefined
                          if (ref) {
                            const cat = catalog.find(ci => ci.id === ref.id)
                            const style = cat ? getSpriteStyleFromUrl(cat.sprite, (cat as any).tilesetUrl || '') : undefined
                            return (
                              <div
                                key={idx}
                                className={`inventory-slot border rounded-3 d-flex flex-column align-items-center p-2 position-relative ${selectedIdx === idx ? 'border-3 border-warning shadow' : 'border-2'} ${dragFrom.current === idx ? 'dragging' : ''} ${(memberRef && (memberRef.equippedInstanceIds || []).some(eid => (adventurer.items as any)[idx]?.instanceIds?.includes(eid))) ? 'equipped' : ''}`}
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
                                onDrop={(e) => onDrop(e, idx)}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setActionIdx(actionIdx === idx ? null : idx)
                                }}
                                data-item-slot={idx}
                              >
                                {(memberRef && (memberRef.equippedInstanceIds || []).some(eid => (adventurer.items as any)[idx]?.instanceIds?.includes(eid))) && (
                                  <span className="badge text-bg-success equipped-badge">Equipped</span>
                                )}
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
                                {/* Entire slot toggles the popover; extra trigger not required */}
                                {actionIdx === idx && (
                                  <div className="custom-popover">
                                    <div className="popover-body d-flex flex-column gap-2">
                                      <button className="btn btn-sm btn-outline-success" disabled={!((catalog.find(ci => ci.id === ref.id) as any)?.use)} onClick={(e) => { e.stopPropagation(); useItemAtSlot(idx); setActionIdx(null) }}>Use</button>
                                      <button className={`btn btn-sm ${((memberRef && (memberRef.equippedInstanceIds || []).some(eid => (ref.instanceIds || []).includes(eid)))) ? 'btn-warning' : 'btn-outline-secondary'}`} disabled={!((catalog.find(ci => ci.id === ref.id) as any)?.equip)} onClick={(e) => { e.stopPropagation(); toggleEquipAtSlot(idx); setActionIdx(null) }}>
                                        {((memberRef && (memberRef.equippedInstanceIds || []).some(eid => (ref.instanceIds || []).includes(eid)))) ? 'Unequip' : 'Equip'}
                                      </button>
                                      {((catalog.find(ci => ci.id === ref.id) as any)?.stackable) && (ref.qty || 1) > 1 && (
                                        <>
                                          {(ref.qty || 1) === 2 ? (
                                            <button className="btn btn-sm btn-outline-dark" onClick={(e) => {
                                              e.stopPropagation()
                                              const items = (memberRef!.items = memberRef!.items || []) as unknown as InventoryItem[]
                                              while (items.length < 12) items.push(undefined as unknown as ShopItem)
                                              let emptyIdx = -1
                                              for (let i = 1; i < 12; i++) { const j = (idx + i) % 12; if (!items[j]) { emptyIdx = j; break } }
                                              if (emptyIdx === -1) return
                                              const src = items[idx] as any
                                              const movedInst = (src.instanceIds || []).shift()
                                              src.qty = (src.qty || 1) - 1
                                              items[emptyIdx] = { id: src.id, qty: 1, instanceIds: [movedInst || `inst_${src.id}_legacy`] }
                                              emit()
                                              setActionIdx(null)
                                            }}>Unstack 1</button>
                                          ) : (
                                            <button className="btn btn-sm btn-outline-dark" onClick={(e) => {
                                              e.stopPropagation()
                                              setUnstackModal({ slotIdx: idx, max: Math.max(1, (ref.qty || 1) - 1), amount: 1 })
                                              setActionIdx(null)
                                            }}>Unstack…</button>
                                          )}
                                        </>
                                      )}
                                    </div>
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
                              onDrop={(e) => onDrop(e, idx)}
                              onClick={(e) => swapOrSelectSlot(idx, e)}
                              data-item-slot={idx}
                            >
                              <span className="small">+</span>
                            </div>
                          )
                        })}
                        {/* Selected slot action bar */}
                        {memberRef && selectedIdx !== null && (adventurer.items as any)?.[selectedIdx] && (
                          <div className="w-100 d-flex justify-content-end mt-2">
                            <div className="btn-group btn-group-sm" role="group" aria-label="Send to guild">
                              <button className="btn btn-outline-secondary" onClick={() => sendSelectedToGuild(1)}>Send 1 to Guild</button>
                              <button className="btn btn-secondary" onClick={() => {
                                const ref = (adventurer.items as any)[selectedIdx] as InventoryItem
                                const count = ref ? (ref.qty || 1) : 0
                                if (count > 0) sendSelectedToGuild(count)
                              }}>Send All</button>
                            </div>
                          </div>
                        )}
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


// Unstack Modal Component (inline)
export function UnstackModal({ open, onClose, onConfirm, max, amount, setAmount }: { open: boolean; onClose: () => void; onConfirm: () => void; max: number; amount: number; setAmount: (n: number) => void }) {
  if (!open) return null
  return (
    <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,.6)' }} role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header"><h5 className="modal-title">Unstack Items</h5><button type="button" className="btn-close" onClick={onClose} /></div>
          <div className="modal-body">
            <div className="mb-2">Select how many items to move to a new stack:</div>
            <input type="range" className="form-range" min={1} max={max} value={amount} onChange={e => setAmount(Number(e.target.value))} />
            <div className="text-center fw-bold">{amount}</div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={onConfirm}>Split</button>
          </div>
        </div>
      </div>
    </div>
  )
}
