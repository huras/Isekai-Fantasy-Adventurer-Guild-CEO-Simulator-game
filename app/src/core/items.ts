import type { GameState, ShopItem } from './types'
import type React from 'react'

export const TILE_SIZE = 32
export const OFFSET = { x: 1, y: 1 } // Assumption: same offset on Y as X
export const PADDING = { x: 2, y: 2 } // Assumption: same padding on Y as X
export const TILESET_URL = '/items/tileset_1.png'

export type SpriteCoord = { row: number; col: number }

export function getBackgroundPositionPx(coord: SpriteCoord): { x: number; y: number } {
  const x = OFFSET.x + coord.col * (TILE_SIZE + PADDING.x)
  const y = OFFSET.y + coord.row * (TILE_SIZE + PADDING.y)
  return { x, y }
}

export function getSpriteStyle(coord: SpriteCoord): React.CSSProperties {
  const { x, y } = getBackgroundPositionPx(coord)
  return {
    width: TILE_SIZE + PADDING.x/2,
    height: TILE_SIZE + PADDING.y/2,
    backgroundImage: `url(${TILESET_URL})`,
    backgroundPosition: `-${x}px -${y}px`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
  }
}

export function getSpriteStyleFromUrl(coord: SpriteCoord, tilesetUrl: string): React.CSSProperties {
  const { x, y } = getBackgroundPositionPx(coord)
  return {
    width: TILE_SIZE + PADDING.x/2,
    height: TILE_SIZE + PADDING.y/2,
    backgroundImage: `url(${tilesetUrl || TILESET_URL})`,
    backgroundPosition: `-${x}px -${y}px`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
  }
}

// Optional tileset meta reader kept for future use if needed
export async function getTilesetMeta(): Promise<{ width: number; height: number; cols: number; rows: number }> {
  const img = new Image()
  img.src = TILESET_URL
  if (!img.complete) {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = () => reject(new Error('Failed to load tileset image'))
    })
  }
  const width = img.naturalWidth
  const height = img.naturalHeight
  const cols = Math.max(0, Math.floor((width - OFFSET.x) / (TILE_SIZE + PADDING.x)))
  const rows = Math.max(0, Math.floor((height - OFFSET.y) / (TILE_SIZE + PADDING.y)))
  return { width, height, cols, rows }
}

function createItem(params: {
  id: string
  name: string
  price: number
  category: 'food' | 'potion' | 'weapon' | 'armor' | 'accessory' | 'skill'
  sprite: SpriteCoord
  desc?: string
}): ShopItem {
  return {
    id: params.id,
    name: params.name,
    price: params.price,
    category: params.category,
    sprite: params.sprite,
    desc: params.desc,
    apply(state: GameState) {
      // Placeholder effect; systems for item usage can hook into this later
      state.logs.events.unshift(`Obtained: ${params.name}`)
    },
  }
}

// Legacy generator removed. Shop is now derived from the items catalog.


