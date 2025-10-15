export type Stats = { 
  str: number;    // Affects damage the unit deals with physical attacks
  mag: number;    // Affects damage the unit deals with magical attacks  
  skill: number;  // Affects hit rate and the frequency of critical hits
  speed: number;  // Affects traveling times
  luck: number;   // Has various effects (each skill or status effect may use for calculations)
  defense: number; // Reduces damage from physical attacks
  resistance: number; // Reduces damage from magical attacks
  hp?: number; 
};

export type ExperienceCurve = 'fast' | 'normal' | 'slow' | 'erratic'

export type DifficultyRank = 'H' | 'G' | 'F' | 'E' | 'D' | 'C' | 'B' | 'A' | 'S'
export type JobKind = 'Find' | 'Deliver' | 'Escort' | 'Protect' | 'Kill'
export type TargetKind = 'Person' | 'Monster' | 'Item' | 'Location'

// New types for tycoon mechanics
export type GuildFacility = {
  id: string;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  baseCost: number;
  upgradeCost: number;
  effects: FacilityEffect[];
  isBuilt: boolean;
  maintenanceCost: number;
}

export type FacilityEffect = {
  type: 'upkeep_reduction' | 'quest_success_bonus' | 'recruit_bonus' | 'training_bonus' | 'income_bonus';
  value: number;
  description: string;
}

export type GuildUpgrade = {
  id: string;
  name: string;
  description: string;
  cost: number;
  isPurchased: boolean;
  effects: FacilityEffect[];
  requirements: UpgradeRequirement[];
}

export type UpgradeRequirement = {
  type: 'facility_level' | 'member_count' | 'notoriety' | 'money' | 'quests_completed';
  value: number;
  target?: string; // For facility_level requirements
}

export type Achievement = {
  id: string;
  name: string;
  description: string;
  isUnlocked: boolean;
  unlockedAt?: number;
  reward?: AchievementReward;
  progress: number;
  maxProgress: number;
}

export type AchievementReward = {
  type: 'money' | 'notoriety' | 'item' | 'facility_unlock';
  value: number;
  itemId?: string;
  facilityId?: string;
}

export type QuestChain = {
  id: string;
  name: string;
  description: string;
  currentStep: number;
  totalSteps: number;
  quests: string[]; // Quest IDs in order
  rewards: QuestChainReward;
  isCompleted: boolean;
  startedAt: number;
}

export type QuestChainReward = {
  money: number;
  notoriety: number;
  items: string[];
  facilityUnlock?: string;
}

export type GuildStats = {
  totalQuestsCompleted: number;
  totalMoneyEarned: number;
  totalMembersRecruited: number;
  totalMembersLost: number;
  longestQuestChain: number;
  highestRankQuest: DifficultyRank;
  daysSinceLastLoss: number;
  consecutiveSuccessfulQuests: number;
}

export type BattleActor = {
  id: string;
  name: string;
  hp: number;
  hpMax: number;
  mp?: number;
  mpMax?: number;
  // lightweight power for damage calc
  power?: number;
}

export type BattleState = {
  missionId: string;
  questName: string;
  diff: number;
  wave: number; // current wave index starting at 1
  wavesTotal: number;
  allies: BattleActor[];
  enemies: BattleActor[];
  turnSide: 'ally' | 'enemy';
  turnIndex: number; // index within current side
  log: string[];
}

