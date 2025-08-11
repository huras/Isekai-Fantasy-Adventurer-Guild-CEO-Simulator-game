import type { ActiveMission, BattleActor, BattleState, DifficultyRank, GameState, JobKind, Member, Quest, TargetKind } from './types'
import { dailyUpkeep } from './money'
import { addExperience } from './leveling'

function uid(prefix = 'quest') { return `${prefix}_${Math.random().toString(36).slice(2, 9)}` }

export function calculateMemberPower(member: Member): number {
  const stats = member.stats || { str: 5, mag: 5, skill: 5, speed: 3, luck: 5, defense: 3, resistance: 3 }
  
  // Calculate power based on new stat system
  const attackPower = Math.max(stats.str, stats.mag) // Use higher of physical or magical attack
  const defensePower = Math.min(stats.defense, stats.resistance) // Use lower of physical or magical defense
  const utilityPower = stats.skill + stats.luck // Skill and luck contribute to overall effectiveness
  
  return attackPower + defensePower + Math.floor(utilityPower / 2) + Math.floor(member.speed || 1)
}

function isMemberBusy(state: GameState, memberId: string, excludeQuestId?: string): string | null {
  const member = state.members.find(m => m.id === memberId)
  // Busy if assigned to another quest
  const otherAssigned = state.quests.some(q => q.id !== excludeQuestId && (q.assigned || []).some(m => m.id === memberId))
  if (otherAssigned) return 'already assigned to another quest'
  // Busy if currently on an active mission
  const onMission = (state.activeMissions || []).some(m => (m.party || []).some(p => p.id === memberId))
  if (onMission) return 'already on a mission'
  return null
}

function expirationDayFor(diff: number, currentDay: number): number {
  let minDays: number
  let maxDays: number
  if (diff <= 3) {
    minDays = 2; maxDays = 3
  } else if (diff <= 6) {
    minDays = 2; maxDays = 4
  } else if (diff <= 9) {
    minDays = 3; maxDays = 5
  } else {
    minDays = 4; maxDays = 7
  }
  const durationDays = Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays
  return currentDay + durationDays
}

// Fully procedural; curated pools removed

// No pool picking; procedural generation uses notoriety to bias rank

// Difficulty rank helpers
const RANKS: DifficultyRank[] = ['H','G','F','E','D','C','B','A','S']
function rankFromDiff(diff: number): DifficultyRank {
  if (diff >= 14) return 'S'
  if (diff >= 12) return 'A'
  if (diff >= 10) return 'B'
  if (diff >= 8) return 'C'
  if (diff >= 6) return 'D'
  if (diff >= 5) return 'E'
  if (diff >= 4) return 'F'
  if (diff >= 3) return 'G'
  return 'H'
}
function randomRankForNotoriety(n: number): DifficultyRank {
  const bias = n < 10 ? 0 : n < 25 ? 2 : n < 50 ? 4 : 6
  const idx = Math.max(0, Math.min(RANKS.length - 1, Math.floor(Math.random() * 3) + bias))
  return RANKS[idx]
}
function diffRangeForRank(rank: DifficultyRank): [number, number] {
  switch (rank) {
    case 'H': return [1, 2]
    case 'G': return [2, 3]
    case 'F': return [3, 4]
    case 'E': return [4, 5]
    case 'D': return [5, 6]
    case 'C': return [7, 8]
    case 'B': return [9, 10]
    case 'A': return [12, 13]
    default: return [14, 15] // S
  }
}

// Procedural quest generator
// Keep emojis minimal and meaningful (single per quest based on job)
const JOB_EMOJI: Record<JobKind, string> = { Find: '🔎', Deliver: '📦', Escort: '🛡️', Protect: '🛡️', Kill: '⚔️' }
const PERSON_SEEDS = ['Noble', 'Scholar', 'Merchant', 'Priest', 'Runaway', 'Guard Captain']
const MONSTER_SEEDS = ['Pink Slime', 'Wolf', 'Goblin', 'Bandit', 'Orc', 'Blue Slime', 'Warg', 'Vampire', 'Dragon']
const ITEM_SEEDS = ['Potion', 'Chest', 'Exotic Food', 'Weapon', 'Art Object', 'Legendary Item']
const LOCATION_SEEDS = ['Abandoned Mine', 'Cursed Chapel', 'Haunted Library', 'Forest Shrine', 'Mountain Pass', 'Sunken Ruins']

