import React, { useMemo, useRef, useState } from 'react'
import type { TilesetJSON } from '../core/types'

export function Tilesets() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [tilesets, setTilesets] = useState<TilesetJSON[]>(() => [])
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null)

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result)) as TilesetJSON
        setTilesets(prev => {
          const existsIdx = prev.findIndex(t => t.imagePath === json.imagePath)
          if (existsIdx >= 0) {
            const next = prev.slice()
            next[existsIdx] = json
            return next
          }
          return [...prev, json]
        })
      } catch (err) {
        alert('Invalid JSON')
      }
    }
    reader.readAsText(file)
  }

  function exportSelected() {
    if (selectedIdx == null) return
    const data = tilesets[selectedIdx]
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${data.tileset}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  function removeSelected() {
    if (selectedIdx == null) return
    setTilesets(prev => prev.filter((_, i) => i !== selectedIdx))
    setSelectedIdx(null)
  }

  const selected = useMemo(() => (selectedIdx == null ? null : tilesets[selectedIdx] || null), [tilesets, selectedIdx])

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between">
          <h5 className="card-title m-0">Tilesets</h5>
          <div className="d-flex gap-2">
            <input ref={fileInputRef} type="file" accept="application/json" className="d-none" onChange={handleImportFile} />
            <button className="btn btn-sm btn-primary" onClick={() => fileInputRef.current?.click()}>Import JSON</button>
            <button className="btn btn-sm btn-outline-secondary" disabled={selectedIdx==null} onClick={exportSelected}>Export Selected</button>
            <button className="btn btn-sm btn-outline-danger" disabled={selectedIdx==null} onClick={removeSelected}>Remove Selected</button>
          </div>
        </div>

        <div className="row mt-3">
          <div className="col-4">
            <div className="list-group">
              {tilesets.map((t, i) => (
                <button
                  key={t.imagePath + i}
                  className={`list-group-item list-group-item-action ${i===selectedIdx ? 'active' : ''}`}
                  onClick={() => setSelectedIdx(i)}
                  title={`${t.tileset} (${t.grid.cols}x${t.grid.rows})`}
                >
                  <div className="d-flex justify-content-between">
                    <span className="text-truncate" style={{ maxWidth: 180 }}>{t.tileset}</span>
                    <span className="badge text-bg-secondary">{t.grid.cols}×{t.grid.rows}</span>
                  </div>
                </button>
              ))}
              {tilesets.length === 0 && (
                <div className="text-muted small p-2">No tilesets loaded. Use Import JSON to add some.</div>
              )}
            </div>
          </div>

          <div className="col-8">
            {!selected && <div className="text-muted">Select a tileset to preview.</div>}
            {selected && (
              <div>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <div className="fw-semibold">{selected.tileset}</div>
                    <div className="small text-muted">{selected.imagePath}</div>
                  </div>
                  <div className="small text-muted">Image: {selected.image.width}×{selected.image.height}px</div>
                </div>
                <div className="border rounded p-2 mt-2" style={{ maxHeight: 420, overflow: 'auto' }}>
                  <div className="d-flex flex-wrap gap-2">
                    {selected.sprites.map(s => (
                      <div key={s.id} style={{
                        width: s.width,
                        height: s.height,
                        backgroundImage: s.backgroundImage,
                        backgroundPosition: s.backgroundPosition,
                        backgroundRepeat: s.backgroundRepeat,
                        imageRendering: s.imageRendering,
                        border: '1px dotted rgba(0,0,0,0.1)'
                      }} title={`${s.id} (r${s.row},c${s.col})`} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


