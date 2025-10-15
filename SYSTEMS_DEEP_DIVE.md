# Systems Deep Dive: Detailed Mechanics & Algorithms

## Quest System Deep Dive

### Quest Generation Algorithm

#### Difficulty Calculation
The quest difficulty system uses a sophisticated algorithm that scales with guild notoriety:

```typescript
function randomRankForNotoriety(notoriety: number): DifficultyRank {
  const bias = notoriety < 10 ? 0 : notoriety < 25 ? 2 : notoriety < 50 ? 4 : 6;
  const idx = Math.max(0, Math.min(RANKS.length - 1, Math.floor(Math.random() * 3) + bias));
  return RANKS[idx];
}
```

**Bias Breakdown**:
- **Notoriety 0-9**: No bias (H-G rank quests only)
- **Notoriety 10-24**: +2 bias (F-E rank quests become available)
- **Notoriety 25-49**: +4 bias (D-C rank quests become available)
- **Notoriety 50+**: +6 bias (B-A-S rank quests become available)

#### Quest Duration Calculation
Quest duration is based on difficulty and includes randomization:

```typescript
const daysRequired = Math.max(1, 
  diff <= 3 ? 1 :           // H-G rank: 1 day
  diff <= 6 ? 2 :           // F-E rank: 2 days
  diff <= 10 ? 3 :          // D-C rank: 3 days
  4 + Math.floor(Math.random() * 2)  // B-A-S rank: 4-5 days
);
```

#### Quest Expiration System
Quests have dynamic expiration times based on difficulty:

```typescript
function expirationDayFor(diff: number, currentDay: number): number {
  let minDays: number, maxDays: number;
  
  if (diff <= 3) {
    minDays = 2; maxDays = 3;      // H-G rank: expires in 2-3 days
  } else if (diff <= 6) {
    minDays = 2; maxDays = 4;      // F-E rank: expires in 2-4 days
  } else if (diff <= 9) {
    minDays = 3; maxDays = 5;      // D-C rank: expires in 3-5 days
  } else {
    minDays = 4; maxDays = 7;      // B-A-S rank: expires in 4-7 days
  }
  
  const durationDays = Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays;
  return currentDay + durationDays;
}
```

### Quest Success Rate Calculation

#### Base Success Formula
The success rate is calculated using a complex formula that considers multiple factors:

```typescript
function calculateQuestSuccessRate(state: GameState, difficulty: number, partySize: number): number {
  // Base success rate starts at 50%
  let baseRate = 50;
  
  // Party size bonus (diminishing returns)
  const sizeBonus = Math.min(partySize * 5, 25); // Max 25% bonus
  
  // Guild facility bonuses
  const facilityBonus = calculateFacilityBonus(state);
  
  // Member training bonuses
  const trainingBonus = calculateTrainingBonus(state, partySize);
  
  // Reputation bonus
  const reputationBonus = Math.floor(state.reputation / 10);
  
  // Calculate final rate
  let finalRate = baseRate + sizeBonus + facilityBonus + trainingBonus + reputationBonus;
  
  // Apply difficulty penalty
  finalRate -= (difficulty - 1) * 3; // Each difficulty level reduces success by 3%
  
  // Clamp between 5% and 95%
  return Math.max(5, Math.min(95, finalRate));
}
```

#### Facility Bonus Calculation
```typescript
function calculateFacilityBonus(state: GameState): number {
  let bonus = 0;
  
  state.facilities.forEach(facility => {
    if (facility.isBuilt) {
      const effect = facility.effects.find(e => e.type === 'quest_success_bonus');
      if (effect) {
        bonus += effect.value * facility.level;
      }
    }
  });
  
  return bonus;
}
```

