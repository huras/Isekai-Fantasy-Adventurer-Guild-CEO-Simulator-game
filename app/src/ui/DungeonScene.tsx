import React, { useEffect, useRef, useState } from 'react'
import Phaser from 'phaser'
import type { DungeonState, DungeonLevel, DungeonTile, DungeonItem, DungeonMonster, DungeonTrap, DungeonAction } from '../core/types'

interface DungeonSceneProps {
  dungeonState: DungeonState
  onAction: (action: DungeonAction) => void
  onExit: () => void
}

export function DungeonScene({ dungeonState, onAction, onExit }: DungeonSceneProps) {
  const gameRef = useRef<HTMLDivElement>(null)
  const gameInstanceRef = useRef<Phaser.Game | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!gameRef.current || gameInstanceRef.current) return

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameRef.current,
      backgroundColor: '#000000',
      scene: {
        preload: preload,
        create: create,
        update: update
      },
      physics: {
        default: 'arcade',
        arcade: {
          gravity: { y: 0 },
          debug: false
        }
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    }

    const game = new Phaser.Game(config)
    gameInstanceRef.current = game

    // Pass dungeon state to scene
    ;(game.scene.getScene('default') as any).dungeonState = dungeonState
    ;(game.scene.getScene('default') as any).onAction = onAction
    ;(game.scene.getScene('default') as any).onExit = onExit

    setIsLoaded(true)

    return () => {
      if (gameInstanceRef.current) {
        gameInstanceRef.current.destroy(true)
        gameInstanceRef.current = null
      }
    }
  }, [dungeonState, onAction, onExit])

  // Phaser scene functions
  function preload(this: Phaser.Scene) {
    // Load tile textures
    this.load.image('floor', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    this.load.image('wall', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    this.load.image('water', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    this.load.image('stairs_up', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    this.load.image('stairs_down', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    this.load.image('player', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    this.load.image('monster', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    this.load.image('item', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
    this.load.image('trap', 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')
  }

  function create(this: Phaser.Scene) {
    const dungeonState = (this as any).dungeonState as DungeonState
    const onAction = (this as any).onAction as (action: DungeonAction) => void
    const onExit = (this as any).onExit as () => void

    if (!dungeonState) return

    const currentLevel = dungeonState.levels[dungeonState.currentLevel - 1]
    if (!currentLevel) return

    // Create tilemap
    const tileSize = 16
    const mapWidth = currentLevel.width
    const mapHeight = currentLevel.height

    // Create tilemap
    const map = this.make.tilemap({
      tileWidth: tileSize,
      tileHeight: tileSize,
      width: mapWidth,
      height: mapHeight
    })

    // Add tilesets
    const tileset = map.addTilesetImage('tiles', 'floor')
    if (!tileset) return

    // Create layers
    const groundLayer = map.createBlankLayer('ground', tileset, 0, 0, mapWidth, mapHeight)
    const wallLayer = map.createBlankLayer('walls', tileset, 0, 0, mapWidth, mapHeight)
    const objectLayer = map.createBlankLayer('objects', tileset, 0, 0, mapWidth, mapHeight)

    // Fill tiles
    for (let x = 0; x < mapWidth; x++) {
      for (let y = 0; y < mapHeight; y++) {
        const tile = currentLevel.tiles[x]?.[y]
        if (!tile) continue

        const worldX = x * tileSize
        const worldY = y * tileSize

        // Set tile based on type
        switch (tile.type) {
          case 'floor':
            groundLayer.putTileAt(0, x, y)
            break
          case 'wall':
            wallLayer.putTileAt(1, x, y)
            break
          case 'water':
            groundLayer.putTileAt(2, x, y)
            break
          case 'stairs_up':
            objectLayer.putTileAt(3, x, y)
            break
          case 'stairs_down':
            objectLayer.putTileAt(4, x, y)
            break
        }

        // Add decorations
        if (tile.decoration) {
          this.add.text(worldX, worldY, tile.decoration.charAt(0).toUpperCase(), {
            fontSize: '12px',
            color: '#ffffff'
          }).setOrigin(0.5)
        }
      }
    }

    // Add player
    const player = this.add.sprite(
      dungeonState.playerPosition.x * tileSize + tileSize / 2,
      dungeonState.playerPosition.y * tileSize + tileSize / 2,
      'player'
    )
    player.setTint(0x00ff00)

    // Add monsters
    currentLevel.monsters.forEach(monster => {
      if (monster.isAlive) {
        const monsterSprite = this.add.sprite(
          monster.x * tileSize + tileSize / 2,
          monster.y * tileSize + tileSize / 2,
          'monster'
        )
        monsterSprite.setTint(0xff0000)
        monsterSprite.setData('monster', monster)
      }
    })

    // Add items
    currentLevel.items.forEach(item => {
      if (!item.isCollected) {
        const itemSprite = this.add.sprite(
          item.x * tileSize + tileSize / 2,
          item.y * tileSize + tileSize / 2,
          'item'
        )
        itemSprite.setTint(0xffff00)
        itemSprite.setData('item', item)
        itemSprite.setInteractive()
        
        itemSprite.on('pointerdown', () => {
          onAction({
            type: 'use_item',
            target: item.id,
            position: { x: item.x, y: item.y }
          })
        })
      }
    })

    // Add traps
    currentLevel.traps.forEach(trap => {
      if (!trap.isTriggered) {
        const trapSprite = this.add.sprite(
          trap.x * tileSize + tileSize / 2,
          trap.y * tileSize + tileSize / 2,
          'trap'
        )
        trapSprite.setTint(0xff00ff)
        trapSprite.setData('trap', trap)
        trapSprite.setAlpha(trap.isVisible ? 0.8 : 0.3)
      }
    })

    // Setup camera
    this.cameras.main.setBounds(0, 0, mapWidth * tileSize, mapHeight * tileSize)
    this.cameras.main.startFollow(player)

    // Setup input
    this.input.keyboard.on('keydown-W', () => {
      onAction({ type: 'move', direction: 'north' })
    })
    this.input.keyboard.on('keydown-S', () => {
      onAction({ type: 'move', direction: 'south' })
    })
    this.input.keyboard.on('keydown-A', () => {
      onAction({ type: 'move', direction: 'west' })
    })
    this.input.keyboard.on('keydown-D', () => {
      onAction({ type: 'move', direction: 'east' })
    })
    this.input.keyboard.on('keydown-SPACE', () => {
      onAction({ type: 'search' })
    })
    this.input.keyboard.on('keydown-E', () => {
      onAction({ type: 'interact' })
    })
    this.input.keyboard.on('keydown-ESC', () => {
      onExit()
    })

    // Add UI elements
    this.add.text(10, 10, `Level: ${dungeonState.currentLevel}`, {
      fontSize: '16px',
      color: '#ffffff'
    }).setScrollFactor(0)

    this.add.text(10, 30, `HP: ${dungeonState.playerStats.hp}/${dungeonState.playerStats.maxHp}`, {
      fontSize: '16px',
      color: '#ffffff'
    }).setScrollFactor(0)

    this.add.text(10, 50, `MP: ${dungeonState.playerStats.mp}/${dungeonState.playerStats.maxMp}`, {
      fontSize: '16px',
      color: '#ffffff'
    }).setScrollFactor(0)

    this.add.text(10, 70, `Turns: ${dungeonState.turns}`, {
      fontSize: '16px',
      color: '#ffffff'
    }).setScrollFactor(0)

    // Add action buttons
    const searchButton = this.add.text(700, 10, 'Search', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 10, y: 5 }
    }).setScrollFactor(0).setInteractive()

    searchButton.on('pointerdown', () => {
      onAction({ type: 'search' })
    })

    const restButton = this.add.text(700, 40, 'Rest', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#333333',
      padding: { x: 10, y: 5 }
    }).setScrollFactor(0).setInteractive()

    restButton.on('pointerdown', () => {
      onAction({ type: 'rest' })
    })

    const exitButton = this.add.text(700, 70, 'Exit', {
      fontSize: '16px',
      color: '#ffffff',
      backgroundColor: '#ff0000',
      padding: { x: 10, y: 5 }
    }).setScrollFactor(0).setInteractive()

    exitButton.on('pointerdown', () => {
      onExit()
    })

    // Store references for update function
    ;(this as any).player = player
    ;(this as any).dungeonState = dungeonState
    ;(this as any).currentLevel = currentLevel
    ;(this as any).tileSize = tileSize
  }

  function update(this: Phaser.Scene) {
    const dungeonState = (this as any).dungeonState as DungeonState
    const player = (this as any).player as Phaser.GameObjects.Sprite
    const currentLevel = (this as any).currentLevel as DungeonLevel
    const tileSize = (this as any).tileSize as number

    if (!dungeonState || !player || !currentLevel) return

    // Update player position
    player.x = dungeonState.playerPosition.x * tileSize + tileSize / 2
    player.y = dungeonState.playerPosition.y * tileSize + tileSize / 2

    // Update visibility based on fog of war
    if (dungeonState.fogOfWar) {
      this.children.list.forEach((child: any) => {
        if (child.type === 'TilemapLayer') {
          // Implement fog of war logic here
        }
      })
    }
  }

  return (
    <div className="dungeon-scene">
      <div ref={gameRef} className="game-container" />
      {!isLoaded && (
        <div className="loading-overlay">
          <div className="loading-spinner">Loading Dungeon...</div>
        </div>
      )}
      
      <style jsx>{`
        .dungeon-scene {
          position: relative;
          width: 100%;
          height: 100vh;
          background: #000;
        }

        .game-container {
          width: 100%;
          height: 100%;
        }

        .loading-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .loading-spinner {
          color: white;
          font-size: 24px;
          font-weight: bold;
        }
      `}</style>
    </div>
  )
}
