import type { GameState, Member, Quest } from './types'

function uid(prefix = 'quest') { return `${prefix}_${Math.random().toString(36).slice(2, 9)}` }

export function calculateMemberPower(member: Member): number {
  const stats = member.stats || { str: 5, int: 5, agi: 5, spr: 5 }
  const values = [stats.str, stats.int, stats.agi, stats.spr].sort((a, b) => b - a)
  const topTwo = (values[0] || 0) + (values[1] || 0)
  return topTwo + Math.floor(member.speed || 1)
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

export function generateQuestList(notoriety: number, day: number): Quest[] {
  const tier = notoriety < 10 ? 1 : notoriety < 25 ? 2 : notoriety < 50 ? 3 : 4
  const base = [
    { name: 'Rat Problem', diff: 1, reward: 30, fame: 1 },
    { name: 'Lost Parcel', diff: 2, reward: 45, fame: 1 },
    { name: 'Herb Gathering', diff: 2, reward: 50, fame: 2 },
  ]
  const t2 = [
    { name: 'Bandit Ambush', diff: 4, reward: 120, fame: 4 },
    { name: 'Escort Caravan', diff: 5, reward: 150, fame: 5 },
    { name: 'Slime Extermination', diff: 4, reward: 110, fame: 3 },
  ]
  const t3 = [
    { name: 'Wyvern Hunt', diff: 8, reward: 340, fame: 10 },
    { name: 'Cursed Ruins', diff: 9, reward: 380, fame: 12 },
    { name: 'Royal Reconnaissance', diff: 7, reward: 300, fame: 9 },
  ]
  const t4 = [
    { name: 'Demon Lord Vanguard', diff: 12, reward: 800, fame: 25 },
    { name: 'Ancient Dragon', diff: 14, reward: 1100, fame: 30 },
    { name: 'Abyssal Rift', diff: 15, reward: 1300, fame: 40 },
  ]
  const pool = tier === 1 ? base : tier === 2 ? base.concat(t2) : tier === 3 ? t2.concat(t3) : t3.concat(t4)
  const count = Math.min(8, Math.max(3, 3 + Math.floor(notoriety / 15)))
  const list: Quest[] = []
  for (let i = 0; i < count; i++) {
    const q = { ...pool[Math.floor(Math.random() * pool.length)] }
    list.push({ id: uid(), name: q.name, diff: q.diff, reward: q.reward, fame: q.fame, day, expiresOnDay: expirationDayFor(q.diff, day) })
  }
  return list
}

export function assignMember(state: GameState, questId: string, memberId: string) {
  const quest = state.quests.find(q => q.id === questId)
  const member = state.members.find(m => m.id === memberId)
  if (!quest || !member) return
  quest.assigned = quest.assigned || []
  if (quest.assigned.find(m => m.id === memberId)) return
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
    state.logs.events.unshift('Assign at least one member to run a quest')
    return
  }
  const teamPower = party.map(calculateMemberPower).reduce((a, b) => a + b, 0)
  const target = quest.diff * 10
  const bonus = state.modifiers.questSuccessBonus || 0
  let successChance = Math.max(10, Math.min(90, Math.round((teamPower / target) * 60 + 20 + bonus)))
  successChance = Math.max(5, Math.min(95, successChance))
  const roll = Math.floor(Math.random() * 100) + 1
  const success = roll <= successChance

  if (success) {
    state.money = Math.max(0, Math.floor(state.money + quest.reward))
    state.notoriety = Math.max(0, Math.floor(state.notoriety + quest.fame))
    state.logs.events.unshift(`${party.length} member(s) completed ${quest.name}. Success ${successChance}% (roll ${roll}). +${quest.reward}g, +${quest.fame} notoriety`)
  } else {
    state.logs.events.unshift(`${party.length} member(s) failed ${quest.name}. Success ${successChance}% (roll ${roll}).`)
  }
  // Remove quest
  state.quests = state.quests.filter(q => q.id !== questId)
}

export function autoAssignAndRun(state: GameState) {
  const sorted = [...state.members].sort((a, b) => calculateMemberPower(b) - calculateMemberPower(a))
  for (const quest of state.quests) {
    quest.assigned = []
    const needed = Math.min(3, Math.max(1, Math.floor(quest.diff / 3)))
    for (let i = 0; i < needed && sorted.length > 0; i++) {
      quest.assigned.push(sorted.shift()!)
    }
    runQuest(state, quest.id)
  }
}


