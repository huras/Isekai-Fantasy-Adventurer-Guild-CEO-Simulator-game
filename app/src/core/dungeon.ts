import type { 
  DungeonLevel, 
  DungeonTile, 
  DungeonRoom, 
  DungeonCorridor, 
  DungeonItem, 
  DungeonMonster, 
  DungeonTrap,
  DungeonGenerationConfig,
  DungeonQuest,
  Member,
  Stats
} from './types'
import * as ROT from 'rot-js'

// Dungeon generation using rot.js
export class DungeonGenerator {
  private map: ROT.Map;
  private width: number;
  private height: number;
  private config: DungeonGenerationConfig;

  constructor(config: DungeonGenerationConfig) {
    this.config = config;
    this.width = config.width;
    this.height = config.height;
    
    // Choose dungeon generation algorithm based on theme
    switch (config.theme) {
      case 'cave':
        this.map = new ROT.Map.Cellular(this.width, this.height);
        break;
      case 'temple':
        this.map = new ROT.Map.Digger(this.width, this.height, {
          roomWidth: [config.minRoomSize, config.maxRoomSize],
          roomHeight: [config.minRoomSize, config.maxRoomSize],
          corridorLength: [3, 10],
          dugPercentage: 0.8
        });
        break;
      case 'tower':
        this.map = new ROT.Map.Digger(this.width, this.height, {
          roomWidth: [config.minRoomSize, config.maxRoomSize],
          roomHeight: [config.minRoomSize, config.maxRoomSize],
          corridorLength: [2, 8],
          dugPercentage: 0.6
        });
        break;
      case 'mine':
        this.map = new ROT.Map.Cellular(this.width, this.height, {
          born: [4, 5, 6, 7, 8],
          survive: [4, 5, 6, 7, 8],
          topology: 4
        });
        break;
      default: // dungeon, crypt, castle
        this.map = new ROT.Map.Digger(this.width, this.height, {
          roomWidth: [config.minRoomSize, config.maxRoomSize],
          roomHeight: [config.minRoomSize, config.maxRoomSize],
          corridorLength: [3, 10],
          dugPercentage: 0.7
        });
    }
  }

  generate(): DungeonLevel {
    const level: DungeonLevel = {
      id: `level_${Date.now()}`,
      level: 1,
      width: this.width,
      height: this.height,
      tiles: [],
      rooms: [],
      corridors: [],
      stairs: {},
      items: [],
      monsters: [],
      traps: [],
      isExplored: false,
      isCompleted: false,
      theme: this.config.theme,
      ambientLight: this.config.lightLevel
    };

    // Generate the base map
    this.map.create((x: number, y: number, value: number) => {
      if (!level.tiles[x]) level.tiles[x] = [];
      
      const tile: DungeonTile = {
        x,
        y,
        type: value === 1 ? 'wall' : 'floor',
        isExplored: false,
        isVisible: false,
        lightLevel: this.config.lightLevel
      };
      
      level.tiles[x][y] = tile;
    });

    // Post-process for special features
    this.addSpecialFeatures(level);
    
    // Generate rooms and corridors
    this.generateRoomsAndCorridors(level);
    
    // Add stairs
    this.addStairs(level);
    
    // Add items
    this.addItems(level);
    
    // Add monsters
    this.addMonsters(level);
    
    // Add traps
    this.addTraps(level);
    
    // Add decorations
    this.addDecorations(level);

    return level;
  }

  private addSpecialFeatures(level: DungeonLevel): void {
    if (this.config.waterFeatures) {
      this.addWaterFeatures(level);
    }
    
    if (this.config.secretPassages) {
      this.addSecretPassages(level);
    }
  }

  private addWaterFeatures(level: DungeonLevel): void {
    const waterCount = Math.floor((this.width * this.height) * 0.05);
    
    for (let i = 0; i < waterCount; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      
      if (level.tiles[x]?.[y] && level.tiles[x][y].type === 'floor') {
        level.tiles[x][y].type = 'water';
        level.tiles[x][y].lightLevel = Math.max(0, level.tiles[x][y].lightLevel - 20);
      }
    }
  }

  private addSecretPassages(level: DungeonLevel): void {
    const secretCount = Math.floor((this.width * this.height) * 0.02);
    
    for (let i = 0; i < secretCount; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      
      if (level.tiles[x]?.[y] && level.tiles[x][y].type === 'wall') {
        level.tiles[x][y].type = 'floor';
        level.tiles[x][y].decoration = 'secret';
      }
    }
  }