function randomOf<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

function proceduralQuest(notoriety: number, day: number): Quest {
  const job: JobKind = randomOf(['Find','Deliver','Escort','Protect','Kill'])
  const target: TargetKind = randomOf(job === 'Escort' ? ['Person','Item'] : job === 'Kill' ? ['Person','Monster'] : job === 'Protect' ? ['Person','Monster','Item','Location'] : job === 'Deliver' ? ['Person','Item','Monster'] : ['Person','Monster','Item','Location'])
  const rank = randomRankForNotoriety(notoriety)
  const [minD, maxD] = diffRangeForRank(rank)
  const diff = Math.floor(Math.random() * (maxD - minD + 1)) + minD
  const daysRequired = Math.max(1, diff <= 3 ? 1 : diff <= 6 ? 2 : diff <= 10 ? 3 : 4 + Math.floor(Math.random() * 2))
  // Title pieces
  const subject = target === 'Person' ? randomOf(PERSON_SEEDS)
    : target === 'Monster' ? randomOf(MONSTER_SEEDS)
    : target === 'Item' ? randomOf(ITEM_SEEDS)
    : randomOf(LOCATION_SEEDS)
  const emoji = JOB_EMOJI[job]
  const verb = job === 'Find' ? 'Find' : job === 'Deliver' ? 'Deliver' : job === 'Escort' ? 'Escort' : job === 'Protect' ? 'Protect' : 'Eliminate'
  const name = `${emoji} ${verb} ${subject}`
  // Type and rewards
  const type = job === 'Kill' || job === 'Protect' ? 'Combat' : job === 'Escort' ? 'Exploration' : 'Beginner'
  const baseReward = diff * 25 + Math.floor(Math.random() * 15)
  const reward = baseReward + (job === 'Kill' ? 20 : 0)
  const fame = Math.max(1, Math.floor(diff / 2) + (rank === 'S' ? 5 : rank === 'A' ? 3 : 0))
  // Description
  const desc = `${verb} ${subject}. Rank ${rank}. Trip ~${daysRequired}d.`
  const tags: string[] = [job, target, type]
  return { id: uid(), name, desc, diff, rank, reward, fame, day, expiresOnDay: expirationDayFor(diff, day), daysRequired, type, tags, emoji, job, target }
}

export function generateQuestList(notoriety: number, day: number): Quest[] {
  const count = Math.min(8, Math.max(3, 3 + Math.floor(notoriety / 15)))
  const list: Quest[] = []
  for (let i = 0; i < count; i++) {
    list.push(proceduralQuest(notoriety, day))
  }
  return list
}

function createEnemiesForMission(m: ActiveMission): BattleActor[] {
  const count = Math.max(1, Math.floor(m.diff / 4))
  const enemies: BattleActor[] = []
  for (let i = 0; i < count; i++) {
    const name = m.target === 'Monster' ? randomOf(MONSTER_SEEDS) : m.target === 'Person' ? 'Bandit' : 'Guard'
    const hpMax = 12 + Math.floor(m.diff * 2.5)
    enemies.push({ id: uid('enemy'), name, hp: hpMax, hpMax, power: 6 + Math.floor(m.diff / 2) })
  }
  return enemies
}

