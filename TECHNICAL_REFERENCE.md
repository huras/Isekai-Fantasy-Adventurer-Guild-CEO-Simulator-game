# Technical Reference & Implementation Details

## Game Architecture

### Technology Stack
- **Frontend**: React 18 with TypeScript 5
- **Build Tool**: Vite 5
- **UI Framework**: Bootstrap 5
- **State Management**: Custom store with React Context
- **Data Format**: JSON-based content system

### Project Structure
```
app/
├── src/
│   ├── core/           # Game logic and systems
│   ├── ui/            # React components and UI
│   ├── lib/           # Utility libraries
│   └── main.tsx       # Application entry point
├── public/
│   ├── items/         # Game data and assets
│   ├── adventurers/   # Character portraits
│   └── saves/         # Save game files
└── scripts/           # Development tools
```

## Core Systems Architecture

### State Management
The game uses a centralized state management system with the following key components:

#### GameState Interface
```typescript
type GameState = {
  // Core progression
  day: number;
  week: number;
  money: number;
  notoriety: number;
  guildLevel: number;
  reputation: number;
  influence: number;
  
  // Entities
  members: Member[];
  candidates: Candidate[];
  quests: Quest[];
  activeMissions: ActiveMission[];
  
  // Systems
  facilities: GuildFacility[];
  upgrades: GuildUpgrade[];
  achievements: Achievement[];
  goals: GameGoal[];
  
  // UI state
  battle?: BattleState;
  tutorial: TutorialState;
}
```

#### Store Implementation
- **StoreProvider**: React Context provider for global state
- **useStore**: Hook for accessing and modifying game state
- **Emit System**: Event-driven updates for reactive UI
- **Persistence**: Save/load functionality via JSON export/import

### Core Game Systems

#### 1. Quest System (`core/quests.ts`)
**Purpose**: Manages quest generation, assignment, and execution

**Key Functions**:
- `generateQuestList()`: Creates new quests based on notoriety and day
- `assignMember()`: Assigns adventurers to quests
- `runQuest()`: Executes quest logic and determines outcomes
- `calculateQuestSuccessRate()`: Determines success probability

**Quest Generation Algorithm**:
```typescript
function proceduralQuest(notoriety: number, day: number): Quest {
  const job = randomOf(['Find', 'Deliver', 'Escort', 'Protect', 'Kill']);
  const target = selectTargetForJob(job);
  const rank = randomRankForNotoriety(notoriety);
  const difficulty = calculateDifficulty(rank);
  const duration = calculateDuration(difficulty);
  
  return {
    id: generateId(),
    name: generateQuestName(job, target),
    job,
    target,
    diff: difficulty,
    rank,
    daysRequired: duration,
    // ... other properties
  };
}
```

#### 2. Economy System (`core/economy.ts`)
**Purpose**: Manages financial operations and market dynamics

**Key Components**:
- **EconomyManager**: Singleton class for economic calculations
- **Market Trends**: Dynamic price fluctuations
- **Income Calculation**: Multi-source revenue streams
- **Cost Management**: Expense tracking and optimization

**Income Calculation**:
```typescript
calculateDailyIncome(state: GameState): number {
  let income = 0;
  
  // Base guild income (reputation-based)
  income += Math.floor(state.reputation * 100);
  
  // Facility income
  state.facilities.forEach(facility => {
    if (facility.isBuilt) {
      const incomeEffect = facility.effects.find(e => e.type === 'income_bonus');
      if (incomeEffect) {
        income += incomeEffect.value * facility.level;
      }
    }
  });
  
  // Quest completion bonuses
  income += state.guildStats.consecutiveSuccessfulQuests * 50;
  
  return Math.floor(income);
}
```

#### 3. Guild Management (`core/guild.ts`)
**Purpose**: Manages guild facilities, upgrades, and progression

**Key Features**:
- **Facility System**: Building construction and upgrades
- **Upgrade Management**: Unlockable improvements
- **Achievement System**: Milestone tracking
- **Goal Management**: Long-term objectives

**Facility Effects System**:
```typescript
type FacilityEffect = {
  type: 'upkeep_reduction' | 'quest_success_bonus' | 
        'recruit_bonus' | 'training_bonus' | 'income_bonus';
  value: number;
  description: string;
}
```

#### 4. Recruitment System (`core/recruitment.ts`)
**Purpose**: Generates and manages candidate recruitment

**Key Features**:
- **Procedural Generation**: Unique candidates each week
- **Quality Scaling**: Better candidates as reputation increases
- **Class Distribution**: Balanced character class availability
- **Personality System**: Varied character traits