  private generateRoomsAndCorridors(level: DungeonLevel): void {
    // Extract rooms from the map
    const rooms = this.map.getRooms();
    
    rooms.forEach((room: any, index: number) => {
      const dungeonRoom: DungeonRoom = {
        id: `room_${index}`,
        x: room.getLeft(),
        y: room.getTop(),
        width: room.getRight() - room.getLeft() + 1,
        height: room.getBottom() - room.getTop() + 1,
        type: this.getRoomType(index, rooms.length),
        isExplored: false,
        isCleared: false,
        contents: [],
        theme: this.config.theme
      };
      
      level.rooms.push(dungeonRoom);
      
      // Mark room tiles as explored
      for (let x = dungeonRoom.x; x <= dungeonRoom.x + dungeonRoom.width - 1; x++) {
        for (let y = dungeonRoom.y; y <= dungeonRoom.y + dungeonRoom.height - 1; y++) {
          if (level.tiles[x]?.[y]) {
            level.tiles[x][y].isExplored = true;
          }
        }
      }
    });

    // Extract corridors
    const corridors = this.map.getCorridors();
    corridors.forEach((corridor: any, index: number) => {
      const points = corridor.getPath();
      const dungeonCorridor: DungeonCorridor = {
        id: `corridor_${index}`,
        points: points.map((point: any) => ({ x: point[0], y: point[1] })),
        isExplored: false,
        type: points.length > 2 ? 'curved' : 'straight'
      };
      
      level.corridors.push(dungeonCorridor);
      
      // Mark corridor tiles as explored
      points.forEach((point: any) => {
        const [x, y] = point;
        if (level.tiles[x]?.[y]) {
          level.tiles[x][y].isExplored = true;
        }
      });
    });
  }

  private getRoomType(index: number, totalRooms: number): DungeonRoom['type'] {
    if (index === 0) return 'entrance';
    if (index === totalRooms - 1) return 'boss';
    
    const rand = Math.random();
    if (rand < 0.1) return 'treasure';
    if (rand < 0.2) return 'shop';
    if (rand < 0.3) return 'library';
    if (rand < 0.4) return 'armory';
    if (rand < 0.5) return 'puzzle';
    if (rand < 0.7) return 'monster';
    return 'rest';
  }