#### Training Bonus Calculation
```typescript
function calculateTrainingBonus(state: GameState, partySize: number): number {
  let totalTraining = 0;
  let memberCount = 0;
  
  // Find assigned members and calculate their training levels
  state.members.forEach(member => {
    if (member.trainingLevel > 0) {
      totalTraining += member.trainingLevel;
      memberCount++;
    }
  });
  
  if (memberCount === 0) return 0;
  
  // Average training level bonus (max 15%)
  const avgTraining = totalTraining / memberCount;
  return Math.min(avgTraining * 3, 15);
}
```

### Quest Profit Calculation

#### Base Profit Formula
```typescript
function calculateQuestProfit(state: GameState, reward: number, difficulty: number, partySize: number): number {
  // Base quest reward
  let profit = reward;
  
  // Calculate costs
  const memberCosts = calculateMemberCosts(state, partySize, difficulty);
  const facilityCosts = calculateFacilityCosts(state);
  const riskCosts = calculateRiskCosts(difficulty, partySize);
  
  // Apply success rate modifier
  const successRate = calculateQuestSuccessRate(state, difficulty, partySize);
  const successModifier = successRate / 100;
  
  // Final profit calculation
  profit = (profit * successModifier) - memberCosts - facilityCosts - riskCosts;
  
  return Math.floor(profit);
}
```

#### Cost Breakdown
```typescript
function calculateMemberCosts(state: GameState, partySize: number, difficulty: number): number {
  let costs = 0;
  
  // Daily upkeep for quest duration
  const questDuration = Math.max(1, difficulty <= 3 ? 1 : difficulty <= 6 ? 2 : difficulty <= 10 ? 3 : 4);
  
  // Find assigned members and calculate their upkeep
  state.members.forEach(member => {
    if (member.isAssigned) {
      costs += member.upkeep * questDuration;
    }
  });
  
  return costs;
}

function calculateRiskCosts(difficulty: number, partySize: number): number {
  // Risk costs increase exponentially with difficulty
  const baseRisk = Math.pow(difficulty, 1.5) * 10;
  const partyRisk = partySize * 5; // More members = more risk
  
  return Math.floor(baseRisk + partyRisk);
}
```

## Combat System Deep Dive

### Battle Mechanics

#### Turn Order Calculation
```typescript
function calculateTurnOrder(party: Member[], enemies: BattleActor[]): BattleActor[] {
  const allCombatants = [...party, ...enemies];
  
  // Sort by speed, then by luck for tiebreakers
  return allCombatants.sort((a, b) => {
    if (a.speed !== b.speed) {
      return b.speed - a.speed; // Higher speed goes first
    }
    return (b.luck || 0) - (a.luck || 0); // Higher luck breaks ties
  });
}
```

#### Damage Calculation
```typescript
function calculateDamage(attacker: BattleActor, defender: BattleActor, attackType: 'physical' | 'magical'): number {
  let baseDamage: number;
  
  if (attackType === 'physical') {
    baseDamage = (attacker.stats?.str || 0) * 2;
    const defense = (defender.stats?.defense || 0) * 0.5;
    baseDamage = Math.max(1, baseDamage - defense);
  } else {
    baseDamage = (attacker.stats?.mag || 0) * 2;
    const resistance = (defender.stats?.resistance || 0) * 0.5;
    baseDamage = Math.max(1, baseDamage - resistance);
  }
  
  // Critical hit calculation
  const critChance = (attacker.stats?.skill || 0) / 100;
  const isCritical = Math.random() < critChance;
  
  if (isCritical) {
    baseDamage = Math.floor(baseDamage * 1.5);
  }
  
  // Random variance (±10%)
  const variance = 0.9 + (Math.random() * 0.2);
  baseDamage = Math.floor(baseDamage * variance);
  
  return Math.max(1, baseDamage);
}
```