export type Member = {
  id: string;
  name: string;
  class: string;
  personality: string;
  gender?: 'male' | 'female';
  appearance?: string;
  avatar?: string | null;
  upkeep: number;
  stats: Stats;
  hpMax: number;
  hp: number;
  mpMax?: number;
  mp?: number;
  speed: number;
  skills: string[];
  isPlayer?: boolean;
  // Equipment and inventory
  items?: InventoryItem[]; // max 12, references to catalog items
  equippedInstanceIds?: string[]; // instance ids currently equipped (per specific item copy)
  activeBuffs?: ActiveBuff[]; // time-limited stat modifiers
  fedOnDay?: number; // breakfast day marker
  // Progression
  level: number;
  experience: number;
  experienceCurve: ExperienceCurve;
  baseLevel?: number;
  baseExp?: number;
  classLevel?: number;
  classExp?: number;
  skillLevels?: Record<string, number>;
  skillExp?: Record<string, number>;
  alive?: boolean;
  // New tycoon mechanics
  loyalty: number; // 0-100, affects performance and chance to leave
  trainingLevel: number; // 0-5, affects quest success rate
  lastTrainingDay?: number;
  questsCompleted: number;
  questsFailed: number;
  totalEarnings: number;
  isRetired?: boolean;
  retirementDay?: number;
}

export type Candidate = {
  id: string;
  name: string;
  class: string;
  personality: string;
  gender?: 'male' | 'female';
  appearance?: string;
  avatar?: string | null;
  stats: Stats;
  upkeep: number;
  skills: string[];
  weekAppeared: number;
  expiresOnWeek: number;
  // Temporary: starter inventory for preview/acceptance
  starterItems?: InventoryItem[];
  // New tycoon mechanics
  potential: number; // 1-10, affects growth rate
  loyalty: number; // 0-100, affects chance to accept offer
  askingSalary: number; // Negotiable salary
  experience: number; // Years of experience
  reputation: number; // 0-100, affects quest success
};

export type Quest = {
  id: string;
  name: string;
  desc?: string;
  diff: number;
  rank?: DifficultyRank;
  reward: number;
  fame: number;
  day: number;
  expiresOnDay: number;
  assigned?: Member[];
  tags?: string[];
  job: JobKind;
  target: TargetKind;
  daysRequired: number;
  // New tycoon mechanics
  chainId?: string; // If part of a quest chain
  chainStep?: number; // Step in the chain
  difficulty: number; // 1-20 scale
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  specialRewards?: SpecialReward[];
  requirements?: QuestRequirement[];
  isEpic?: boolean; // Special high-value quests
  epicReward?: EpicReward;
};

export type SpecialReward = {
  type: 'item' | 'facility' | 'upgrade' | 'member';
  itemId?: string;
  facilityId?: string;
  upgradeId?: string;
  memberId?: string;
  description: string;
}

export type QuestRequirement = {
  type: 'member_count' | 'member_level' | 'facility_level' | 'guild_level';
  value: number;
  description: string;
}

export type EpicReward = {
  money: number;
  notoriety: number;
  items: string[];
  facilityUnlock?: string;
  title?: string;
}

export type ActiveMission = {
  id: string;
  questId: string;
  questName: string;
  party: Member[];
  dayStarted: number;
  endOnDay: number;
  battlesPlanned: number;
  battlesCleared: number;
  reward: number;
  fame: number;
  log: string[];
  // New tycoon mechanics
  successChance: number; // 0-100, calculated from party stats and quest difficulty
  riskAssessment: 'low' | 'medium' | 'high' | 'extreme';
  estimatedProfit: number;
  actualProfit?: number;
  isCompleted?: boolean;
  completionDay?: number;
  failureReason?: string;
};

export type InventoryItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  value: number;
  stackable: boolean;
  quantity: number;
  maxQuantity: number;
  // New tycoon mechanics
  durability?: number;
  maxDurability?: number;
  enchantments?: Enchantment[];
  isEquipped?: boolean;
  equippedBy?: string; // Member ID
  slot?: 'weapon' | 'armor' | 'accessory' | 'consumable';
  stats?: Partial<Stats>;
  effects?: ItemEffect[];
};

export type Enchantment = {
  type: string;
  value: number;
  description: string;
}

export type ItemEffect = {
  type: 'stat_boost' | 'skill_boost' | 'special_ability';
  target: string;
  value: number;
  duration?: number; // In days
  description: string;
}

export type ActiveBuff = {
  id: string;
  name: string;
  description: string;
  type: 'stat_boost' | 'skill_boost' | 'special_ability';
  target: string;
  value: number;
  expiresAt: number;
  source: 'item' | 'facility' | 'training' | 'quest';
};

