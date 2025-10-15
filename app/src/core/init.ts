import { guildManager } from './guild'
import { economyManager } from './economy'
import type { GameState } from './types'

// Initialize the guild system with new tycoon mechanics
export function initializeGuildSystem(state: GameState): void {
  // Initialize guild if not already done
  if (!state.facilities || state.facilities.length === 0) {
    guildManager.initializeGuild(state)
  }
  
  // Initialize economy system
  economyManager.updateMarketTrends(state)
}

// Add missing properties to existing members
export function upgradeExistingMembers(state: GameState): void {
  state.members.forEach(member => {
    if (member.loyalty === undefined) {
      member.loyalty = 50 // Default loyalty
    }
    if (member.trainingLevel === undefined) {
      member.trainingLevel = 0 // Default training level
    }
    if (member.questsCompleted === undefined) {
      member.questsCompleted = 0
    }
    if (member.questsFailed === undefined) {
      member.questsFailed = 0
    }
    if (member.totalEarnings === undefined) {
      member.totalEarnings = 0
    }
  })
}

// Add missing properties to existing candidates
export function upgradeExistingCandidates(state: GameState): void {
  state.candidates.forEach(candidate => {
    if (candidate.potential === undefined) {
      candidate.potential = Math.floor(Math.random() * 10) + 1
    }
    if (candidate.loyalty === undefined) {
      candidate.loyalty = Math.floor(Math.random() * 50) + 25
    }
    if (candidate.askingSalary === undefined) {
      candidate.askingSalary = Math.floor(Math.random() * 200) + 100
    }
    if (candidate.experience === undefined) {
      candidate.experience = Math.floor(Math.random() * 10) + 1
    }
    if (candidate.reputation === undefined) {
      candidate.reputation = Math.floor(Math.random() * 50) + 25
    }
  })
}

// Add missing properties to existing quests
export function upgradeExistingQuests(state: GameState): void {
  state.quests.forEach(quest => {
    if (quest.difficulty === undefined) {
      quest.difficulty = quest.diff || 1
    }
    if (quest.riskLevel === undefined) {
      const diff = quest.difficulty || 1
      if (diff <= 3) quest.riskLevel = 'low'
      else if (diff <= 6) quest.riskLevel = 'medium'
      else if (diff <= 10) quest.riskLevel = 'high'
      else quest.riskLevel = 'extreme'
    }
    if (quest.daysRequired === undefined) {
      quest.daysRequired = 1
    }
  })
}

// Main initialization function
export function initializeGameSystems(state: GameState): void {
  console.log('Initializing guild systems...')
  
  // Initialize guild system
  initializeGuildSystem(state)
  
  // Upgrade existing data structures
  upgradeExistingMembers(state)
  upgradeExistingCandidates(state)
  upgradeExistingQuests(state)
  
  console.log('Guild systems initialized successfully!')
}

