import type { 
  DungeonState, 
  DungeonLevel, 
  DungeonAction, 
  DungeonItem, 
  DungeonMonster, 
  DungeonTrap,
  Member,
  DungeonEvent
} from './types'
import * as Easystar from 'easystarjs'

// Pathfinding instance
const pathfinder = new Easystarjs.js()

export class DungeonLogic {
  private dungeonState: DungeonState
  private pathfinder: Easystarjs.js

  constructor(dungeonState: DungeonState) {
    this.dungeonState = dungeonState
    this.pathfinder = new Easystarjs.js()
    this.initializePathfinder()
  }

  private initializePathfinder(): void {
    const currentLevel = this.dungeonState.levels[this.dungeonState.currentLevel - 1]
    if (!currentLevel) return

    // Create grid for pathfinding
    const grid: number[][] = []
    for (let x = 0; x < currentLevel.width; x++) {
      grid[x] = []
      for (let y = 0; y < currentLevel.height; y++) {
        const tile = currentLevel.tiles[x]?.[y]
        if (!tile) {
          grid[x][y] = 1 // Wall
        } else {
          grid[x][y] = tile.type === 'floor' || tile.type === 'corridor' ? 0 : 1
        }
      }
    }

    this.pathfinder.setGrid(grid)
    this.pathfinder.setAcceptableTiles([0]) // Only floor tiles are walkable
  }

  // Process player action
  processAction(action: DungeonAction): { success: boolean; message: string; events?: DungeonEvent[] } {
    const currentLevel = this.dungeonState.levels[this.dungeonState.currentLevel - 1]
    if (!currentLevel) {
      return { success: false, message: 'No level found' }
    }

    const events: DungeonEvent[] = []

    switch (action.type) {
      case 'move':
        return this.processMove(action.direction!)
      
      case 'attack':
        return this.processAttack(action.target as string)
      
      case 'use_item':
        return this.processUseItem(action.itemId!)
      
      case 'interact':
        return this.processInteract()
      
      case 'rest':
        return this.processRest()
      
      case 'flee':
        return this.processFlee()
      
      case 'search':
        return this.processSearch()
      
      case 'open_door':
        return this.processOpenDoor(action.position!)
      
      case 'climb_stairs':
        return this.processClimbStairs()
      
      default:
        return { success: false, message: 'Unknown action' }
    }
  }

  private processMove(direction: string): { success: boolean; message: string; events?: DungeonEvent[] } {
    const currentLevel = this.dungeonState.levels[this.dungeonState.currentLevel - 1]
    if (!currentLevel) {
      return { success: false, message: 'No level found' }
    }

    const newX = this.dungeonState.playerPosition.x
    const newY = this.dungeonState.playerPosition.y

    // Calculate new position based on direction
    switch (direction) {
      case 'north':
        newY--
        break
      case 'south':
        newY++
        break
      case 'east':
        newX++
        break
      case 'west':
        newX--
        break
      case 'northeast':
        newX++
        newY--
        break
      case 'northwest':
        newX--
        newY--
        break
      case 'southeast':
        newX++
        newY++
        break
      case 'southwest':
        newX--
        newY++
        break
      default:
        return { success: false, message: 'Invalid direction' }
    }

    // Check if new position is valid
    if (!this.isValidPosition(newX, newY, currentLevel)) {
      return { success: false, message: 'Cannot move there' }
    }

    // Check for collisions
    const collision = this.checkCollision(newX, newY, currentLevel)
    if (collision) {
      return { success: false, message: collision }
    }

    // Move player
    this.dungeonState.playerPosition.x = newX
    this.dungeonState.playerPosition.y = newY
    this.dungeonState.turns++

    // Update automap
    this.updateAutomap(newX, newY, currentLevel)

    // Check for events at new position
    const events = this.checkPositionEvents(newX, newY, currentLevel)

    return { 
      success: true, 
      message: `Moved ${direction}`,
      events
    }
  }

  private isValidPosition(x: number, y: number, level: DungeonLevel): boolean {
    if (x < 0 || x >= level.width || y < 0 || y >= level.height) {
      return false
    }

    const tile = level.tiles[x]?.[y]
    if (!tile) return false

    return tile.type === 'floor' || tile.type === 'corridor' || tile.type === 'stairs_up' || tile.type === 'stairs_down'
  }

  private checkCollision(x: number, y: number, level: DungeonLevel): string | null {
    // Check for monsters
    const monster = level.monsters.find(m => m.x === x && m.y === y && m.isAlive)
    if (monster) {
      return `Blocked by ${monster.name}`
    }

    // Check for closed doors
    const tile = level.tiles[x]?.[y]
    if (tile?.type === 'door') {
      return 'Door is closed'
    }

    return null
  }