export function createBattleFromMission(m: ActiveMission, wave: number, wavesTotal: number): BattleState {
  const allies: BattleActor[] = m.party.filter(p => p.alive !== false).map(p => ({ id: p.id, name: p.name, hp: p.hp ?? p.hpMax, hpMax: p.hpMax, mp: p.mp, mpMax: p.mpMax, power: calculateMemberPower(p) }))
  const enemies = createEnemiesForMission(m)
  return { missionId: m.id, questName: m.name, diff: m.diff, wave, wavesTotal, allies, enemies, turnSide: 'ally', turnIndex: 0, log: [`Battle begins — Wave ${wave}/${wavesTotal}`] }
}

// No name-based typing; type is derived in the generator

export function assignMember(state: GameState, questId: string, memberId: string) {
  const quest = state.quests.find(q => q.id === questId)
  const member = state.members.find(m => m.id === memberId)
  if (!quest || !member) return
  // Require sufficient funds to cover daily upkeep
  if (state.money < dailyUpkeep(state)) {
    state.logs.events.unshift(`⛔ Cannot assign to ${quest.name}: insufficient funds to cover daily upkeep.`)
    return
  }
  quest.assigned = quest.assigned || []
  if (quest.assigned.find(m => m.id === memberId)) return
  const busyReason = isMemberBusy(state, memberId, questId)
  if (busyReason) {
    state.logs.events.unshift(`⛔ ${member.name} cannot be assigned to ${quest.name}: ${busyReason}.`)
    return
  }
  quest.assigned.push(member)
}

export function unassignMember(state: GameState, questId: string, memberId: string) {
  const quest = state.quests.find(q => q.id === questId)
  if (!quest) return
  quest.assigned = (quest.assigned || []).filter(m => m.id !== memberId)
}

export function runQuest(state: GameState, questId: string) {
  const quest = state.quests.find(q => q.id === questId)
  if (!quest) return
  const party = quest.assigned || []
  if (party.length === 0) {
    state.logs.events.unshift('⚠️ Assign at least one member to run a quest')
    return
  }
  // Verify none are already on another mission
  const conflicted = party.filter(m => isMemberBusy(state, m.id, questId) === 'already on a mission')
  if (conflicted.length > 0) {
    state.logs.events.unshift(`⛔ Cannot start ${quest.name}: ${conflicted.map(c => c.name).join(', ')} already on a mission.`)
    return
  }
  // Convert to active mission (multi-day trip)
  const duration = Math.max(1, quest.daysRequired || 1)
  const mission: ActiveMission = {
    id: quest.id,
    name: quest.name,
    diff: quest.diff,
    rank: quest.rank,
    reward: quest.reward,
    fame: quest.fame,
    type: quest.type,
    tags: quest.tags,
    emoji: quest.emoji,
    job: quest.job,
    target: quest.target,
    dayStarted: state.day,
    endOnDay: state.day + duration,
    party: party.map(p => ({ ...p })),
    log: [`🏁 Party departed for ${quest.name} (${duration}d).`] ,
  }
  // Seed battlesRemaining based on quest job
  const job = (quest.job || 'Find')
  const waves = job === 'Kill' ? 1 + Math.floor(Math.random() * 2) : (job === 'Escort' || job === 'Protect') ? Math.floor(Math.random() * 3) : 0
  mission.battlesPlanned = waves
  mission.battlesRemaining = waves
  mission.battlesCleared = 0
  state.activeMissions = state.activeMissions || []
  state.activeMissions.unshift(mission)
  state.logs.events.unshift(`🧭 ${party.length} set out: ${quest.name}`)
  // Remove quest from board
  state.quests = state.quests.filter(q => q.id !== questId)
  // If combat is planned, start the first battle immediately and block day progression
  if (waves > 0 && !state.battle) {
    state.battle = createBattleFromMission(mission, 1, waves)
    state.logs.events.unshift(`⚔️ Battle begins during ${mission.name}!`)
  }
}