export type ShopItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  basePrice: number;
  currentPrice: number;
  stock: number;
  maxStock: number;
  // New tycoon mechanics
  demand: number; // 0-100, affects price fluctuations
  supply: number; // 0-100, affects availability
  priceHistory: PricePoint[];
  isLimited?: boolean; // Limited time availability
  expiresAt?: number;
  bulkDiscount?: number; // Percentage discount for buying multiple
};

export type PricePoint = {
  day: number;
  price: number;
}

export type GameState = {
  day: number;
  week: number;
  money: number;
  notoriety: number;
  members: Member[];
  candidates: Candidate[];
  quests: Quest[];
  activeMissions: ActiveMission[];
  inventory: InventoryItem[];
  shop: ShopItem[];
  itemsCatalog: InventoryItem[];
  itemsLoaded: boolean;
  kitchen: { foodStorage: InventoryItem[]; waitingForBreakfast: Member[] };
  logs: { events: string[]; battle: string[] };
  archives: { quests: Quest[]; candidates: Candidate[]; fallen: Member[] };
  modifiers: { upkeepDeltaPerMember: number; questSuccessBonus: number; recruitStatBonus: number };
  settings: { autoAssign: boolean };
  // New tycoon mechanics
  guildLevel: number;
  guildExp: number;
  guildExpToNext: number;
  facilities: GuildFacility[];
  upgrades: GuildUpgrade[];
  achievements: Achievement[];
  questChains: QuestChain[];
  guildStats: GuildStats;
  reputation: number; // 0-100, affects quest availability and rewards
  influence: number; // 0-100, affects political power and special quests
  marketTrends: MarketTrend[];
  events: GameEvent[];
  goals: GameGoal[];
  tutorial: TutorialState;
  // Dating system
  datingSystem: DatingSystem;
  // Dungeon system
  dungeonQuests: DungeonQuest[];
  activeDungeon?: DungeonState;
};

export type MarketTrend = {
  category: string;
  trend: 'rising' | 'falling' | 'stable';
  change: number; // Percentage change
  duration: number; // Days this trend will last
  description: string;
}

export type GameEvent = {
  id: string;
  name: string;
  description: string;
  type: 'opportunity' | 'challenge' | 'disaster' | 'windfall';
  effects: EventEffect[];
  duration: number; // Days the event lasts
  startDay: number;
  requirements?: EventRequirement[];
  choices?: EventChoice[];
}

export type EventEffect = {
  type: 'money' | 'notoriety' | 'reputation' | 'influence' | 'member_morale';
  value: number;
  description: string;
}

export type EventRequirement = {
  type: 'facility_level' | 'member_count' | 'money' | 'reputation';
  value: number;
}

export type EventChoice = {
  id: string;
  text: string;
  effects: EventEffect[];
  requirements?: EventRequirement[];
  consequences: string;
}

export type GameGoal = {
  id: string;
  name: string;
  description: string;
  type: 'short_term' | 'medium_term' | 'long_term';
  target: number;
  current: number;
  reward: GoalReward;
  isCompleted: boolean;
  deadline?: number;
}

export type GoalReward = {
  money: number;
  notoriety: number;
  reputation: number;
  influence: number;
  items: string[];
  facilityUnlock?: string;
}

export type TutorialState = {
  currentStep: number;
  completedSteps: string[];
  isActive: boolean;
  currentTip?: string;
}

// Dungeon Crawling System Types
export type DungeonTile = {
  x: number;
  y: number;
  type: 'floor' | 'wall' | 'door' | 'stairs_up' | 'stairs_down' | 'water' | 'lava' | 'chasm' | 'corridor';
  isExplored: boolean;
  isVisible: boolean;
  hasItem?: boolean;
  hasMonster?: boolean;
  hasTrap?: boolean;
  decoration?: string;
  lightLevel: number; // 0-100 for lighting effects
}

