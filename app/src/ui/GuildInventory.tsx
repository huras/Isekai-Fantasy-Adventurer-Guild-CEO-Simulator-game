import React, { useMemo, useState, useEffect } from 'react'
import type { ItemCategoryId, ShopItem } from '../core/types'
import { useStore } from '../core/store'
import { applyItemEffect } from '../core/effects'
import { getSpriteStyle, getSpriteStyleFromUrl } from '../core/items'
import { getCategoryEmoji, getCategoryName, getCategories, loadItemCategories } from '../core/categories'

type SortKey = 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'category'

export function GuildInventory() {
  const { state } = useStore()
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<SortKey>('name_asc')
  const [groupStacks, setGroupStacks] = useState(true)
  const [categoriesLoaded, setCategoriesLoaded] = useState(false)
  const [catFilter, setCatFilter] = useState<Record<string, boolean>>({})

  // Load categories when component mounts
  useEffect(() => {
    async function loadCategories() {
      await loadItemCategories()
      const categories = getCategories()
      const initial: Record<string, boolean> = {}
      categories.forEach(cat => {
        initial[cat.id] = true
      })
      setCatFilter(initial)
      setCategoriesLoaded(true)
    }
    loadCategories()
  }, [])

  const items = state.inventory || []

  const filtered = useMemo(() => {
    if (!categoriesLoaded) return []
    
    const text = q.trim().toLowerCase()
    const raw = items.filter(it => catFilter[it.category])
      .filter(it => !text || it.name.toLowerCase().includes(text) || (it.desc || '').toLowerCase().includes(text))
    if (!groupStacks) return raw
    const map = new Map<string, { item: ShopItem; qty: number }>()
    for (const it of raw) {
      const bucket = map.get(it.id)
      if (!bucket) map.set(it.id, { item: it, qty: 1 })
      else bucket.qty += 1
    }
    return Array.from(map.values()).map(v => ({ ...v.item, price: v.item.price, _qty: v.qty } as ShopItem & { _qty: number }))
  }, [items, q, catFilter, groupStacks, categoriesLoaded])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    switch (sort) {
      case 'name_desc': arr.sort((a, b) => b.name.localeCompare(a.name)); break
      case 'price_asc': arr.sort((a, b) => (a.price || 0) - (b.price || 0)); break
      case 'price_desc': arr.sort((a, b) => (b.price || 0) - (a.price || 0)); break
      case 'category': arr.sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name)); break
      case 'name_asc':
      default:
        arr.sort((a, b) => a.name.localeCompare(b.name)); break
    }
    return arr
  }, [filtered, sort])

  const totalCount = items.length

  const availableCategories = getCategories().slice(0, 6) // Show first 6 categories in filter

  if (!categoriesLoaded) {
    return (
      <div className="card">
        <div className="card-body">
          <div className="text-center text-muted py-4">
            <div className="spinner-border spinner-border-sm me-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            Loading categories...
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="card-title mb-0">📦 Guild Inventory</h5>
          <span className="badge text-bg-secondary">Items: {totalCount}</span>
        </div>
        <div className="row g-2 align-items-end mb-3">
          <div className="col-12 col-md-4">
            <label className="form-label small">Search</label>
            <input className="form-control" placeholder="Name or description" value={q} onChange={e => setQ(e.target.value)} />
          </div>
          <div className="col-6 col-md-3">
            <label className="form-label small">Sort</label>
            <select className="form-select" value={sort} onChange={e => setSort(e.target.value as SortKey)}>
              <option value="name_asc">Name ↑</option>
              <option value="name_desc">Name ↓</option>
              <option value="price_asc">Price ↑</option>
              <option value="price_desc">Price ↓</option>
              <option value="category">Category</option>
            </select>
          </div>
          <div className="col-6 col-md-3">
            <div className="form-check mt-4">
              <input id="groupStacks" className="form-check-input" type="checkbox" checked={groupStacks} onChange={e => setGroupStacks(e.target.checked)} />
              <label htmlFor="groupStacks" className="form-check-label">Group identical items</label>
            </div>
          </div>
          <div className="col-12 col-md-12 mb-3">
            <div className="d-flex gap-3 mt-4">
              {availableCategories.map(category => (
                <div key={category.id} className="form-check d-flex align-items-center gap-1" title={category.name}>
                  <input 
                    id={`cat_${category.id}`} 
                    className="form-check-input" 
                    type="checkbox" 
                    checked={!!catFilter[category.id]} 
                    onChange={e => setCatFilter(prev => ({ ...prev, [category.id]: e.target.checked }))} 
                    aria-label={category.name} 
                  />
                  <label htmlFor={`cat_${category.id}`} className="form-check-label" aria-hidden="true">
                    <span style={{ fontSize: 18 }} role="img">{category.emoji}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="text-center text-muted py-4">
            {items.length === 0 ? (
              <div>
                <div className="fs-1 mb-2">📦</div>
                <div>No items in guild inventory.</div>
                <div className="small">Visit the Shop to purchase items!</div>
              </div>
            ) : (
              <div>
                <div className="fs-1 mb-2">🔍</div>
                <div>No items match your search/filter criteria.</div>
                <div className="small">Try adjusting your search or category filters.</div>
              </div>
            )}
          </div>
        ) : (
          <div className="d-flex flex-wrap gap-2">
            {sorted.map((it: any) => (
              <div key={`${it.id}_${it._qty ?? Math.random()}`} className="border rounded p-2 d-flex align-items-center gap-2" style={{ width: 360 }} title={it.desc}>
                <div style={{ ...(it.tilesetUrl ? getSpriteStyleFromUrl(it.sprite, it.tilesetUrl) : getSpriteStyle(it.sprite)) }} />
                <div className="flex-grow-1">
                  <div className="fw-semibold text-truncate">{it.name}</div>
                  <div className="small text-muted text-truncate">{getCategoryEmoji(it.category)} {getCategoryName(it.category)} • {it.price}g</div>
                </div>
                {groupStacks && typeof it._qty === 'number' && it._qty > 1 && (
                  <span className="badge text-bg-secondary" title="Stack quantity">×{it._qty}</span>
                )}
                <div className="btn-group btn-group-sm">
                  <button className="btn btn-outline-success" disabled={!((state.itemsCatalog.find(ci => ci.id === it.id) as any)?.use)} onClick={() => {
                    // Use on the Guildmaster by default
                    const gm = state.members.find(m => m.isPlayer)
                    applyItemEffect(it, { state, source: 'guild', user: gm || null, target: gm || null, battle: null })
                    // consume one from guild inventory
                    const idx = state.inventory.findIndex(g => g.id === it.id)
                    if (idx >= 0) { state.inventory = [...state.inventory.slice(0, idx), ...state.inventory.slice(idx + 1)] }
                    // emit via store
                    ;(useStore() as any).emit?.()
                  }}>Use</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


