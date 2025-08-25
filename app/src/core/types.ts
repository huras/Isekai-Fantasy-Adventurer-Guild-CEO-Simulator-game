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