export function autoAssign(state: GameState) {
  // Require sufficient funds to cover daily upkeep
  if (state.money < dailyUpkeep(state)) {
    state.logs.events.unshift(`⛔ Cannot auto-assign: insufficient funds to cover daily upkeep.`)
    return
  }
  // Sort members by power, highest first
  const pool = [...state.members].sort((a, b) => calculateMemberPower(b) - calculateMemberPower(a))
  for (const quest of state.quests) {
    const needed = Math.min(3, Math.max(1, Math.floor(quest.diff / 3)))
    quest.assigned = quest.assigned || []
    // Fill remaining slots without clearing existing assignments
    const remaining = Math.max(0, needed - quest.assigned.length)
    if (remaining <= 0) continue
    // Assign available members not busy and not already on this quest
    const assignedIds = new Set(quest.assigned.map(m => m.id))
    for (let i = 0; i < pool.length && quest.assigned.length < needed; i++) {
      const candidate = pool[i]
      if (assignedIds.has(candidate.id)) continue
      const busyReason = isMemberBusy(state, candidate.id, quest.id)
      if (busyReason) continue
      quest.assigned.push(candidate)
      assignedIds.add(candidate.id)
      // Remove from pool so we do not assign the same member to another quest automatically
      pool.splice(i, 1)
      i -= 1
    }
  }
}

export function advanceMissionsOneDay(state: GameState) {
  if (!state.activeMissions) return
  // If a battle is in progress, skip mission day resolution
  if (state.battle) return
  
  const completed: ActiveMission[] = []
  const failed: ActiveMission[] = []
  
  for (const m of state.activeMissions) {
    // Start a battle if needed
    if ((m.battlesRemaining ?? 0) > 0) {
      const total = m.battlesPlanned || m.battlesRemaining || 1
      // Consume one now and create battle
      // Do not decrement here; decrement on wave clear to keep wave index stable on resume
      state.battle = createBattleFromMission(m, (m.battlesCleared || 0) + 1, total)
      state.logs.events.unshift(`⚔️ A battle erupts during ${m.name}!`)
      // Only one battle at a time
      return
    }
    
    // Check if mission has ended
    if (state.day >= m.endOnDay) {
      // Mission failed due to time
      failed.push(m)
      state.logs.events.unshift(`⏰ Mission failed: ${m.name} - Time expired`)
      continue
    }
    
    // Check if all battles are cleared
    if ((m.battlesCleared || 0) >= (m.battlesPlanned || 1)) {
      // Mission completed successfully
      completed.push(m)
      
      // Award experience to party members
      for (const member of m.party) {
        if (member.alive !== false) {
          // Base experience based on mission difficulty
          const baseExp = Math.max(10, m.diff * 5)
          // Bonus for higher difficulty missions
          const difficultyBonus = Math.floor(m.diff / 2) * 3
          // Random variation
          const randomBonus = Math.floor(Math.random() * 10)
          const totalExp = baseExp + difficultyBonus + randomBonus
          
          const result = addExperience(member, totalExp)
          if (result.leveledUp) {
            state.logs.events.unshift(`🎉 ${member.name} leveled up to Lv.${member.level}! (+${totalExp} EXP)`)
          } else {
            state.logs.events.unshift(`⭐ ${member.name} gained ${totalExp} experience from ${m.name}`)
          }
        }
      }
      
      // Award money and notoriety
      state.money += m.reward
      state.notoriety += m.fame
      state.logs.events.unshift(`💰 Mission completed: ${m.name} - +${m.reward}g, +${m.fame} notoriety`)
      continue
    }
    
    // Mission still in progress
    m.log.push(`Day ${state.day}: Mission continues...`)
  }
  
  // Remove completed and failed missions
  state.activeMissions = state.activeMissions.filter(m => 
    !completed.includes(m) && !failed.includes(m)
  )
  
  // Archive completed missions
  for (const m of completed) {
    state.archives.quests.push({
      id: m.id,
      name: m.name,
      expiredOnDay: state.day
    })
  }
  
  // Archive failed missions
  for (const m of failed) {
    state.archives.quests.push({
      id: m.id,
      name: m.name,
      expiredOnDay: state.day
    })
  }
}