  private updateAutomap(x: number, y: number, level: DungeonLevel): void {
    const key = `${x},${y}`
    this.dungeonState.automap.exploredTiles.add(key)

    // Mark adjacent tiles as visible
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const adjX = x + dx
        const adjY = y + dy
        const adjKey = `${adjX},${adjY}`
        
        if (adjX >= 0 && adjX < level.width && adjY >= 0 && adjY < level.height) {
          this.dungeonState.automap.exploredTiles.add(adjKey)
        }
      }
    }

    // Check for discovered rooms
    level.rooms.forEach(room => {
      if (x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height) {
        this.dungeonState.automap.discoveredRooms.add(room.id)
      }
    })

    // Check for discovered items
    level.items.forEach(item => {
      if (item.x === x && item.y === y && !item.isCollected) {
        this.dungeonState.automap.discoveredItems.add(item.id)
      }
    })

    // Check for discovered monsters
    level.monsters.forEach(monster => {
      if (monster.x === x && monster.y === y && monster.isAlive) {
        this.dungeonState.automap.discoveredMonsters.add(monster.id)
      }
    })

    // Check for discovered traps
    level.traps.forEach(trap => {
      if (trap.x === x && trap.y === y && !trap.isTriggered) {
        this.dungeonState.automap.discoveredTraps.add(trap.id)
      }
    })
  }

  private checkPositionEvents(x: number, y: number, level: DungeonLevel): DungeonEvent[] {
    const events: DungeonEvent[] = []

    // Check for items
    const item = level.items.find(i => i.x === x && i.y === y && !i.isCollected)
    if (item) {
      events.push({
        id: `event_${Date.now()}`,
        type: 'item_found',
        description: `Found ${item.name}`,
        position: { x, y },
        level: this.dungeonState.currentLevel,
        turn: this.dungeonState.turns,
        data: { item }
      })
    }

    // Check for stairs
    const tile = level.tiles[x]?.[y]
    if (tile?.type === 'stairs_up' || tile?.type === 'stairs_down') {
      events.push({
        id: `event_${Date.now()}`,
        type: 'stairs_found',
        description: `Found ${tile.type === 'stairs_up' ? 'stairs up' : 'stairs down'}`,
        position: { x, y },
        level: this.dungeonState.currentLevel,
        turn: this.dungeonState.turns,
        data: { direction: tile.type }
      })
    }

    // Check for room discovery
    level.rooms.forEach(room => {
      if (x >= room.x && x < room.x + room.width && y >= room.y && y < room.y + room.height) {
        if (!this.dungeonState.automap.discoveredRooms.has(room.id)) {
          events.push({
            id: `event_${Date.now()}`,
            type: 'room_discovered',
            description: `Discovered ${room.type} room`,
            position: { x, y },
            level: this.dungeonState.currentLevel,
            turn: this.dungeonState.turns,
            data: { room }
          })
        }
      }
    })

    return events
  }

  private processAttack(targetId: string): { success: boolean; message: string; events?: DungeonEvent[] } {
    const currentLevel = this.dungeonState.levels[this.dungeonState.currentLevel - 1]
    if (!currentLevel) {
      return { success: false, message: 'No level found' }
    }

    const monster = currentLevel.monsters.find(m => m.id === targetId && m.isAlive)
    if (!monster) {
      return { success: false, message: 'Target not found' }
    }

    // Check if monster is in range
    const distance = Math.abs(monster.x - this.dungeonState.playerPosition.x) + 
                    Math.abs(monster.y - this.dungeonState.playerPosition.y)
    
    if (distance > 1) {
      return { success: false, message: 'Target out of range' }
    }

    // Calculate damage
    const player = this.dungeonState.party[0]
    if (!player) {
      return { success: false, message: 'No player found' }
    }

    const damage = Math.max(1, Math.floor(player.stats.str * 0.8 + Math.random() * player.stats.str * 0.4))
    monster.hp = Math.max(0, monster.hp - damage)

    const events: DungeonEvent[] = [{
      id: `event_${Date.now()}`,
      type: 'monster_encounter',
      description: `Attacked ${monster.name} for ${damage} damage`,
      position: { x: monster.x, y: monster.y },
      level: this.dungeonState.currentLevel,
      turn: this.dungeonState.turns,
      data: { monster, damage, isPlayerAttack: true }
    }]

    if (monster.hp <= 0) {
      monster.isAlive = false
      events[0].description += ` - ${monster.name} defeated!`
      
      // Check for loot
      if (monster.loot.length > 0) {
        events[0].description += ` Found loot!`
      }
    }

    this.dungeonState.turns++

    return { 
      success: true, 
      message: `Attacked ${monster.name} for ${damage} damage`,
      events
    }
  }

  private processUseItem(itemId: string): { success: boolean; message: string; events?: DungeonEvent[] } {
    const currentLevel = this.dungeonState.levels[this.dungeonState.currentLevel - 1]
    if (!currentLevel) {
      return { success: false, message: 'No level found' }
    }

    const item = currentLevel.items.find(i => i.id === itemId && !i.isCollected)
    if (!item) {
      return { success: false, message: 'Item not found' }
    }

    // Check if player is at item location
    if (item.x !== this.dungeonState.playerPosition.x || item.y !== this.dungeonState.playerPosition.y) {
      return { success: false, message: 'Not at item location' }
    }

    // Collect item
    item.isCollected = true
    this.dungeonState.inventory.push(item)
    this.dungeonState.turns++

    const events: DungeonEvent[] = [{
      id: `event_${Date.now()}`,
      type: 'item_found',
      description: `Collected ${item.name}`,
      position: { x: item.x, y: item.y },
      level: this.dungeonState.currentLevel,
      turn: this.dungeonState.turns,
      data: { item }
    }]

    return { 
      success: true, 
      message: `Collected ${item.name}`,
      events
    }
  }

  private processInteract(): { success: boolean; message: string; events?: DungeonEvent[] } {
    const currentLevel = this.dungeonState.levels[this.dungeonState.currentLevel - 1]
    if (!currentLevel) {
      return { success: false, message: 'No level found' }
    }

    const x = this.dungeonState.playerPosition.x
    const y = this.dungeonState.playerPosition.y
    const tile = currentLevel.tiles[x]?.[y]

    if (!tile) {
      return { success: false, message: 'Nothing to interact with' }
    }

    switch (tile.type) {
      case 'stairs_up':
        return this.processClimbStairs()
      
      case 'stairs_down':
        return this.processClimbStairs()
      
      case 'door':
        return this.processOpenDoor({ x, y })
      
      default:
        return { success: false, message: 'Nothing to interact with' }
    }
  }

  private processRest(): { success: boolean; message: string; events?: DungeonEvent[] } {
    const player = this.dungeonState.party[0]
    if (!player) {
      return { success: false, message: 'No player found' }
    }

    // Rest restores some HP and MP
    const hpRestored = Math.min(10, this.dungeonState.playerStats.maxHp - this.dungeonState.playerStats.hp)
    const mpRestored = Math.min(5, this.dungeonState.playerStats.maxMp - this.dungeonState.playerStats.mp)

    this.dungeonState.playerStats.hp = Math.min(this.dungeonState.playerStats.maxHp, this.dungeonState.playerStats.hp + hpRestored)
    this.dungeonState.playerStats.mp = Math.min(this.dungeonState.playerStats.maxMp, this.dungeonState.playerStats.mp + mpRestored)

    this.dungeonState.turns++

    return { 
      success: true, 
      message: `Rested. Restored ${hpRestored} HP and ${mpRestored} MP` 
    }
  }

  private processFlee(): { success: boolean; message: string; events?: DungeonEvent[] } {
    // Find nearest safe location
    const currentLevel = this.dungeonState.levels[this.dungeonState.currentLevel - 1]
    if (!currentLevel) {
      return { success: false, message: 'No level found' }
    }

    // Simple flee logic - move away from monsters
    const monsters = currentLevel.monsters.filter(m => m.isAlive)
    if (monsters.length === 0) {
      return { success: false, message: 'No monsters to flee from' }
    }

    // Find direction away from nearest monster
    const nearestMonster = monsters.reduce((nearest, monster) => {
      const distance = Math.abs(monster.x - this.dungeonState.playerPosition.x) + 
                      Math.abs(monster.y - this.dungeonState.playerPosition.y)
      return distance < nearest.distance ? { monster, distance } : nearest
    }, { monster: monsters[0], distance: Infinity })

    // Move away from monster
    const dx = this.dungeonState.playerPosition.x - nearestMonster.monster.x
    const dy = this.dungeonState.playerPosition.y - nearestMonster.monster.y
    
    let newX = this.dungeonState.playerPosition.x
    let newY = this.dungeonState.playerPosition.y

    if (Math.abs(dx) > Math.abs(dy)) {
      newX += dx > 0 ? 1 : -1
    } else {
      newY += dy > 0 ? 1 : -1
    }

    // Check if new position is valid
    if (this.isValidPosition(newX, newY, currentLevel) && !this.checkCollision(newX, newY, currentLevel)) {
      this.dungeonState.playerPosition.x = newX
      this.dungeonState.playerPosition.y = newY
      this.dungeonState.turns++
      this.updateAutomap(newX, newY, currentLevel)

      return { 
        success: true, 
        message: 'Fled from combat' 
      }
    }

    return { success: false, message: 'Cannot flee' }
  }

  private processSearch(): { success: boolean; message: string; events?: DungeonEvent[] } {
    const currentLevel = this.dungeonState.levels[this.dungeonState.currentLevel - 1]
    if (!currentLevel) {
      return { success: false, message: 'No level found' }
    }

    const x = this.dungeonState.playerPosition.x
    const y = this.dungeonState.playerPosition.y

    // Search for hidden items or traps
    const hiddenItems = currentLevel.items.filter(item => 
      !item.isCollected && 
      Math.abs(item.x - x) <= 1 && 
      Math.abs(item.y - y) <= 1
    )

    const hiddenTraps = currentLevel.traps.filter(trap => 
      !trap.isTriggered && 
      !trap.isVisible &&
      Math.abs(trap.x - x) <= 1 && 
      Math.abs(trap.y - y) <= 1
    )

    this.dungeonState.turns++

    let message = 'Searched the area'
    const events: DungeonEvent[] = []

    if (hiddenItems.length > 0) {
      message += `. Found ${hiddenItems.length} hidden item(s)`
      hiddenItems.forEach(item => {
        this.dungeonState.automap.discoveredItems.add(item.id)
        events.push({
          id: `event_${Date.now()}`,
          type: 'item_found',
          description: `Found hidden ${item.name}`,
          position: { x: item.x, y: item.y },
          level: this.dungeonState.currentLevel,
          turn: this.dungeonState.turns,
          data: { item }
        })
      })
    }

    if (hiddenTraps.length > 0) {
      message += `. Found ${hiddenTraps.length} hidden trap(s)`
      hiddenTraps.forEach(trap => {
        trap.isVisible = true
        this.dungeonState.automap.discoveredTraps.add(trap.id)
        events.push({
          id: `event_${Date.now()}`,
          type: 'trap_triggered',
          description: `Discovered ${trap.name}`,
          position: { x: trap.x, y: trap.y },
          level: this.dungeonState.currentLevel,
          turn: this.dungeonState.turns,
          data: { trap }
        })
      })
    }

    return { 
      success: true, 
      message,
      events
    }
  }

  private processOpenDoor(position: { x: number; y: number }): { success: boolean; message: string; events?: DungeonEvent[] } {
    const currentLevel = this.dungeonState.levels[this.dungeonState.currentLevel - 1]
    if (!currentLevel) {
      return { success: false, message: 'No level found' }
    }

    const tile = currentLevel.tiles[position.x]?.[position.y]
    if (!tile || tile.type !== 'door') {
      return { success: false, message: 'No door here' }
    }

    // Change door to floor
    tile.type = 'floor'
    this.dungeonState.turns++

    return { 
      success: true, 
      message: 'Opened the door' 
    }
  }

  private processClimbStairs(): { success: boolean; message: string; events?: DungeonEvent[] } {
    const currentLevel = this.dungeonState.levels[this.dungeonState.currentLevel - 1]
    if (!currentLevel) {
      return { success: false, message: 'No level found' }
    }

    const x = this.dungeonState.playerPosition.x
    const y = this.dungeonState.playerPosition.y
    const tile = currentLevel.tiles[x]?.[y]

    if (!tile || (tile.type !== 'stairs_up' && tile.type !== 'stairs_down')) {
      return { success: false, message: 'No stairs here' }
    }

    if (tile.type === 'stairs_up') {
      // Go up a level
      if (this.dungeonState.currentLevel > 1) {
        this.dungeonState.currentLevel--
        this.dungeonState.currentLevel = Math.max(1, this.dungeonState.currentLevel)
        
        // Update automap level
        this.dungeonState.automap.level = this.dungeonState.currentLevel
        
        return { 
          success: true, 
          message: 'Climbed up to previous level' 
        }
      } else {
        return { success: false, message: 'Already at the top level' }
      }
    } else {
      // Go down a level
      if (this.dungeonState.currentLevel < this.dungeonState.levels.length) {
        this.dungeonState.currentLevel++
        this.dungeonState.currentLevel = Math.min(this.dungeonState.levels.length, this.dungeonState.currentLevel)
        
        // Update automap level
        this.dungeonState.automap.level = this.dungeonState.currentLevel
        
        return { 
          success: true, 
          message: 'Climbed down to next level' 
        }
      } else {
        return { success: false, message: 'Already at the bottom level' }
      }
    }
  }

  // Get current dungeon state
  getDungeonState(): DungeonState {
    return this.dungeonState
  }

  // Check if dungeon is completed
  isDungeonCompleted(): boolean {
    const currentLevel = this.dungeonState.levels[this.dungeonState.currentLevel - 1]
    if (!currentLevel) return false

    // Check if all monsters are defeated
    const allMonstersDefeated = currentLevel.monsters.every(m => !m.isAlive)
    
    // Check if player reached exit stairs
    const atExit = currentLevel.stairs.down && 
                   this.dungeonState.playerPosition.x === currentLevel.stairs.down.x &&
                   this.dungeonState.playerPosition.y === currentLevel.stairs.down.y

    return allMonstersDefeated && atExit
  }
}
