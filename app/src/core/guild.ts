import type { GameState, GuildFacility, GuildUpgrade, Achievement, QuestChain, GuildStats, GameGoal } from './types'
import { economyManager } from './economy'

// Guild management system for tycoon mechanics
export class GuildManager {
  private static instance: GuildManager

  static getInstance(): GuildManager {
    if (!GuildManager.instance) {
      GuildManager.instance = new GuildManager()
    }
    return GuildManager.instance
  }

  // Initialize guild with starting facilities and upgrades
  initializeGuild(state: GameState): void {
    // Initialize guild stats
    state.guildLevel = 1
    state.guildExp = 0
    state.guildExpToNext = 1000
    state.reputation = 10
    state.influence = 5

    // Initialize facilities
    state.facilities = this.getInitialFacilities()
    
    // Initialize upgrades
    state.upgrades = this.getInitialUpgrades()
    
    // Initialize achievements
    state.achievements = this.getInitialAchievements()
    
    // Initialize quest chains
    state.questChains = []
    
    // Initialize guild stats
    state.guildStats = {
      totalQuestsCompleted: 0,
      totalMoneyEarned: 0,
      totalMembersRecruited: 0,
      totalMembersLost: 0,
      longestQuestChain: 0,
      highestRankQuest: 'H',
      daysSinceLastLoss: 0,
      consecutiveSuccessfulQuests: 0
    }

    // Initialize goals
    state.goals = this.getInitialGoals()
    
    // Initialize tutorial
    state.tutorial = {
      currentStep: 1,
      completedSteps: [],
      isActive: true,
      currentTip: "Welcome to your guild! Start by recruiting some adventurers."
    }
  }

  // Get initial facilities
  private getInitialFacilities(): GuildFacility[] {
    return [
      {
        id: 'guild_hall',
        name: 'Guild Hall',
        description: 'The heart of your guild operations',
        level: 1,
        maxLevel: 5,
        baseCost: 0, // Already built
        upgradeCost: 5000,
        effects: [
          { type: 'quest_success_bonus', value: 5, description: '+5% quest success rate per level' }
        ],
        isBuilt: true,
        maintenanceCost: 100
      },
      {
        id: 'training_grounds',
        name: 'Training Grounds',
        description: 'Improve member skills and loyalty',
        level: 0,
        maxLevel: 3,
        baseCost: 3000,
        upgradeCost: 2000,
        effects: [
          { type: 'training_bonus', value: 10, description: '+10% training effectiveness per level' }
        ],
        isBuilt: false,
        maintenanceCost: 50
      },
      {
        id: 'recruitment_office',
        name: 'Recruitment Office',
        description: 'Attract better candidates and negotiate better terms',
        level: 0,
        maxLevel: 3,
        baseCost: 2000,
        upgradeCost: 1500,
        effects: [
          { type: 'recruit_bonus', value: 15, description: '+15% candidate quality per level' }
        ],
        isBuilt: false,
        maintenanceCost: 75
      },
      {
        id: 'market_stall',
        name: 'Market Stall',
        description: 'Generate passive income from market trading',
        level: 0,
        maxLevel: 3,
        baseCost: 1500,
        upgradeCost: 1000,
        effects: [
          { type: 'income_bonus', value: 200, description: '+200g daily income per level' }
        ],
        isBuilt: false,
        maintenanceCost: 25
      },
      {
        id: 'armory',
        name: 'Armory',
        description: 'Store and maintain equipment',
        level: 0,
        maxLevel: 3,
        baseCost: 2500,
        upgradeCost: 2000,
        effects: [
          { type: 'upkeep_reduction', value: 5, description: '-5% member upkeep per level' }
        ],
        isBuilt: false,
        maintenanceCost: 100
      }
    ]
  }

  // Get initial upgrades
  private getInitialUpgrades(): GuildUpgrade[] {
    return [
      {
        id: 'auto_quest_assignment',
        name: 'Auto Quest Assignment',
        description: 'Automatically assign members to suitable quests',
        cost: 1000,
        isPurchased: false,
        effects: [
          { type: 'quest_success_bonus', value: 3, description: '+3% quest success rate' }
        ],
        requirements: [
          { type: 'member_count', value: 3 }
        ]
      },
      {
        id: 'advanced_training',
        name: 'Advanced Training Methods',
        description: 'More effective training programs',
        cost: 2000,
        isPurchased: false,
        effects: [
          { type: 'training_bonus', value: 20, description: '+20% training effectiveness' }
        ],
        requirements: [
          { type: 'facility_level', value: 2, target: 'training_grounds' }
        ]
      },
      {
        id: 'market_insights',
        name: 'Market Insights',
        description: 'Better understanding of market trends',
        cost: 1500,
        isPurchased: false,
        effects: [
          { type: 'income_bonus', value: 100, description: '+100g daily income' }
        ],
        requirements: [
          { type: 'facility_level', value: 1, target: 'market_stall' }
        ]
      }
    ]
  }