#### Accuracy Calculation
```typescript
function calculateHitChance(attacker: BattleActor, defender: BattleActor): boolean {
  const baseAccuracy = 85; // Base 85% hit rate
  
  // Skill bonus
  const skillBonus = (attacker.stats?.skill || 0) * 0.5;
  
  // Speed bonus
  const speedBonus = (attacker.stats?.speed || 0) * 0.3;
  
  // Luck bonus
  const luckBonus = (attacker.stats?.luck || 0) * 0.2;
  
  // Defender evasion (based on speed and luck)
  const evasion = (defender.stats?.speed || 0) * 0.2 + (defender.stats?.luck || 0) * 0.1;
  
  const finalAccuracy = Math.min(95, Math.max(5, baseAccuracy + skillBonus + speedBonus + luckBonus - evasion));
  
  return Math.random() * 100 < finalAccuracy;
}
```

## Economy System Deep Dive

### Income Calculation

#### Daily Income Formula
```typescript
calculateDailyIncome(state: GameState): number {
  let income = 0;
  
  // Base guild income (reputation-based)
  // Formula: reputation * 100 + base amount
  const baseIncome = 500; // Minimum daily income
  const reputationIncome = Math.floor(state.reputation * 100);
  income += baseIncome + reputationIncome;
  
  // Facility income bonuses
  state.facilities.forEach(facility => {
    if (facility.isBuilt) {
      const incomeEffect = facility.effects.find(e => e.type === 'income_bonus');
      if (incomeEffect) {
        // Facility income scales with level and reputation
        const levelMultiplier = facility.level;
        const reputationMultiplier = 1 + (state.reputation / 100);
        income += Math.floor(incomeEffect.value * levelMultiplier * reputationMultiplier);
      }
    }
  });
  
  // Quest completion streak bonus
  const streakBonus = state.guildStats.consecutiveSuccessfulQuests * 50;
  income += streakBonus;
  
  // Market trading income
  income += this.calculateMarketIncome(state);
  
  // Special event bonuses
  income += this.calculateEventBonuses(state);
  
  return Math.floor(income);
}
```

#### Market Income Calculation
```typescript
private calculateMarketIncome(state: GameState): number {
  let income = 0;
  
  state.shop.forEach(item => {
    if (item.stock > 0) {
      const trend = this.getMarketTrend(item.category);
      
      if (trend?.trend === 'rising') {
        // Rising market: 10% of item value as income
        income += Math.floor(item.currentPrice * 0.1);
      } else if (trend?.trend === 'falling') {
        // Falling market: 5% of item value as income (reduced)
        income += Math.floor(item.currentPrice * 0.05);
      } else {
        // Stable market: 7.5% of item value as income
        income += Math.floor(item.currentPrice * 0.075);
      }
    }
  });
  
  return income;
}
```

### Market Trend System

#### Trend Generation Algorithm
```typescript
private generateNewMarketTrend(state: GameState): void {
  const categories = ['weapon', 'armor', 'potion', 'food', 'material', 'accessory'];
  const category = categories[Math.floor(Math.random() * categories.length)];
  
  // Trend probability based on current market conditions
  const currentTrends = this.marketTrends.filter(t => t.category === category);
  const recentTrends = currentTrends.filter(t => state.day - t.startDay < 10);
  
  let trendProbabilities: Record<string, number>;
  
  if (recentTrends.length === 0) {
    // No recent trends: equal probability
    trendProbabilities = { rising: 0.33, falling: 0.33, stable: 0.34 };
  } else {
    const lastTrend = recentTrends[recentTrends.length - 1];
    
    // Trend continuation vs. reversal
    if (lastTrend.trend === 'rising') {
      trendProbabilities = { rising: 0.4, falling: 0.3, stable: 0.3 };
    } else if (lastTrend.trend === 'falling') {
      trendProbabilities = { rising: 0.3, falling: 0.4, stable: 0.3 };
    } else {
      trendProbabilities = { rising: 0.3, falling: 0.3, stable: 0.4 };
    }
  }
  
  // Select trend based on probabilities
  const trend = this.selectTrendByProbability(trendProbabilities);
  
  // Calculate change magnitude
  const change = this.calculateTrendChange(trend, category);
  
  // Determine duration (3-10 days)
  const duration = Math.floor(Math.random() * 8) + 3;
  
  const newTrend: MarketTrend = {
    category,
    trend,
    change,
    duration,
    description: this.generateTrendDescription(category, trend, change),
    startDay: state.day
  };
  
  this.marketTrends.push(newTrend);
}
```

