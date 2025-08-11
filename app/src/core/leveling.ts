import type { ExperienceCurve, Member, Stats } from './types'

// Experience required for each level based on curve type
const EXPERIENCE_CURVES: Record<ExperienceCurve, (level: number) => number> = {
  fast: (level: number) => Math.floor(level * level * 50), // Quadratic growth, levels up quickly
  normal: (level: number) => Math.floor(level * level * 100), // Standard quadratic growth
  slow: (level: number) => Math.floor(level * level * 200), // Slower progression
  erratic: (level: number) => {
    // Erratic: sometimes fast, sometimes slow, unpredictable
    if (level % 3 === 0) return Math.floor(level * level * 75) // Fast levels
    if (level % 5 === 0) return Math.floor(level * level * 300) // Very slow levels
    return Math.floor(level * level * 150) // Normal-ish
  }
}

/**
 * Calculate experience required to reach the next level
 */
export function getExperienceForNextLevel(member: Member): number {
  const nextLevel = member.level + 1
  return EXPERIENCE_CURVES[member.experienceCurve](nextLevel)
}

/**
 * Calculate experience required for current level
 */
export function getExperienceForCurrentLevel(member: Member): number {
  return EXPERIENCE_CURVES[member.experienceCurve](member.level)
}

/**
 * Calculate experience progress to next level (0.0 to 1.0)
 */
export function getExperienceProgress(member: Member): number {
  const currentLevelExp = getExperienceForCurrentLevel(member)
  const nextLevelExp = getExperienceForNextLevel(member)
  const expInLevel = member.experience - currentLevelExp
  const expNeeded = nextLevelExp - currentLevelExp
  
  return Math.max(0, Math.min(1, expInLevel / expNeeded))
}

/**
 * Add experience to a member and handle level ups
 */
export function addExperience(member: Member, amount: number): { leveledUp: boolean; levelsGained: number } {
  let leveledUp = false
  let levelsGained = 0
  
  member.experience += amount
  
  // Check for level ups
  while (member.experience >= getExperienceForNextLevel(member)) {
    member.level += 1
    leveledUp = true
    levelsGained += 1
    
    // Increase stats based on level
    increaseStatsOnLevelUp(member)
    
    // Increase HP/MP based on level
    increaseVitalsOnLevelUp(member)
  }
  
  return { leveledUp, levelsGained }
}

/**
 * Increase stats when leveling up
 */
function increaseStatsOnLevelUp(member: Member): void {
  const stats = member.stats
  if (!stats) return
  
  // Small random increases to stats
  const statIncrease = Math.floor(Math.random() * 2) + 1 // 1-2 points
  
  // Randomly choose which stats to increase
  const statKeys: (keyof Stats)[] = ['str', 'mag', 'skill', 'speed', 'luck', 'defense', 'resistance']
  const statsToIncrease = Math.floor(Math.random() * 2) + 1 // 1-2 stats
  
  for (let i = 0; i < statsToIncrease; i++) {
    const randomStat = statKeys[Math.floor(Math.random() * statKeys.length)]
    if (randomStat && typeof stats[randomStat] === 'number') {
      stats[randomStat] = (stats[randomStat] as number) + statIncrease
    }
  }
}

/**
 * Increase HP/MP when leveling up
 */
function increaseVitalsOnLevelUp(member: Member): void {
  // Increase HP
  const hpIncrease = Math.floor(Math.random() * 4) + 2 // 2-5 HP
  member.hpMax += hpIncrease
  member.hp = Math.min(member.hp + hpIncrease, member.hpMax) // Heal on level up
  
  // Increase MP if character has MP
  if (typeof member.mpMax === 'number' && member.mpMax > 0) {
    const mpIncrease = Math.floor(Math.random() * 3) + 1 // 1-3 MP
    member.mpMax += mpIncrease
    member.mp = Math.min((member.mp || 0) + mpIncrease, member.mpMax)
  }
  
  // Increase speed occasionally
  if (Math.random() < 0.3) { // 30% chance
    member.speed += 1
  }
}

/**
 * Get experience curve description
 */
export function getExperienceCurveDescription(curve: ExperienceCurve): string {
  switch (curve) {
    case 'fast':
      return 'Fast learner - gains levels quickly'
    case 'normal':
      return 'Standard progression - balanced growth'
    case 'slow':
      return 'Slow learner - takes time but becomes powerful'
    case 'erratic':
      return 'Unpredictable - sometimes fast, sometimes slow'
    default:
      return 'Unknown progression type'
  }
}

/**
 * Get experience curve emoji
 */
export function getExperienceCurveEmoji(curve: ExperienceCurve): string {
  switch (curve) {
    case 'fast':
      return '🚀'
    case 'normal':
      return '📈'
    case 'slow':
      return '🐌'
    case 'erratic':
      return '🎲'
    default:
      return '❓'
  }
}

/**
 * Calculate power level based on level and stats
 */
export function calculatePowerLevel(member: Member): number {
  const stats = member.stats
  if (!stats) return member.level
  
  // Calculate power based on new stat system
  const attackPower = Math.max(stats.str, stats.mag) // Use higher of physical or magical attack
  const defensePower = Math.min(stats.defense, stats.resistance) // Use lower of physical or magical defense
  const utilityPower = stats.skill + stats.luck // Skill and luck contribute to overall effectiveness
  
  const basePower = attackPower + defensePower + Math.floor(utilityPower / 2)
  
  // Level bonus: each level adds some power
  const levelBonus = Math.floor(member.level * 0.5)
  
  return basePower + levelBonus
}