**Candidate Generation**:
```typescript
export async function generateCandidates(notoriety: number, week: number): Promise<Candidate[]> {
  const baseCount = 3 + Math.floor(notoriety / 10);
  const count = Math.min(10, Math.max(3, baseCount));
  
  // Generate candidates with scaling quality
  for (let i = 0; i < count; i++) {
    const talent = Math.max(1, Math.min(10, 1 + Math.floor(notoriety / 10) + Math.floor(Math.random() * 4) - 1));
    // ... generate individual candidate
  }
}
```

#### 5. Leveling System (`core/leveling.ts`)
**Purpose**: Manages character progression and stat growth

**Key Features**:
- **Experience Curves**: Multiple progression speeds (fast, normal, slow, erratic)
- **Stat Growth**: Automatic stat increases on level up
- **HP/MP Scaling**: Vital stat progression
- **Skill Development**: Unlockable abilities

**Experience Calculation**:
```typescript
const EXPERIENCE_CURVES: Record<ExperienceCurve, (level: number) => number> = {
  fast: (level: number) => Math.floor(level * level * 50),
  normal: (level: number) => Math.floor(level * level * 100),
  slow: (level: number) => Math.floor(level * level * 200),
  erratic: (level: number) => {
    if (level % 3 === 0) return Math.floor(level * level * 75);
    if (level % 5 === 0) return Math.floor(level * level * 300);
    return Math.floor(level * level * 150);
  }
}
```

#### 6. Dating System (`core/dating.ts`)
**Purpose**: Manages romantic relationships and heart progression

**Key Features**:
- **Heart Level System**: 0-10 heart progression with visual indicators
- **Romantic Actions**: Various activities with costs, cooldowns, and heart gains
- **Character Preferences**: Class and personality-based gift preferences
- **Relationship Status**: Single → Dating → Engaged → Married progression
- **Special Events**: Valentine's Day and birthday bonuses

**Core Functions**:
- `initializeDatingSystem()`: Sets up dating system state
- `performDatingAction()`: Executes romantic actions and calculates results
- `processHeartDecay()`: Handles relationship deterioration over time
- `checkSpecialEvents()`: Triggers special romantic occasions

## Data Structures

### Character System

#### Member Interface
```typescript
type Member = {
  // Identity
  id: string;
  name: string;
  class: string;
  personality: string;
  gender?: 'male' | 'female';
  
  // Stats
  stats: Stats;
  hp: number;
  hpMax: number;
  speed: number;
  
  // Progression
  level: number;
  experience: number;
  experienceCurve: ExperienceCurve;
  trainingLevel: number;
  loyalty: number;
  
  // Equipment
  items?: InventoryItem[];
  equippedInstanceIds?: string[];
  activeBuffs?: ActiveBuff[];
}
```

#### Stats Interface
```typescript
type Stats = {
  str: number;      // Physical attack power
  mag: number;      // Magical attack power
  skill: number;    // Accuracy and critical hits
  speed: number;    // Movement and initiative
  luck: number;     // Random event outcomes
  defense: number;  // Physical damage reduction
  resistance: number; // Magical damage reduction
}
```

### Quest System

#### Quest Interface
```typescript
type Quest = {
  id: string;
  name: string;
  desc?: string;
  job: JobKind;
  target: TargetKind;
  diff: number;
  rank?: DifficultyRank;
  reward: number;
  fame: number;
  daysRequired: number;
  expiresOnDay: number;
  assigned?: Member[];
  tags?: string[];
}
```

#### ActiveMission Interface
```typescript
type ActiveMission = {
  id: string;
  questId: string;
  questName: string;
  party: Member[];
  dayStarted: number;
  endOnDay: number;
  battlesPlanned: number;
  battlesCleared: number;
  successChance: number;
  riskAssessment: 'low' | 'medium' | 'high' | 'extreme';
}
```

### Facility System

#### GuildFacility Interface
```typescript
type GuildFacility = {
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
```

### Dating System

#### RomanticInterest Interface
```typescript
type RomanticInterest = {
  id: string;
  memberId: string;
  heartLevel: HeartLevel; // 0-10
  heartProgress: number; // 0-100 progress to next heart
  datingStatus: DatingStatus; // 'single' | 'dating' | 'engaged' | 'married'
  relationshipStartDay?: number;
  lastInteractionDay?: number;
  totalInteractions: number;
  favoriteGifts: string[]; // Item IDs they love
  dislikedGifts: string[]; // Item IDs they hate
  personalityTraits: string[]; // What they like/dislike
  romanceEvents: RomanceEvent[];
}
```

#### DatingAction Interface
```typescript
type DatingAction = {
  id: string;
  name: string;
  description: string;
  heartGain: number;
  cost: number; // Gold cost
  requirements: DatingActionRequirement[];
  cooldownDays: number; // Days before can be used again
  isAvailable: (member: Member, romanticInterest: RomanticInterest) => boolean;
}
```