#### Price Update Algorithm
```typescript
private updateItemPrices(state: GameState): void {
  state.shop.forEach(item => {
    const trend = this.getMarketTrend(item.category);
    
    if (trend) {
      // Calculate price change
      const changeMultiplier = 1 + (trend.change / 100);
      const newPrice = Math.floor(item.basePrice * changeMultiplier);
      
      // Apply price limits
      const minPrice = Math.floor(item.basePrice * 0.5);  // 50% of base price
      const maxPrice = Math.floor(item.basePrice * 2.0);  // 200% of base price
      
      item.currentPrice = Math.max(minPrice, Math.min(maxPrice, newPrice));
      
      // Update price history
      this.updatePriceHistory(item.id, state.day, item.currentPrice);
    }
  });
}
```

## Recruitment System Deep Dive

### Candidate Generation Algorithm

#### Quality Scaling Formula
```typescript
export async function generateCandidates(notoriety: number, week: number): Promise<Candidate[]> {
  // Base candidate count scales with notoriety
  const baseCount = 3 + Math.floor(notoriety / 10);
  const count = Math.min(10, Math.max(3, baseCount));
  
  const result: Candidate[] = [];
  
  for (let i = 0; i < count; i++) {
    // Talent calculation: base + notoriety bonus + random variation
    const baseTalent = 1;
    const notorietyBonus = Math.floor(notoriety / 10);
    const randomVariation = Math.floor(Math.random() * 4) - 1; // -1 to +2
    
    const talent = Math.max(1, Math.min(10, baseTalent + notorietyBonus + randomVariation));
    
    // Generate candidate with talent-based stats
    const candidate = generateCandidateWithTalent(talent, notoriety);
    result.push(candidate);
  }
  
  return result;
}
```

#### Stat Generation Algorithm
```typescript
function generateCandidateWithTalent(talent: number, notoriety: number): Candidate {
  const class = selectRandomClass();
  const primaryStat = getPrimaryStat(class);
  const secondaryStat = getSecondaryStat(class);
  
  // Base stats with talent scaling
  const baseStats = {
    str: Math.max(1, Math.min(20, Math.floor(Math.random() * 5) + 2 + (primaryStat === 'str' ? talent : 0))),
    mag: Math.max(1, Math.min(20, Math.floor(Math.random() * 5) + 2 + (primaryStat === 'mag' ? talent : 0))),
    skill: Math.max(1, Math.min(20, Math.floor(Math.random() * 5) + 2 + (primaryStat === 'skill' ? talent : 0))),
    speed: Math.max(1, Math.min(10, 1 + Math.floor(Math.random() * 3) + (secondaryStat === 'speed' ? talent : 0))),
    luck: Math.max(1, Math.min(20, Math.floor(Math.random() * 5) + 2 + (primaryStat === 'luck' ? talent : 0))),
    defense: Math.max(1, Math.min(20, Math.floor(Math.random() * 5) + 2 + (secondaryStat === 'defense' ? talent : 0))),
    resistance: Math.max(1, Math.min(20, Math.floor(Math.random() * 5) + 2 + (secondaryStat === 'resistance' ? talent : 0)))
  };
  
  // HP calculation: base + random + talent bonus
  const baseHP = 10;
  const randomHP = Math.floor(Math.random() * 11);
  const talentHP = talent * 2;
  const hp = baseHP + randomHP + talentHP;
  
  // Upkeep calculation: based on total stats and talent
  const totalStats = Object.values(baseStats).reduce((sum, stat) => sum + stat, 0);
  const baseUpkeep = 5;
  const statUpkeep = Math.floor(totalStats / 7);
  const talentUpkeep = Math.floor(talent / 2);
  const upkeep = baseUpkeep + statUpkeep + talentUpkeep;
  
  return {
    // ... other properties
    stats: baseStats,
    hp,
    upkeep,
    potential: talent
  };
}
```

