import React, { useEffect, useMemo } from 'react'
import { useStore } from '../core/store'
import type { ShopItem } from '../core/types'
import { getSpriteStyle, getSpriteStyleFromUrl } from '../core/items'
import { spendMoney } from '../core/money'

export function Shop() {
  const { state, emit } = useStore() 

  const canAfford = (price: number) => state.money >= price

  const buy = (item: ShopItem) => {
    if (!canAfford(item.price)) return
    spendMoney(state, item.price)
    // All purchases go to guild inventory. Food consumption will pull from inventory.
    state.inventory.push(item)
    state.logs.events.unshift(`Purchased: ${item.name} (-${item.price}g)`) 
    emit()
  }

  const grouped = useMemo(() => {
    const source: ShopItem[] = state.shop && state.shop.length > 0
      ? state.shop
      : (state.itemsCatalog || []).filter((i: any) => i && (i as any).sellable)
    console.log('[Shop] itemsLoaded:', (state as any).itemsLoaded, 'catalog:', state.itemsCatalog?.length || 0, 'shop:', state.shop?.length || 0)
    const map: Record<string, ShopItem[]> = {}
    for (const item of source) {
      if (!map[item.category]) map[item.category] = []
      map[item.category].push(item)
    }
    return map
  }, [state.shop, state.itemsCatalog])

  const isLoaded = (state as any).itemsLoaded ?? true
  if (!isLoaded) {
    console.log('[Shop] waiting for items to load...')
  }

  // Safety: if catalog finished loading but shop hasn't been derived (e.g., tab mounted mid-load), derive it now
  useEffect(() => {
    const loaded = (state as any).itemsLoaded === true
    const shopEmpty = !Array.isArray(state.shop) || state.shop.length === 0
    const hasCatalog = Array.isArray(state.itemsCatalog) && state.itemsCatalog.length > 0
    if (loaded && shopEmpty && hasCatalog) {
      state.shop = state.itemsCatalog.filter(i => (i as any).sellable)
      emit()
    }
  }, [state.itemsLoaded, state.itemsCatalog, state.shop])

  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex align-items-center justify-content-between">
          <h5 className="card-title m-0">Shop</h5>
          <div className="badge text-bg-secondary">Gold: {state.money}</div>
        </div>

        {!isLoaded && (
          <div className="text-muted mt-2">Loading items...</div>
        )}
        {isLoaded && Object.keys(grouped).length === 0 && (
          <div className="text-muted mt-2">No sellable items in catalog. Add items or mark some as sellable in the Items tab.</div>
        )}

        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mt-3">
            <div className="fw-bold text-uppercase small text-muted">{category}</div>
            <div className="d-flex flex-wrap gap-2 mt-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  className="btn btn-light border d-flex align-items-center gap-2"
                  onClick={() => buy(item)}
                  disabled={!canAfford(item.price)}
                  style={{ width: 220 }}
                  title={item.desc || item.name}
                >
                  <div
                    style={{
                      ...(item.tilesetUrl ? getSpriteStyleFromUrl(item.sprite, item.tilesetUrl) : getSpriteStyle(item.sprite)),
                      flex: '0 0 auto',
                      backgroundRepeat: 'no-repeat',
                    }}
                  />
                  <div className="text-start">
                    <div className="fw-semibold">{item.name}</div>
                    <div className="small text-muted">{item.price}g</div>
                    <div className="small text-muted">{item.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


