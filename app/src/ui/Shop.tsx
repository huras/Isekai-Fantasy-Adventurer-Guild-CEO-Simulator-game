import React, { useEffect, useMemo } from 'react'
import { useStore } from '../core/store'
import type { ShopItem, Member } from '../core/types'
import { getSpriteStyle, getSpriteStyleFromUrl } from '../core/items'
import { spendMoney } from '../core/money'
import { logEvent } from '../core/logs'
import { getCategoryEmoji, getCategoryName } from '../core/categories'

export function Shop() {
  const { state, emit } = useStore() 

  const canAfford = (price: number) => state.money >= price

  const buy = (item: ShopItem) => {
    if (!canAfford(item.price)) return
    spendMoney(state, item.price)
    // All purchases go to guild inventory. Food consumption will pull from inventory.
    state.inventory = [...state.inventory, { ...item }]
    logEvent(state, `Purchased: ${item.name} (-${item.price}g)`) 
    emit()
  }

  // Calculate inventory counts and unit carriers for each item
  const getItemInfo = (itemId: string) => {
    // Count in guild inventory
    const guildCount = state.inventory.filter(i => i.id === itemId).length
    
    // Find units carrying this item
    const carriers: { member: Member; count: number }[] = []
    for (const member of state.members) {
      const items = (member.items || []).filter(Boolean) as { id: string; qty?: number }[]
      if (items.length > 0) {
        const memberItem = items.find(i => i.id === itemId)
        if (memberItem && (memberItem.qty || 1) > 0) {
          carriers.push({ member, count: memberItem.qty || 1 })
        }
      }
    }
    
    return { guildCount, carriers }
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
        <div className="d-flex align-items-center justify-content-between mb-4">
          <h5 className="card-title m-0">🛒 Shop</h5>
          <div className="badge text-bg-secondary fs-6">Gold: {state.money}g</div>
        </div>

        {!isLoaded && (
          <div className="text-muted mt-2">Loading items...</div>
        )}
        {isLoaded && Object.keys(grouped).length === 0 && (
          <div className="text-muted mt-2">No sellable items in catalog. Add items or mark some as sellable in the Items tab.</div>
        )}

        {Object.entries(grouped).map(([category, items]) => (
          <div key={category} className="mt-4">
            <div className="fw-bold text-uppercase small text-muted mb-3 d-flex align-items-center gap-2">
              <span style={{ fontSize: '1.2rem' }}>{getCategoryEmoji(category)}</span>
              <span>{getCategoryName(category)}</span>
            </div>
            <div className="row g-3">
              {items.map((item) => {
                const itemInfo = getItemInfo(item.id)
                return (
                  <div key={item.id} className="col-12 col-md-6 col-lg-3">
                    <div className="card h-100 border-0 shop-item-card" 
                         style={{
                           background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                           borderRadius: '16px',
                           overflow: 'hidden',
                           position: 'relative',
                           transition: 'all 0.2s ease-in-out'
                         }}
                         onMouseEnter={(e) => {
                           e.currentTarget.style.transform = 'translateY(-4px)'
                           e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)'
                         }}
                         onMouseLeave={(e) => {
                           e.currentTarget.style.transform = 'translateY(0)'
                           e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'
                         }}>
                      
                      {/* Inventory Count Badges - Positioned */}
                      <div className="position-absolute top-0 end-0 m-2">
                        <div 
                          className="badge bg-success bg-opacity-90 text-white mb-1" 
                          style={{ fontSize: '0.8rem' }}
                          title="In Guild Inventory"
                        >
                          🏰 {itemInfo.guildCount}
                        </div>
                        <div 
                          className="badge bg-info bg-opacity-90 text-white" 
                          style={{ fontSize: '0.8rem' }} 
                          title="Carried by Adventurers" 
                        >
                          👥 {itemInfo.carriers.length}
                        </div>
                      </div>

                      <div className="card-body p-3">
                        {/* Item Header with Sprite */}
                        <div className="d-flex align-items-start gap-3 mb-3">
                          <div 
                            className="flex-shrink-0"
                            style={{
                              ...(item.tilesetUrl ? getSpriteStyleFromUrl(item.sprite, item.tilesetUrl) : getSpriteStyle(item.sprite)),
                              backgroundRepeat: 'no-repeat',
                              borderRadius: '0px',
                            }}
                          />
                          <div className="flex-grow-1">
                            <h6 className="card-title mb-1 fw-bold text-dark">{item.name}</h6>
                            <div className="text-primary fw-bold mb-1 fs-5">{item.price}g</div>
                            {item.desc && (
                              <div className="small text-muted mb-2">{item.desc}</div>
                            )}
                          </div>
                        </div>

                        {/* Unit Carriers */}
                        {itemInfo.carriers.length > 0 && (
                          <div className="mb-3">
                            <div className="small text-muted mb-1">Carried by:</div>
                            <div className="d-flex flex-wrap gap-1">
                              {itemInfo.carriers.map(({ member, count }) => (
                                <span 
                                  key={member.id} 
                                  className="badge bg-info bg-opacity-75 text-white"
                                  title={`${member.name} has ${count} ${item.name}`}
                                >
                                  {member.name} ×{count}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Buy Button */}
                        <button
                          className="btn btn-primary w-100 fw-bold"
                          onClick={() => buy(item)}
                          disabled={!canAfford(item.price)}
                          style={{
                            borderRadius: '12px',
                            padding: '0.75rem',
                            fontSize: '0.9rem'
                          }}
                        >
                          {canAfford(item.price) ? `Buy` : `Need ${item.price - state.money}g more`}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}