## Leveling System Deep Dive

### Experience Curves

#### Mathematical Formulas
```typescript
const EXPERIENCE_CURVES: Record<ExperienceCurve, (level: number) => number> = {
  // Fast: Quadratic growth with 50x multiplier
  // Levels up quickly, good for early game
  fast: (level: number) => Math.floor(level * level * 50),
  
  // Normal: Standard quadratic growth with 100x multiplier
  // Balanced progression, most common
  normal: (level: number) => Math.floor(level * level * 100),
  
  // Slow: Quadratic growth with 200x multiplier
  // Slower progression, good for long-term games
  slow: (level: number) => Math.floor(level * level * 200),
  
  // Erratic: Variable progression speeds
  // Unpredictable, adds variety
  erratic: (level: number) => {
    if (level % 3 === 0) return Math.floor(level * level * 75);  // Fast levels
    if (level % 5 === 0) return Math.floor(level * level * 300); // Very slow levels
    return Math.floor(level * level * 150); // Normal-ish
  }
};
```

#### Level Up Calculation
```typescript
export function addExperience(member: Member, amount: number): { leveledUp: boolean; levelsGained: number } {
  let leveledUp = false;
  let levelsGained = 0;
  
  member.experience += amount;
  
  // Check for level ups
  while (member.experience >= getExperienceForNextLevel(member)) {
    member.level += 1;
    leveledUp = true;
    levelsGained += 1;
    
    // Increase stats based on level
    increaseStatsOnLevelUp(member);
    
    // Increase HP/MP based on level
    increaseVitalsOnLevelUp(member);
    
    // Check for skill unlocks
    checkForSkillUnlocks(member);
  }
  
  return { leveledUp, levelsGained };
}
```

#### Stat Growth Algorithm
```typescript
function increaseStatsOnLevelUp(member: Member): void {
  const stats = member.stats;
  if (!stats) return;
  
  // Base stat increase: 1-2 points
  const baseIncrease = Math.floor(Math.random() * 2) + 1;
  
  // Class bonus: primary and secondary stats get extra growth
  const primaryStat = getPrimaryStat(member.class);
  const secondaryStat = getSecondaryStat(member.class);
  
  // Randomly choose which stats to increase
  const statKeys: (keyof Stats)[] = ['str', 'mag', 'skill', 'speed', 'luck', 'defense', 'resistance'];
  const statsToIncrease = Math.floor(Math.random() * 2) + 1; // 1-2 stats
  
  for (let i = 0; i < statsToIncrease; i++) {
    const randomStat = statKeys[Math.floor(Math.random() * statKeys.length)];
    if (randomStat && typeof stats[randomStat] === 'number') {
      let increase = baseIncrease;
      
      // Apply class bonuses
      if (randomStat === primaryStat) {
        increase += 1; // Primary stat gets +1 bonus
      } else if (randomStat === secondaryStat) {
        increase += 0.5; // Secondary stat gets +0.5 bonus
      }
      
      stats[randomStat] = (stats[randomStat] as number) + Math.floor(increase);
    }
  }
}
```

## Facility System Deep Dive

### Facility Effects Calculation

#### Effect Application Algorithm
```typescript
function applyFacilityEffects(state: GameState): void {
  state.facilities.forEach(facility => {
    if (facility.isBuilt) {
      facility.effects.forEach(effect => {
        switch (effect.type) {
          case 'quest_success_bonus':
            // Quest success bonus is applied during quest calculation
            break;
            
          case 'income_bonus':
            // Income bonus is calculated in daily income
            break;
            
          case 'training_bonus':
            // Training bonus affects training effectiveness
            break;
            
          case 'recruit_bonus':
            // Recruitment bonus affects candidate quality
            break;
            
          case 'upkeep_reduction':
            // Upkeep reduction is applied to facility costs
            break;
        }
      });
    }
  });
}
```