export type DungeonRoom = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'entrance' | 'treasure' | 'monster' | 'boss' | 'puzzle' | 'rest' | 'shop' | 'library' | 'armory';
  isExplored: boolean;
  isCleared: boolean;
  contents: string[];
  theme: 'dungeon' | 'cave' | 'temple' | 'tower' | 'crypt' | 'mine' | 'castle';
}

export type DungeonCorridor = {
  id: string;
  points: Array<{ x: number; y: number }>;
  isExplored: boolean;
  type: 'straight' | 'curved' | 'intersection';
}

export type DungeonItem = {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  type: 'weapon' | 'armor' | 'consumable' | 'treasure' | 'key' | 'quest' | 'food' | 'potion';
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  value: number;
  isCollected: boolean;
  effects?: ItemEffect[];
  questId?: string;
  sprite?: string;
  stackable: boolean;
  quantity: number;
}

export type DungeonMonster = {
  id: string;
  name: string;
  type: 'normal' | 'elite' | 'boss' | 'minion';
  x: number;
  y: number;
  level: number;
  hp: number;
  maxHp: number;
  stats: Stats;
  abilities: string[];
  loot: string[];
  isAlive: boolean;
  isAggressive: boolean;
  ai: 'passive' | 'aggressive' | 'patrol' | 'guard' | 'boss';
  visionRange: number;
  movementSpeed: number;
  sprite?: string;
  behavior: 'wander' | 'patrol' | 'guard' | 'hunt' | 'flee';
  lastAction: number;
  targetId?: string;
}

export type DungeonTrap = {
  id: string;
  name: string;
  description: string;
  x: number;
  y: number;
  type: 'damage' | 'poison' | 'paralyze' | 'teleport' | 'spawn' | 'pit' | 'arrow';
  damage: number;
  isTriggered: boolean;
  isDisarmed: boolean;
  difficulty: number; // DC to disarm
  isVisible: boolean;
  sprite?: string;
}

export type DungeonState = {
  id: string;
  questId: string;
  questName: string;
  party: Member[];
  currentLevel: number;
  levels: DungeonLevel[];
  playerPosition: { x: number; y: number };
  playerStats: {
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    experience: number;
    level: number;
  };
  inventory: DungeonItem[];
  discoveredSecrets: string[];
  isActive: boolean;
  startDay: number;
  currentDay: number;
  turns: number;
  status: 'exploring' | 'combat' | 'puzzle' | 'completed' | 'failed';
  automap: AutomapData;
  fogOfWar: boolean;
  lightRadius: number;
}

export type DungeonLevel = {
  id: string;
  level: number;
  width: number;
  height: number;
  tiles: DungeonTile[][];
  rooms: DungeonRoom[];
  corridors: DungeonCorridor[];
  stairs: {
    up?: { x: number; y: number };
    down?: { x: number; y: number };
  };
  items: DungeonItem[];
  monsters: DungeonMonster[];
  traps: DungeonTrap[];
  isExplored: boolean;
  isCompleted: boolean;
  theme: 'dungeon' | 'cave' | 'temple' | 'tower' | 'crypt' | 'mine' | 'castle';
  ambientLight: number;
}

export type AutomapData = {
  exploredTiles: Set<string>; // "x,y" format
  discoveredRooms: Set<string>;
  discoveredItems: Set<string>;
  discoveredMonsters: Set<string>;
  discoveredTraps: Set<string>;
  notes: Map<string, string>; // "x,y" -> note text
  markers: Map<string, string>; // "x,y" -> marker type
  level: number;
}

export type DungeonGenerationConfig = {
  width: number;
  height: number;
  roomCount: number;
  minRoomSize: number;
  maxRoomSize: number;
  corridorChance: number;
  monsterDensity: number;
  itemDensity: number;
  trapDensity: number;
  difficulty: number;
  theme: 'cave' | 'dungeon' | 'temple' | 'tower' | 'crypt' | 'mine' | 'castle';
  lightLevel: number;
  secretPassages: boolean;
  waterFeatures: boolean;
}