#### DatingSystem Interface
```typescript
type DatingSystem = {
  romanticInterests: RomanticInterest[];
  availableActions: DatingAction[];
  marriageEnabled: boolean;
  childrenEnabled: boolean;
  maxRomanticInterests: number;
  heartDecayRate: number; // Hearts lost per day without interaction
  specialEvents: DatingSpecialEvent[];
}
```

## UI Component Architecture

### Component Hierarchy
```
App
├── Header (Save/Load/Reset controls)
├── Tabs (Main navigation)
│   ├── Dashboard (Overview and stats)
│   ├── Guild (Member management)
│   ├── Recruitment (Candidate evaluation)
│   ├── Quests (Quest management)
│   ├── Shop (Item trading)
│   ├── Dating (Romance and relationships)
│   └── Events (Special events)
├── NextDayFAB (Time progression)
└── BattleModal (Combat interface)
```

### Key UI Components

#### Quests Component
- **Quest Cards**: Individual quest display with assignment controls
- **Member Assignment**: Drag-and-drop or dropdown assignment
- **Success Rate Display**: Visual probability indicators
- **Quest Management**: Run, refresh, and organize quests

#### Recruitment Component
- **Candidate Cards**: Individual candidate evaluation
- **Stat Comparison**: Visual stat analysis
- **Contract Negotiation**: Salary and terms discussion
- **Team Planning**: Future recruitment strategy

#### Guild Management Component
- **Member Overview**: Team status and health
- **Training Interface**: Skill development controls
- **Facility Management**: Building construction and upgrades
- **Goal Tracking**: Progress toward objectives

#### Dating Component
- **Romantic Interest Display**: Shows all potential and current romantic interests
- **Heart Level Visualization**: Visual heart level indicators and progress bars
- **Action Selection**: Interface for choosing romantic activities
- **Relationship Management**: Start dating, perform actions, and track progress

## Data Flow

### State Update Flow
1. **User Action**: Player interacts with UI component
2. **Action Handler**: Component calls appropriate function
3. **State Modification**: Core system updates game state
4. **Emit Event**: Store emits update event
5. **UI Update**: Components re-render with new data

### Example: Quest Assignment
```typescript
// 1. User clicks assign button
function assign(qid: string, mid: string) {
  // 2. Call core system
  assignMember(state, qid, mid);
  // 3. Emit update
  emit();
}

// 4. UI automatically re-renders with new assignment
```

## Performance Considerations

### Optimization Strategies
1. **Memoization**: Use `useMemo` for expensive calculations
2. **Component Splitting**: Break large components into smaller pieces
3. **Lazy Loading**: Load data only when needed
4. **Efficient Rendering**: Minimize unnecessary re-renders

### Memory Management
1. **Object Pooling**: Reuse objects where possible
2. **Garbage Collection**: Clean up unused references
3. **State Normalization**: Avoid duplicate data storage
4. **Efficient Updates**: Batch state changes when possible

## Save System

### Save Format
- **JSON-based**: Human-readable save files
- **Complete State**: All game data preserved
- **Versioning**: Support for save file compatibility
- **Compression**: Optional save file compression

### Save Operations
```typescript
// Save game state
function saveGame(state: GameState): string {
  const saveData = {
    version: SAVE_VERSION,
    timestamp: Date.now(),
    state: state
  };
  return JSON.stringify(saveData, null, 2);
}

// Load game state
function loadGame(saveData: string): GameState {
  const parsed = JSON.parse(saveData);
  return validateAndMigrateSave(parsed);
}
```

## Development Tools

### Scripts and Utilities
1. **Tileset Generator**: Converts image files to JSON metadata
2. **Save Validator**: Ensures save file integrity
3. **Performance Profiler**: Monitors game performance
4. **Debug Console**: Development-time debugging tools

### Testing and Validation
1. **Type Safety**: Full TypeScript coverage
2. **Data Validation**: Runtime data integrity checks
3. **Error Handling**: Graceful failure recovery
4. **Logging**: Comprehensive event logging

## Future Technical Considerations

### Scalability
1. **Modular Architecture**: Easy to add new systems
2. **Plugin System**: Extensible functionality
3. **Performance Monitoring**: Real-time performance tracking
4. **Optimization Tools**: Automated performance analysis

### Extensibility
1. **Content Packs**: Easy addition of new content
2. **Modding Support**: User-created content
3. **API Integration**: External service connections
4. **Multiplayer Foundation**: Architecture ready for expansion

---

*This technical reference provides developers and technically-minded players with a comprehensive understanding of how the game systems work under the hood. The architecture is designed for maintainability, extensibility, and performance.*