  // Get initial achievements
  private getInitialAchievements(): Achievement[] {
    return [
      {
        id: 'first_quest',
        name: 'First Steps',
        description: 'Complete your first quest',
        isUnlocked: false,
        progress: 0,
        maxProgress: 1,
        reward: { type: 'money', value: 500 }
      },
      {
        id: 'recruit_three',
        name: 'Growing Team',
        description: 'Recruit 3 guild members',
        isUnlocked: false,
        progress: 0,
        maxProgress: 3,
        reward: { type: 'notoriety', value: 10 }
      },
      {
        id: 'complete_chain',
        name: 'Chain Master',
        description: 'Complete a quest chain',
        isUnlocked: false,
        progress: 0,
        maxProgress: 1,
        reward: { type: 'facility_unlock', value: 0, facilityId: 'training_grounds' }
      },
      {
        id: 'reach_level_5',
        name: 'Guild Master',
        description: 'Reach guild level 5',
        isUnlocked: false,
        progress: 0,
        maxProgress: 5,
        reward: { type: 'money', value: 5000 }
      }
    ]
  }

  // Get initial goals
  private getInitialGoals(): GameGoal[] {
    return [
      {
        id: 'establish_guild',
        name: 'Establish Your Guild',
        description: 'Build a solid foundation for your guild',
        type: 'short_term',
        target: 1,
        current: 0,
        reward: {
          money: 1000,
          notoriety: 5,
          reputation: 10,
          influence: 5,
          items: []
        },
        isCompleted: false,
        deadline: 7 // 1 week
      },
      {
        id: 'recruit_team',
        name: 'Build Your Team',
        description: 'Recruit 5 guild members',
        type: 'short_term',
        target: 5,
        current: 0,
        reward: {
          money: 2000,
          notoriety: 10,
          reputation: 15,
          influence: 10,
          items: []
        },
        isCompleted: false,
        deadline: 14 // 2 weeks
      }
    ]
  }

  // Build a facility
  buildFacility(state: GameState, facilityId: string): boolean {
    const facility = state.facilities.find(f => f.id === facilityId)
    if (!facility || facility.isBuilt) return false
    
    if (state.money >= facility.baseCost) {
      state.money -= facility.baseCost
      facility.isBuilt = true
      facility.level = 1
      
      // Add guild experience
      this.addGuildExperience(state, 100)
      
      // Check for achievements
      this.checkAchievements(state)
      
      return true
    }
    
    return false
  }

  // Upgrade a facility
  upgradeFacility(state: GameState, facilityId: string): boolean {
    const facility = state.facilities.find(f => f.id === facilityId)
    if (!facility || !facility.isBuilt || facility.level >= facility.maxLevel) return false
    
    if (state.money >= facility.upgradeCost) {
      state.money -= facility.upgradeCost
      facility.level++
      
      // Increase upgrade cost for next level
      facility.upgradeCost = Math.floor(facility.upgradeCost * 1.5)
      
      // Add guild experience
      this.addGuildExperience(state, 200)
      
      // Check for achievements
      this.checkAchievements(state)
      
      return true
    }
    
    return false
  }

  // Purchase an upgrade
  purchaseUpgrade(state: GameState, upgradeId: string): boolean {
    const upgrade = state.upgrades.find(u => u.id === upgradeId)
    if (!upgrade || upgrade.isPurchased) return false
    
    // Check requirements
    if (!this.checkUpgradeRequirements(state, upgrade)) return false
    
    if (state.money >= upgrade.cost) {
      state.money -= upgrade.cost
      upgrade.isPurchased = true
      
      // Apply effects
      this.applyUpgradeEffects(state, upgrade)
      
      // Add guild experience
      this.addGuildExperience(state, 150)
      
      return true
    }
    
    return false
  }

  // Check if upgrade requirements are met
  private checkUpgradeRequirements(state: GameState, upgrade: GuildUpgrade): boolean {
    return upgrade.requirements.every(req => {
      switch (req.type) {
        case 'facility_level':
          const facility = state.facilities.find(f => f.id === req.target)
          return facility ? facility.level >= req.value : false
        case 'member_count':
          return state.members.length >= req.value
        case 'notoriety':
          return state.notoriety >= req.value
        case 'money':
          return state.money >= req.value
        case 'quests_completed':
          return state.guildStats.totalQuestsCompleted >= req.value
        default:
          return false
      }
    })
  }

  // Apply upgrade effects
  private applyUpgradeEffects(state: GameState, upgrade: GuildUpgrade): void {
    upgrade.effects.forEach(effect => {
      // Effects are applied through the economy manager calculations
      // This is just for tracking purposes
    })
  }

  // Add guild experience
  addGuildExperience(state: GameState, amount: number): void {
    state.guildExp += amount
    
    // Check for level up
    while (state.guildExp >= state.guildExpToNext) {
      state.guildExp -= state.guildExpToNext
      state.guildLevel++
      
      // Increase experience needed for next level
      state.guildExpToNext = Math.floor(state.guildExpToNext * 1.2)
      
      // Level up bonuses
      state.reputation = Math.min(100, state.reputation + 2)
      state.influence = Math.min(100, state.influence + 1)
      
      // Check for achievements
      this.checkAchievements(state)
    }
  }