export type DungeonAction = {
  type: 'move' | 'attack' | 'use_item' | 'interact' | 'rest' | 'flee' | 'search' | 'open_door' | 'climb_stairs';
  target?: { x: number; y: number } | string;
  itemId?: string;
  direction?: 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
  position?: { x: number; y: number };
}

export type DungeonCombat = {
  id: string;
  player: Member;
  monster: DungeonMonster;
  turn: 'player' | 'monster';
  playerActions: string[];
  monsterActions: string[];
  log: string[];
  isActive: boolean;
  round: number;
  initiative: number[];
}

export type DungeonQuest = {
  id: string;
  name: string;
  description: string;
  type: 'explore' | 'clear' | 'retrieve' | 'defeat_boss' | 'solve_puzzle' | 'rescue' | 'escort';
  target: string;
  difficulty: number;
  theme: 'cave' | 'dungeon' | 'temple' | 'tower' | 'crypt' | 'mine' | 'castle';
  reward: {
    experience: number;
    gold: number;
    items: string[];
    reputation: number;
  };
  requirements: {
    level: number;
    partySize: number;
    items: string[];
  };
  dungeonConfig: DungeonGenerationConfig;
  isCompleted: boolean;
  completionDay?: number;
  timeLimit?: number; // Days to complete
  specialConditions?: string[];
}

export type DungeonEvent = {
  id: string;
  type: 'monster_encounter' | 'trap_triggered' | 'item_found' | 'room_discovered' | 'stairs_found' | 'secret_revealed';
  description: string;
  position: { x: number; y: number };
  level: number;
  turn: number;
  data?: any;
}

// Dating System Types
export type HeartLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10

export type DatingStatus = 'single' | 'dating' | 'engaged' | 'married'

export type RomanticInterest = {
  id: string;
  memberId: string;
  heartLevel: HeartLevel;
  heartProgress: number; // 0-100 progress to next heart level
  datingStatus: DatingStatus;
  relationshipStartDay?: number;
  lastInteractionDay?: number;
  totalInteractions: number;
  favoriteGifts: string[]; // Item IDs they love
  dislikedGifts: string[]; // Item IDs they hate
  personalityTraits: string[]; // What they like/dislike
  romanceEvents: RomanceEvent[];
  marriageProposalDay?: number;
  weddingDay?: number;
}

export type RomanceEvent = {
  id: string;
  type: 'gift' | 'conversation' | 'date' | 'quest_together' | 'proposal' | 'wedding';
  day: number;
  description: string;
  heartGain: number;
  itemId?: string; // For gift events
}

export type DatingAction = {
  id: string;
  name: string;
  description: string;
  heartGain: number;
  cost: number; // Gold cost
  requirements: DatingActionRequirement[];
  cooldownDays: number; // Days before can be used again
  isAvailable: (member: Member, romanticInterest: RomanticInterest) => boolean;
}

export type DatingActionRequirement = {
  type: 'heart_level' | 'dating_status' | 'item_owned' | 'facility_level' | 'guild_level';
  value: number | string;
  description: string;
}

export type DatingSystem = {
  romanticInterests: RomanticInterest[];
  availableActions: DatingAction[];
  marriageEnabled: boolean;
  childrenEnabled: boolean;
  maxRomanticInterests: number;
  heartDecayRate: number; // Hearts lost per day without interaction
  specialEvents: DatingSpecialEvent[];
}

export type DatingSpecialEvent = {
  id: string;
  name: string;
  description: string;
  triggerCondition: (gameState: GameState) => boolean;
  effects: DatingEventEffect[];
  choices?: DatingEventChoice[];
  isOneTime: boolean;
  hasOccurred: boolean;
}

export type DatingEventEffect = {
  type: 'heart_gain' | 'heart_loss' | 'relationship_change' | 'item_reward' | 'money_cost';
  value: number;
  target?: string; // Member ID or 'all'
  description: string;
}

export type DatingEventChoice = {
  id: string;
  text: string;
  effects: DatingEventEffect[];
  requirements?: DatingActionRequirement[];
  consequences: string;
}


