import type { ActiveMission, DifficultyRank, GameState, JobKind, Member, Quest, TargetKind } from './types'
import { dailyUpkeep } from './money'

function uid(prefix = 'quest') { return `${prefix}_${Math.random().toString(36).slice(2, 9)}` }

export function calculateMemberPower(member: Member): number {
  const stats = member.stats || { str: 5, int: 5, agi: 5, spr: 5 }
  const values = [stats.str, stats.int, stats.agi, stats.spr].sort((a, b) => b - a)
  const topTwo = (values[0] || 0) + (values[1] || 0)
  return topTwo + Math.floor(member.speed || 1)
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
const MONSTER_SEEDS = ['Slime', 'Goblin', 'Bandit', 'Wolf', 'Ogre', 'Vampire']
const ITEM_SEEDS = ['Ancient Relic', 'Love Letter', 'Healing Tonic', 'Encrypted Ledger', 'Dragon Egg', 'Lost Parcel']
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
  state.activeMissions = state.activeMissions || []
  state.activeMissions.unshift(mission)
  state.logs.events.unshift(`🧭 ${party.length} set out: ${quest.name}`)
  // Remove quest from board
  state.quests = state.quests.filter(q => q.id !== questId)
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
  const finished: ActiveMission[] = []
  const survivors: ActiveMission[] = []
  for (const m of state.activeMissions) {
    // Daily attrition: damage and mana usage
    const party = m.party
    const dayLog: string[] = []
    for (const member of party) {
      if (member.alive === false) continue
      // Job/target multipliers
      const job = m.job || 'Find'
      const target = m.target || 'Item'
      const dmgMult = (
        job === 'Kill' ? 1.5 :
        job === 'Protect' ? 1.25 :
        job === 'Escort' ? 1.1 :
        job === 'Deliver' ? 0.8 :
        0.85 // Find
      ) * (target === 'Monster' ? 1.15 : target === 'Location' ? 1.0 : 0.95)
      const mpMult = (
        job === 'Find' ? 1.35 :
        job === 'Escort' ? 1.1 :
        job === 'Protect' ? 1.0 :
        job === 'Deliver' ? 0.9 :
        0.8 // Kill
      ) * (target === 'Location' ? 1.15 : target === 'Monster' ? 0.95 : 1.0)

      const dmgMax = Math.max(1, Math.floor(m.diff * 2 * dmgMult))
      const dmg = Math.floor(Math.random() * (dmgMax + 1))
      member.hp = Math.max(0, (member.hp ?? member.hpMax) - dmg)
      const mpDrain = Math.floor(Math.random() * Math.max(2, Math.floor((m.diff + 2) * mpMult)))
      member.mpMax = member.mpMax ?? 10 + Math.floor((member.stats.spr || 3) / 2)
      member.mp = Math.max(0, (member.mp ?? member.mpMax!) - mpDrain)
      // XP gains per day
      member.baseLevel = member.baseLevel ?? 1
      const baseXpGain = 5 + Math.floor(m.diff / 2)
      const baseXpMult = job === 'Kill' ? 1.3 : job === 'Protect' ? 1.15 : job === 'Escort' ? 1.1 : 1.0
      member.baseExp = (member.baseExp ?? 0) + Math.floor(baseXpGain * baseXpMult)
      while ((member.baseExp ?? 0) >= 20 + (member.baseLevel - 1) * 10) {
        member.baseExp = (member.baseExp ?? 0) - (20 + (member.baseLevel - 1) * 10)
        member.baseLevel += 1
        // Small stat gains on base level up
        member.stats.str += Math.random() < 0.5 ? 1 : 0
        member.stats.int += Math.random() < 0.5 ? 1 : 0
        member.stats.agi += Math.random() < 0.5 ? 1 : 0
        member.stats.spr += Math.random() < 0.5 ? 1 : 0
        member.hpMax += 1
      }
      member.classLevel = member.classLevel ?? 1
      const classBase = 4 + (m.type === 'Magic' ? 2 : 0) + (job === 'Kill' ? 1 : 0)
      member.classExp = (member.classExp ?? 0) + classBase
      while ((member.classExp ?? 0) >= 25 + (member.classLevel - 1) * 12) {
        member.classExp = (member.classExp ?? 0) - (25 + (member.classLevel - 1) * 12)
        member.classLevel += 1
      }
      // Skill exp for equipped skills
      member.skillLevels = member.skillLevels || {}
      member.skillExp = member.skillExp || {}
      for (const skill of member.skills || []) {
        member.skillLevels[skill] = member.skillLevels[skill] || 1
        const skillGain = 3 + Math.floor(m.diff / 3)
        const skillMult = job === 'Find' ? 1.2 : job === 'Escort' ? 1.1 : job === 'Kill' ? 1.15 : 1.0
        member.skillExp[skill] = (member.skillExp[skill] || 0) + Math.floor(skillGain * skillMult)
        while ((member.skillExp[skill] || 0) >= 15 + (member.skillLevels[skill] - 1) * 8) {
          member.skillExp[skill] = (member.skillExp[skill] || 0) - (15 + (member.skillLevels[skill] - 1) * 8)
          member.skillLevels[skill] += 1
        }
      }
      if ((member.hp ?? 0) <= 0) {
        member.alive = false
        dayLog.push(`☠️ ${member.name} fell in ${m.name}`)
        // Move to archives.fallen will happen on mission finish
      }
    }
    if (dayLog.length) m.log.unshift(dayLog.join(' · '))

    if (state.day >= m.endOnDay) {
      // Resolve mission outcome based on surviving party power
      const aliveParty = party.filter(p => p.alive !== false)
      const teamPower = aliveParty.map(calculateMemberPower).reduce((a, b) => a + b, 0)
      const target = m.diff * 10
      const bonus = state.modifiers.questSuccessBonus || 0
      let successChance = Math.max(10, Math.min(90, Math.round((teamPower / target) * 60 + 20 + bonus)))
      successChance = Math.max(5, Math.min(95, successChance))
      const roll = Math.floor(Math.random() * 100) + 1
      const success = roll <= successChance
      if (success) {
        state.money = Math.max(0, Math.floor(state.money + m.reward))
        state.notoriety = Math.max(0, Math.floor(state.notoriety + m.fame))
        m.log.unshift(`✅ Completed. +${m.reward}g, +${m.fame} notoriety (roll ${roll}/${successChance}%)`)
        state.logs.events.unshift(`🏆 Mission complete: ${m.name} — +${m.reward}g, +${m.fame} fame`)
      } else {
        m.log.unshift(`❌ Failed (roll ${roll}/${successChance}%)`)
        state.logs.events.unshift(`💥 Mission failed: ${m.name}`)
      }
      // Handle fallen
      for (const member of party) {
        if (member.alive === false) {
          state.archives.fallen = state.archives.fallen || []
          state.archives.fallen.unshift({ id: member.id, name: member.name, class: member.class, diedOnDay: state.day, cause: `Fell during ${m.name}`, level: member.baseLevel })
          // Remove from roster
          state.members = state.members.filter(x => x.id !== member.id)
        } else {
          // Sync back hp/mp and progression to roster member
          const ref = state.members.find(x => x.id === member.id)
          if (ref) {
            ref.hp = member.hp ?? ref.hp
            ref.mp = member.mp ?? ref.mp
            ref.mpMax = member.mpMax ?? ref.mpMax
            ref.baseLevel = member.baseLevel
            ref.baseExp = member.baseExp
            ref.classLevel = member.classLevel
            ref.classExp = member.classExp
            ref.skillLevels = member.skillLevels
            ref.skillExp = member.skillExp
          }
        }
      }
      finished.push(m)
    } else {
      survivors.push(m)
    }
  }
  state.activeMissions = survivors
}