  // Check and unlock achievements
  checkAchievements(state: GameState): void {
    state.achievements.forEach(achievement => {
      if (achievement.isUnlocked) return
      
      let progress = 0
      let maxProgress = achievement.maxProgress
      
      switch (achievement.id) {
        case 'first_quest':
          progress = state.guildStats.totalQuestsCompleted > 0 ? 1 : 0
          break
        case 'recruit_three':
          progress = Math.min(state.members.length, 3)
          break
        case 'complete_chain':
          progress = state.questChains.some(chain => chain.isCompleted) ? 1 : 0
          break
        case 'reach_level_5':
          progress = Math.min(state.guildLevel, 5)
          break
      }
      
      achievement.progress = progress
      
      if (progress >= maxProgress && !achievement.isUnlocked) {
        this.unlockAchievement(state, achievement)
      }
    })
  }

  // Unlock an achievement
  private unlockAchievement(state: GameState, achievement: Achievement): void {
    achievement.isUnlocked = true
    achievement.unlockedAt = state.day
    
    // Apply rewards
    if (achievement.reward) {
      switch (achievement.reward.type) {
        case 'money':
          state.money += achievement.reward.value
          break
        case 'notoriety':
          state.notoriety += achievement.reward.value
          break
        case 'facility_unlock':
          if (achievement.reward.facilityId) {
            const facility = state.facilities.find(f => f.id === achievement.reward.facilityId)
            if (facility) {
              facility.isBuilt = true
              facility.level = 1
            }
          }
          break
      }
    }
    
    // Add guild experience
    this.addGuildExperience(state, 300)
  }

  // Update guild stats
  updateGuildStats(state: GameState): void {
    // Update consecutive successful quests
    if (state.guildStats.consecutiveSuccessfulQuests > 0) {
      state.guildStats.daysSinceLastLoss++
    }
    
    // Check for goal completion
    this.checkGoalCompletion(state)
  }

  // Check goal completion
  private checkGoalCompletion(state: GameState): void {
    state.goals.forEach(goal => {
      if (goal.isCompleted) return
      
      let current = 0
      
      switch (goal.id) {
        case 'establish_guild':
          current = state.facilities.filter(f => f.isBuilt).length
          break
        case 'recruit_team':
          current = state.members.length
          break
      }
      
      goal.current = current
      
      if (current >= goal.target) {
        this.completeGoal(state, goal)
      }
    })
  }

  // Complete a goal
  private completeGoal(state: GameState, goal: GameGoal): void {
    goal.isCompleted = true
    
    // Apply rewards
    state.money += goal.reward.money
    state.notoriety += goal.reward.notoriety
    state.reputation = Math.min(100, state.reputation + goal.reward.reputation)
    state.influence = Math.min(100, state.influence + goal.reward.influence)
    
    // Add guild experience
    this.addGuildExperience(state, 500)
    
    // Generate new goals
    this.generateNewGoals(state)
  }

  // Generate new goals
  private generateNewGoals(state: GameState): void {
    const completedGoals = state.goals.filter(g => g.isCompleted).length
    
    if (completedGoals >= 2 && state.goals.length < 4) {
      // Add medium-term goal
      const mediumGoal: GameGoal = {
        id: 'expand_facilities',
        name: 'Expand Your Facilities',
        description: 'Build and upgrade 3 different facilities',
        type: 'medium_term',
        target: 3,
        current: state.facilities.filter(f => f.isBuilt && f.level > 1).length,
        reward: {
          money: 5000,
          notoriety: 20,
          reputation: 25,
          influence: 20,
          items: []
        },
        isCompleted: false,
        deadline: 30 // 1 month
      }
      
      state.goals.push(mediumGoal)
    }
  }

  // Get available upgrades
  getAvailableUpgrades(state: GameState): GuildUpgrade[] {
    return state.upgrades.filter(upgrade => 
      !upgrade.isPurchased && this.checkUpgradeRequirements(state, upgrade)
    )
  }

  // Get facility recommendations
  getFacilityRecommendations(state: GameState): string[] {
    const recommendations: string[] = []
    
    if (state.members.length >= 3 && !state.facilities.find(f => f.id === 'training_grounds')?.isBuilt) {
      recommendations.push('🏋️ Build Training Grounds to improve member skills')
    }
    
    if (state.money > 5000 && !state.facilities.find(f => f.id === 'market_stall')?.isBuilt) {
      recommendations.push('💰 Build Market Stall for passive income')
    }
    
    if (state.members.length >= 5 && !state.facilities.find(f => f.id === 'recruitment_office')?.isBuilt) {
      recommendations.push('👥 Build Recruitment Office for better candidates')
    }
    
    return recommendations
  }
}

// Export singleton instance
export const guildManager = GuildManager.getInstance()

