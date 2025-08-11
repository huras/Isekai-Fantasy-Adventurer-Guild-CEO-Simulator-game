import React, { useMemo, useRef, useState } from 'react'
import type { ItemCategory, ShopItem, TilesetJSON } from '../core/types'
import { useStore } from '../core/store'
import { getSpriteStyle, getSpriteStyleFromUrl } from '../core/items'

type DraftItem = {
  id: string
  name: string
  desc?: string
  price: number
  category: ItemCategory
  sprite: { row: number; col: number }
  tilesetUrl: string
  sellable: boolean
}

export function Items() {
  const { state, emit } = useStore()
  const [tilesets, setTilesets] = useState<TilesetJSON[]>([])
  const [selectedTilesetIdx, setSelectedTilesetIdx] = useState<number | null>(null)
  const [selectedSpriteIdx, setSelectedSpriteIdx] = useState<number | null>(null)
  const importRef = useRef<HTMLInputElement | null>(null)
  const [draft, setDraft] = useState<DraftItem>(() => ({
    id: 'item_1', name: 'New Item', price: 10, category: 'food', sprite: { row: 0, col: 0 }, tilesetUrl: '', sellable: true
  }))
  const [editingId, setEditingId] = useState<string | null>(null)

  const selectedTileset = useMemo(() => selectedTilesetIdx==null ? null : tilesets[selectedTilesetIdx] || null, [tilesets, selectedTilesetIdx])
  const isLoaded = (state as any).itemsLoaded ?? true

  function handleImportTileset(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result)) as TilesetJSON
        setTilesets(prev => [...prev, json])
        if (selectedTilesetIdx == null) setSelectedTilesetIdx(0)
      } catch {
        alert('Invalid tileset JSON')
      }
    }
    reader.readAsText(file)
  }

  function pickSprite(idx: number) {
    if (!selectedTileset) return
    const s = selectedTileset.sprites[idx]
    setSelectedSpriteIdx(idx)
    setDraft(d => ({
      ...d,
      id: String(Date.now()),
      sprite: { row: s.row, col: s.col },
      tilesetUrl: selectedTileset.imagePath,
    }))
  }

  function addToGame() {
    const item: ShopItem = {
      id: draft.id,
      name: draft.name,
      desc: draft.desc,
      price: draft.price,
      category: draft.category,
      sprite: draft.sprite,
      tilesetUrl: draft.tilesetUrl,
      sellable: draft.sellable,
      apply() { /* effect no-op for now */ },
    }
    // Add into global catalog; and derive shop entry if sellable
    state.itemsCatalog.push(item)
    if (item.sellable) state.shop.push(item)
    state.logs.events.unshift(`Item created: ${item.name}${item.sellable ? ' (sellable)' : ''}`)
    emit()
  }

  function updateItem() {
    if (!editingId) return
    const idx = state.itemsCatalog.findIndex(it => it.id === editingId)
    if (idx === -1) return
    const updated: ShopItem = {
      id: draft.id,
      name: draft.name,
      desc: draft.desc,
      price: draft.price,
      category: draft.category,
      sprite: draft.sprite,
      tilesetUrl: draft.tilesetUrl,
      sellable: draft.sellable,
      apply: state.itemsCatalog[idx].apply || (() => {}),
    }
    state.itemsCatalog[idx] = updated
    // Keep shop in sync
    state.shop = state.itemsCatalog.filter(i => (i as any).sellable)
    state.logs.events.unshift(`Item updated: ${updated.name}`)
    setEditingId(null)
    emit()
  }

  function startEditing(it: ShopItem) {
    setDraft({
      id: it.id,
      name: it.name,
      desc: it.desc,
      price: it.price,
      category: it.category,
      sprite: it.sprite,
      tilesetUrl: it.tilesetUrl || '',
      sellable: !!(it as any).sellable,
    })
    setEditingId(it.id)
    setSelectedSpriteIdx(null)
    // Try to auto-load tileset JSON that matches this item's tilesetUrl (replace .png -> .json)
    if (it.tilesetUrl) {
      const jsonUrl = it.tilesetUrl.replace(/\.png$/i, '.json')
      // Skip if already loaded for this imagePath
      const existingIdx = tilesets.findIndex(t => t.imagePath === it.tilesetUrl)
      if (existingIdx >= 0) {
        setSelectedTilesetIdx(existingIdx)
        // Also attempt to select the exact sprite by row/col
        const sIdx = tilesets[existingIdx]?.sprites.findIndex(s => s.row === it.sprite.row && s.col === it.sprite.col) ?? -1
        if (sIdx >= 0) setSelectedSpriteIdx(sIdx)
      } else {
        // Fetch and add tileset
        ;(async () => {
          try {
            const res = await fetch(jsonUrl, { cache: 'no-cache' })
            if (!res.ok) return
            const ts = (await res.json()) as TilesetJSON
            // Only add if imagePath matches the item's tilesetUrl
            if (ts.imagePath && ts.imagePath !== it.tilesetUrl) {
              // Fallback: set imagePath to item's tilesetUrl so preview works
              (ts as any).imagePath = it.tilesetUrl
            }
            setTilesets(prev => {
              const next = [...prev, ts]
              // Select just-added tileset and its sprite
              const newIdx = next.length - 1
              setSelectedTilesetIdx(newIdx)
              const spriteIdx = ts.sprites.findIndex(s => s.row === it.sprite.row && s.col === it.sprite.col)
              if (spriteIdx >= 0) setSelectedSpriteIdx(spriteIdx)
              return next
            })
          } catch {
            // ignore on failure
          }
        })()
      }
    }
  }

  function exportItems() {
    const items = [...state.itemsCatalog]
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `items.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function importItemsFromFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const list = JSON.parse(String(reader.result)) as ShopItem[]
        for (const it of list) {
          // ensure apply exists
          if (typeof (it as any).apply !== 'function') {
            ;(it as ShopItem).apply = () => { /* no-op */ }
          }
        }
        state.itemsCatalog.push(...list)
        // Derive shop
        state.shop = state.itemsCatalog.filter(i => (i as any).sellable)
        state.logs.events.unshift(`Imported ${list.length} items into catalog`)
        emit()
      } catch {
        alert('Invalid items JSON')
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between">
          <h5 className="card-title m-0">Item Creator</h5>
          <div className="d-flex align-items-center gap-3">
            <span className={`badge ${isLoaded ? 'text-bg-secondary' : 'text-bg-warning'}`} title="Items are auto-loaded from public/items/items.json on page load">
              {isLoaded ? `Catalog: ${state.itemsCatalog.length}` : 'Loading items...'}
            </span>
            <input ref={importRef} type="file" className="d-none" accept="application/json" onChange={importItemsFromFile} />
            <button className="btn btn-sm btn-outline-secondary" onClick={() => importRef.current?.click()}>Import Items JSON</button>
            <button className="btn btn-sm btn-outline-secondary" onClick={exportItems}>Export Items JSON</button>
          </div>
        </div>

        {!isLoaded && (
          <div className="alert alert-info mt-3 mb-0 py-2 small">
            Auto-loading items from <code>/items/items.json</code>...
          </div>
        )}

        <div className="row mt-3">
          <div className="col-5">
            <div className="mb-2 d-flex align-items-center justify-content-between">
              <div className="fw-semibold">Tilesets</div>
              <div>
                <input type="file" accept="application/json" className="d-none" id="tilesetImport" onChange={handleImportTileset} />
                <label className="btn btn-sm btn-primary" htmlFor="tilesetImport">Import Tileset JSON</label>
              </div>
            </div>
            <div className="list-group" style={{ maxHeight: 120, overflowY: 'auto' }}>
              {tilesets.map((t, i) => (
                <button key={t.imagePath + i} className={`list-group-item list-group-item-action ${selectedTilesetIdx===i ? 'active' : ''}`} onClick={() => setSelectedTilesetIdx(i)}>
                  <div className="d-flex justify-content-between">
                    <span className="text-truncate" style={{ maxWidth: 160 }}>{t.tileset}</span>
                    <span className="badge text-bg-secondary">{t.grid.cols}×{t.grid.rows}</span>
                  </div>
                </button>
              ))}
              {tilesets.length === 0 && (<div className="text-muted small p-2">Import a tileset JSON to begin</div>)}
            </div>

            <div className="mt-3">
              <div className="fw-semibold">Pick Sprite</div>
              {!selectedTileset && <div className="text-muted small">No tileset selected</div>}
              {selectedTileset && (
                <div className="border rounded p-2" style={{ maxHeight: 300, overflow: 'auto' }}>
                  <div className="d-flex flex-wrap gap-2">
                    {selectedTileset.sprites.map((s, idx) => (
                      <button key={s.id} className={`btn btn-sm ${idx===selectedSpriteIdx ? 'btn-primary' : 'btn-light border'}`} onClick={() => pickSprite(idx)} style={{ padding: 2 }} title={`${s.id} r${s.row} c${s.col}`}>
                        <div style={{
                          width: s.width,
                          height: s.height,
                          backgroundImage: s.backgroundImage,
                          backgroundPosition: s.backgroundPosition,
                          backgroundRepeat: s.backgroundRepeat,
                          imageRendering: s.imageRendering,
                        }} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="col-7">
            <div className="fw-semibold mb-2">Item Details</div>
            <div className="row g-2">
              <div className="col-6">
                <label className="form-label small">ID</label>
                <input className="form-control" value={draft.id} onChange={e => setDraft(d => ({ ...d, id: e.target.value }))} />
              </div>
              <div className="col-6">
                <label className="form-label small">Name</label>
                <input className="form-control" value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
              </div>
              <div className="col-12">
                <label className="form-label small">Description</label>
                <input className="form-control" value={draft.desc || ''} onChange={e => setDraft(d => ({ ...d, desc: e.target.value }))} />
              </div>
              <div className="col-4">
                <label className="form-label small">Price</label>
                <input type="number" className="form-control" value={draft.price} onChange={e => setDraft(d => ({ ...d, price: Number(e.target.value || 0) }))} />
              </div>
              <div className="col-8">
                <label className="form-label small">Category</label>
                <select className="form-select" value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value as ItemCategory }))}>
                  <option value="food">food</option>
                  <option value="potion">potion</option>
                  <option value="weapon">weapon</option>
                  <option value="armor">armor</option>
                  <option value="accessory">accessory</option>
                  <option value="skill">skill</option>
                </select>
              </div>
              <div className="col-6">
                <label className="form-label small">Sprite row</label>
                <input type="number" className="form-control" value={draft.sprite.row} onChange={e => setDraft(d => ({ ...d, sprite: { ...d.sprite, row: Number(e.target.value || 0) } }))} />
              </div>
              <div className="col-6">
                <label className="form-label small">Sprite col</label>
                <input type="number" className="form-control" value={draft.sprite.col} onChange={e => setDraft(d => ({ ...d, sprite: { ...d.sprite, col: Number(e.target.value || 0) } }))} />
              </div>
              <div className="col-12">
                <div className="form-check">
                  <input id="sellable" className="form-check-input" type="checkbox" checked={draft.sellable} onChange={e => setDraft(d => ({ ...d, sellable: e.target.checked }))} />
                  <label htmlFor="sellable" className="form-check-label">Sellable in store</label>
                </div>
              </div>

              <div className="col-12">
                <label className="form-label small">Preview</label>
                <div className="d-flex align-items-center gap-2">
                  <div style={{ ...getSpriteStyleFromUrl(draft.sprite, draft.tilesetUrl || (selectedTileset?.imagePath || '')), border: '1px solid rgba(0,0,0,0.1)' }} />
                  <div className="small text-muted">{draft.tilesetUrl || selectedTileset?.imagePath || '(choose a tileset)'}</div>
                </div>
              </div>
            </div>

            <div className="d-flex gap-2 mt-3">
              {!editingId && (
                <button className="btn btn-success" onClick={addToGame}>Add to game</button>
              )}
              {editingId && (
                <>
                  <button className="btn btn-primary" onClick={updateItem}>Save changes</button>
                  <button className="btn btn-outline-secondary" onClick={() => { setEditingId(null); setDraft(d => ({ ...d, id: 'item_' + Date.now(), name: 'New Item' })) }}>Cancel</button>
                </>
              )}
            </div>

            <div className="mt-4">
              <div className="fw-semibold mb-2">Items Catalog</div>
              <ItemsList onEdit={startEditing} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function ItemsList({ onEdit }: { onEdit: (it: ShopItem) => void }) {
  const { state, emit } = useStore()
  const items = useMemo(() => state.itemsCatalog, [state.itemsCatalog])

  if (items.length === 0) {
    return <div className="text-muted small">No items yet.</div>
  }

  return (
    <div className="d-flex flex-wrap gap-2">
      {items.map((it) => (
        <div key={it.id} className="border rounded p-2 d-flex align-items-center gap-2" style={{ width: 320 }} title={it.desc}>
          <div style={{
            ...(it.tilesetUrl ? getSpriteStyleFromUrl(it.sprite, it.tilesetUrl) : getSpriteStyle(it.sprite)),
            flex: '0 0 auto',
          }} />
          <div className="flex-grow-1">
            <div className="fw-semibold text-truncate">{it.name}</div>
            <div className="small text-muted">{it.category} • {it.price}g</div>
          </div>
          {it.sellable && <span className="badge text-bg-success">Sellable</span>}
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={() => onEdit(it)}
            title="Edit item"
          >
            Edit
          </button>
          <button
            className="btn btn-sm btn-outline-danger"
            onClick={() => {
              state.itemsCatalog = state.itemsCatalog.filter(x => x.id !== it.id)
              state.shop = state.shop.filter(x => x.id !== it.id)
              state.logs.events.unshift(`Removed item: ${it.name}`)
              emit()
            }}
            title="Remove item"
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  )
}



