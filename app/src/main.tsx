import React from 'react'
import ReactDOM from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import './index.css'
import { App } from './ui/App'
import type { ShopItem, GameState } from './core/types'

async function bootstrap() {
  let initial: Partial<GameState> | undefined
  try {
    const base = (import.meta as any).env?.BASE_URL || '/'
    const url = new URL(`${base}${base.endsWith('/') ? '' : '/'}items/items.json`, window.location.href)
    const res = await fetch(url.href, { cache: 'no-cache' })
    const contentType = res.headers.get('content-type') || ''
    if (res.ok && contentType.includes('application/json')) {
      const catalog = (await res.json()) as ShopItem[]
      for (const it of catalog) {
        if (typeof (it as any).apply !== 'function') {
          ;(it as ShopItem).apply = () => {}
        }
      }
      initial = {
        itemsCatalog: catalog,
        shop: catalog.filter(i => (i as any).sellable),
        itemsLoaded: true,
      }
    }
  } catch {
    // ignore; fallback to lazy load inside StoreProvider
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <App initialState={initial} />
  )
}

void bootstrap()