#### Facility Upgrade Calculation
```typescript
function upgradeFacility(state: GameState, facilityId: string): boolean {
  const facility = state.facilities.find(f => f.id === facilityId);
  if (!facility || facility.level >= facility.maxLevel) return false;
  
  // Calculate upgrade cost with scaling
  const baseUpgradeCost = facility.upgradeCost;
  const levelScaling = Math.pow(facility.level, 1.2); // Exponential scaling
  const reputationDiscount = Math.max(0.5, 1 - (state.reputation / 200)); // Max 50% discount
  
  const finalCost = Math.floor(baseUpgradeCost * levelScaling * reputationDiscount);
  
  if (state.money < finalCost) return false;
  
  // Apply upgrade
  state.money -= finalCost;
  facility.level += 1;
  
  // Update effects based on new level
  updateFacilityEffects(facility);
  
  // Update maintenance costs
  facility.maintenanceCost = Math.floor(facility.maintenanceCost * 1.3);
  
  return true;
}
```

## Goal System Deep Dive

### Goal Progress Tracking

#### Progress Calculation Algorithm
```typescript
function updateGoalProgress(state: GameState): void {
  state.goals.forEach(goal => {
    if (goal.isCompleted) return;
    
    // Calculate current progress based on goal type
    switch (goal.type) {
      case 'quests_completed':
        goal.current = state.guildStats.totalQuestsCompleted;
        break;
        
      case 'money_earned':
        goal.current = state.guildStats.totalMoneyEarned;
        break;
        
      case 'members_recruited':
        goal.current = state.guildStats.totalMembersRecruited;
        break;
        
      case 'facilities_built':
        goal.current = state.facilities.filter(f => f.isBuilt).length;
        break;
        
      case 'reputation_reached':
        goal.current = state.reputation;
        break;
        
      case 'influence_reached':
        goal.current = state.influence;
        break;
    }
    
    // Check for completion
    if (goal.current >= goal.target) {
      goal.isCompleted = true;
      goal.completedAt = state.day;
      
      // Award rewards
      awardGoalRewards(state, goal);
      
      // Check for new goals
      checkForNewGoals(state);
    }
  });
}
```

## Dating System Deep Dive

### Heart Level Calculation

#### Heart Gain Algorithm
```typescript
export function performDatingAction(
  action: DatingAction,
  romanticInterest: RomanticInterest,
  member: Member,
  gameState: GameState
): { success: boolean; heartGain: number; message: string } {
  // Check if action is available
  if (!action.isAvailable(member, romanticInterest)) {
    return { success: false, heartGain: 0, message: 'This action is not available at this time.' };
  }
  
  // Check cooldown
  const lastEvent = romanticInterest.romanceEvents
    .filter(e => e.type === action.id)
    .sort((a, b) => b.day - a.day)[0];
  
  if (lastEvent && gameState.day - lastEvent.day < action.cooldownDays) {
    return { success: false, heartGain: 0, message: `This action is on cooldown.` };
  }
  
  // Calculate heart gain with modifiers
  let heartGain = action.heartGain;
  
  // Bonus for favorite gifts
  if (action.id.includes('gift') && action.id !== 'gift_flower') {
    heartGain += 1; // +1 bonus for favorite gifts
  }
  
  // Bonus for high heart level
  if (romanticInterest.heartLevel >= 5) {
    heartGain += 1; // +1 bonus for established relationships
  }
  
  return { success: true, heartGain, message: 'Action successful!' };
}
```

#### Heart Decay System
```typescript
export function processHeartDecay(datingSystem: DatingSystem, gameState: GameState): void {
  datingSystem.romanticInterests.forEach(interest => {
    if (interest.lastInteractionDay && gameState.day - interest.lastInteractionDay > 7) {
      // Lose hearts if no interaction for more than a week
      const daysSinceInteraction = gameState.day - interest.lastInteractionDay;
      const heartLoss = Math.floor(daysSinceInteraction * datingSystem.heartDecayRate);
      
      if (heartLoss > 0) {
        interest.heartProgress = Math.max(0, interest.heartProgress - heartLoss);
        
        // Lose heart level if progress goes below 0
        if (interest.heartProgress < 0) {
          interest.heartLevel = Math.max(0, interest.heartLevel - 1) as HeartLevel;
          interest.heartProgress = 100 + interest.heartProgress;
        }
      }
    }
  });
}
```