  private addStairs(level: DungeonLevel): void {
    // Find suitable locations for stairs
    const floorTiles: { x: number; y: number }[] = [];
    
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        if (level.tiles[x]?.[y] && level.tiles[x][y].type === 'floor') {
          floorTiles.push({ x, y });
        }
      }
    }
    
    if (floorTiles.length > 0) {
      // Add stairs up (entrance)
      const upStairs = floorTiles[Math.floor(Math.random() * floorTiles.length)];
      level.tiles[upStairs.x][upStairs.y].type = 'stairs_up';
      level.stairs.up = upStairs;
      
      // Add stairs down (exit)
      const downStairs = floorTiles[Math.floor(Math.random() * floorTiles.length)];
      if (downStairs.x !== upStairs.x || downStairs.y !== upStairs.y) {
        level.tiles[downStairs.x][downStairs.y].type = 'stairs_down';
        level.stairs.down = downStairs;
      }
    }
  }

  private addItems(level: DungeonLevel): void {
    const itemCount = Math.floor((this.width * this.height) * this.config.itemDensity);
    
    for (let i = 0; i < itemCount; i++) {
      const item = this.generateRandomItem();
      const position = this.findValidPosition(level, 'item');
      
      if (position) {
        item.x = position.x;
        item.y = position.y;
        level.items.push(item);
        level.tiles[position.x][position.y].hasItem = true;
      }
    }
  }

  private generateRandomItem(): DungeonItem {
    const itemTypes: DungeonItem['type'][] = ['weapon', 'armor', 'consumable', 'treasure', 'food', 'potion'];
    const rarities: DungeonItem['rarity'][] = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
    
    const type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
    const rarity = rarities[Math.floor(Math.random() * rarities.length)];
    
    const baseValue = {
      'common': 10,
      'uncommon': 25,
      'rare': 100,
      'epic': 500,
      'legendary': 2000
    }[rarity];
    
    return {
      id: `item_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: `${rarity} ${type}`,
      description: `A ${rarity} ${type} found in the dungeon`,
      x: 0,
      y: 0,
      type,
      rarity,
      value: baseValue + Math.floor(Math.random() * baseValue),
      isCollected: false,
      stackable: type === 'food' || type === 'potion',
      quantity: 1
    };
  }

  private addMonsters(level: DungeonLevel): void {
    const monsterCount = Math.floor((this.width * this.height) * this.config.monsterDensity);
    
    for (let i = 0; i < monsterCount; i++) {
      const monster = this.generateRandomMonster();
      const position = this.findValidPosition(level, 'monster');
      
      if (position) {
        monster.x = position.x;
        monster.y = position.y;
        level.monsters.push(monster);
        level.tiles[position.x][position.y].hasMonster = true;
      }
    }
  }

  private generateRandomMonster(): DungeonMonster {
    const monsterTypes: DungeonMonster['type'][] = ['normal', 'elite', 'boss', 'minion'];
    const aiTypes: DungeonMonster['ai'][] = ['passive', 'aggressive', 'patrol', 'guard', 'boss'];
    const behaviors: DungeonMonster['behavior'][] = ['wander', 'patrol', 'guard', 'hunt', 'flee'];
    
    const type = monsterTypes[Math.floor(Math.random() * monsterTypes.length)];
    const ai = aiTypes[Math.floor(Math.random() * aiTypes.length)];
    const behavior = behaviors[Math.floor(Math.random() * behaviors.length)];
    
    const level = Math.floor(Math.random() * 10) + 1;
    const hp = level * 10 + Math.floor(Math.random() * 20);
    
    return {
      id: `monster_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: `${type} Monster`,
      description: `A dangerous ${type} monster`,
      x: 0,
      y: 0,
      level,
      hp,
      maxHp: hp,
      stats: {
        str: level + Math.floor(Math.random() * 5),
        mag: level + Math.floor(Math.random() * 5),
        skill: level + Math.floor(Math.random() * 5),
        speed: Math.floor(Math.random() * 5) + 1,
        luck: level + Math.floor(Math.random() * 5) + 1,
        defense: level + Math.floor(Math.random() * 3),
        resistance: level + Math.floor(Math.random() * 3)
      },
      abilities: ['attack'],
      loot: [],
      isAlive: true,
      isAggressive: ai === 'aggressive' || ai === 'boss',
      ai,
      visionRange: 5 + Math.floor(Math.random() * 5),
      movementSpeed: 1 + Math.floor(Math.random() * 2),
      behavior,
      lastAction: 0
    };
  }

  private addTraps(level: DungeonLevel): void {
    const trapCount = Math.floor((this.width * this.height) * this.config.trapDensity);
    
    for (let i = 0; i < trapCount; i++) {
      const trap = this.generateRandomTrap();
      const position = this.findValidPosition(level, 'trap');
      
      if (position) {
        trap.x = position.x;
        trap.y = position.y;
        level.traps.push(trap);
        level.tiles[position.x][position.y].hasTrap = true;
      }
    }
  }

  private generateRandomTrap(): DungeonTrap {
    const trapTypes: DungeonTrap['type'][] = ['damage', 'poison', 'paralyze', 'teleport', 'spawn', 'pit', 'arrow'];
    
    const type = trapTypes[Math.floor(Math.random() * trapTypes.length)];
    const damage = Math.floor(Math.random() * 20) + 5;
    const difficulty = Math.floor(Math.random() * 10) + 5;
    
    return {
      id: `trap_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      name: `${type} Trap`,
      description: `A dangerous ${type} trap`,
      x: 0,
      y: 0,
      type,
      damage,
      isTriggered: false,
      isDisarmed: false,
      difficulty,
      isVisible: Math.random() < 0.3 // 30% chance to be visible
    };
  }

  private addDecorations(level: DungeonLevel): void {
    const decorationCount = Math.floor((this.width * this.height) * 0.03);
    
    for (let i = 0; i < decorationCount; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      
      if (level.tiles[x]?.[y] && level.tiles[x][y].type === 'floor') {
        const decorations = ['bones', 'rubble', 'torch', 'pillar', 'altar', 'fountain'];
        const decoration = decorations[Math.floor(Math.random() * decorations.length)];
        level.tiles[x][y].decoration = decoration;
        
        // Torches provide light
        if (decoration === 'torch') {
          level.tiles[x][y].lightLevel = Math.min(100, level.tiles[x][y].lightLevel + 30);
        }
      }
    }
  }

  private findValidPosition(level: DungeonLevel, type: 'item' | 'monster' | 'trap'): { x: number; y: number } | null {
    const attempts = 100;
    
    for (let i = 0; i < attempts; i++) {
      const x = Math.floor(Math.random() * this.width);
      const y = Math.floor(Math.random() * this.height);
      
      if (level.tiles[x]?.[y] && 
          level.tiles[x][y].type === 'floor' && 
          !level.tiles[x][y].hasItem && 
          !level.tiles[x][y].hasMonster && 
          !level.tiles[x][y].hasTrap) {
        return { x, y };
      }
    }
    
    return null;
  }
}

// Dungeon quest generation
export function generateDungeonQuest(notoriety: number, day: number): DungeonQuest {
  const questTypes: DungeonQuest['type'][] = ['explore', 'clear', 'retrieve', 'defeat_boss', 'solve_puzzle', 'rescue', 'escort'];
  const themes: DungeonQuest['theme'][] = ['cave', 'dungeon', 'temple', 'tower', 'crypt', 'mine', 'castle'];
  
  const type = questTypes[Math.floor(Math.random() * questTypes.length)];
  const theme = themes[Math.floor(Math.random() * themes.length)];
  const difficulty = Math.max(1, Math.min(20, Math.floor(notoriety / 5) + Math.floor(Math.random() * 10) + 1));
  
  // Generate dungeon config based on difficulty and theme
  const config: DungeonGenerationConfig = {
    width: 40 + Math.floor(difficulty * 2),
    height: 30 + Math.floor(difficulty * 2),
    roomCount: 5 + Math.floor(difficulty / 2),
    minRoomSize: 3,
    maxRoomSize: 8 + Math.floor(difficulty / 3),
    corridorChance: 0.7,
    monsterDensity: 0.02 + (difficulty * 0.001),
    itemDensity: 0.01 + (difficulty * 0.0005),
    trapDensity: 0.005 + (difficulty * 0.0003),
    difficulty,
    theme,
    lightLevel: theme === 'cave' || theme === 'mine' ? 30 : 70,
    secretPassages: difficulty > 10,
    waterFeatures: theme === 'cave' || theme === 'mine'
  };
  
  return {
    id: `dungeon_quest_${Date.now()}`,
    name: `${theme.charAt(0).toUpperCase() + theme.slice(1)} ${type} Quest`,
    description: `Explore the ${theme} and complete your mission`,
    type,
    target: 'dungeon',
    difficulty,
    theme,
    reward: {
      experience: difficulty * 100,
      gold: difficulty * 50,
      items: [],
      reputation: difficulty * 2
    },
    requirements: {
      level: Math.max(1, Math.floor(difficulty / 3)),
      partySize: Math.max(1, Math.floor(difficulty / 5)),
      items: []
    },
    dungeonConfig: config,
    isCompleted: false,
    timeLimit: 7 + Math.floor(difficulty / 2)
  };
}

// Utility functions
export function createDungeonState(quest: DungeonQuest, party: Member[]): DungeonState {
  const generator = new DungeonGenerator(quest.dungeonConfig);
  const level = generator.generate();
  
  return {
    id: `dungeon_${Date.now()}`,
    questId: quest.id,
    questName: quest.name,
    party,
    currentLevel: 1,
    levels: [level],
    playerPosition: { x: level.stairs.up?.x || 1, y: level.stairs.up?.y || 1 },
    playerStats: {
      hp: party[0]?.hp || 100,
      maxHp: party[0]?.hpMax || 100,
      mp: party[0]?.mp || 50,
      maxMp: party[0]?.mpMax || 50,
      experience: party[0]?.experience || 0,
      level: party[0]?.level || 1
    },
    inventory: [],
    discoveredSecrets: [],
    isActive: true,
    startDay: Date.now(),
    currentDay: Date.now(),
    turns: 0,
    status: 'exploring',
    automap: {
      exploredTiles: new Set(),
      discoveredRooms: new Set(),
      discoveredItems: new Set(),
      discoveredMonsters: new Set(),
      discoveredTraps: new Set(),
      notes: new Map(),
      markers: new Map(),
      level: 1
    },
    fogOfWar: true,
    lightRadius: 6
  };
}