#### Character Preference Generation
```typescript
function generateFavoriteGifts(characterClass: string, traits: string[]): string[] {
  const favorites: string[] = [];
  
  // Class-based favorites
  switch (characterClass) {
    case 'Warrior':
      favorites.push('weapon', 'armor', 'strength_potion');
      break;
    case 'Mage':
      favorites.push('magic_scroll', 'mana_potion', 'crystal');
      break;
    case 'Rogue':
      favorites.push('dagger', 'stealth_item', 'agility_potion');
      break;
    case 'Cleric':
      favorites.push('holy_symbol', 'healing_potion', 'blessed_item');
      break;
    case 'Ranger':
      favorites.push('bow', 'nature_item', 'survival_gear');
      break;
  }
  
  // Trait-based favorites
  if (traits.includes('brave')) favorites.push('courage_medal');
  if (traits.includes('intelligent')) favorites.push('ancient_tome');
  if (traits.includes('graceful')) favorites.push('elegant_clothing');
  if (traits.includes('passionate')) favorites.push('romance_novel');
  
  return favorites;
}
```

#### Special Event Triggers
```typescript
export const DATING_SPECIAL_EVENTS: DatingSpecialEvent[] = [
  {
    id: 'valentines_day',
    name: 'Valentine\'s Day',
    description: 'A special day for romance and gifts',
    triggerCondition: (gameState: GameState) => {
      // Trigger on day 14 of any month (simplified)
      return gameState.day % 28 === 14;
    },
    effects: [
      { type: 'heart_gain', value: 2, target: 'all', description: 'All romantic interests gain 2 hearts' }
    ],
    isOneTime: false,
    hasOccurred: false
  },
  {
    id: 'birthday_celebration',
    name: 'Birthday Celebration',
    description: 'Celebrate their special day',
    triggerCondition: (gameState: GameState) => {
      // Simplified birthday trigger
      return gameState.day % 30 === 0;
    },
    effects: [
      { type: 'heart_gain', value: 3, target: 'all', description: 'All romantic interests gain 3 hearts' }
    ],
    isOneTime: false,
    hasOccurred: false
  }
];
```

#### Goal Reward System
```typescript
function awardGoalRewards(state: GameState, goal: GameGoal): void {
  const rewards = goal.reward;
  
  // Money reward
  if (rewards.money > 0) {
    state.money += rewards.money;
    state.guildStats.totalMoneyEarned += rewards.money;
  }
  
  // Notoriety reward
  if (rewards.notoriety > 0) {
    state.notoriety += rewards.notoriety;
  }
  
  // Reputation reward
  if (rewards.reputation > 0) {
    state.reputation = Math.min(100, state.reputation + rewards.reputation);
  }
  
  // Influence reward
  if (rewards.influence > 0) {
    state.influence = Math.min(100, state.influence + rewards.influence);
  }
  
  // Item rewards
  if (rewards.items.length > 0) {
    rewards.items.forEach(itemId => {
      const item = state.itemsCatalog.find(i => i.id === itemId);
      if (item) {
        addItemToInventory(state, item);
      }
    });
  }
  
  // Facility unlock
  if (rewards.facilityUnlock) {
    unlockFacility(state, rewards.facilityUnlock);
  }
  
  // Add to completed goals
  state.guildStats.goalsCompleted = (state.guildStats.goalsCompleted || 0) + 1;
}
```

---

*This deep dive provides comprehensive understanding of the mathematical formulas, algorithms, and detailed mechanics that power the game systems. Understanding these underlying calculations helps players make informed decisions and developers extend the game functionality.*

