import type { GameState, ShopItem, MarketTrend, GuildFacility, Member } from './types'

// Enhanced economy system for tycoon mechanics
export class EconomyManager {
  private static instance: EconomyManager
  private marketTrends: MarketTrend[] = []
  private priceHistory: Map<string, { day: number; price: number }[]> = new Map()

  static getInstance(): EconomyManager {
    if (!EconomyManager.instance) {
      EconomyManager.instance = new EconomyManager()
    }
    return EconomyManager.instance
  }

  // Calculate daily income from various sources
  calculateDailyIncome(state: GameState): number {
    let income = 0

    // Base guild income (reputation-based)
    income += Math.floor(state.reputation * 100)

    // Facility income
    state.facilities.forEach(facility => {
      if (facility.isBuilt) {
        const incomeEffect = facility.effects.find(e => e.type === 'income_bonus')
        if (incomeEffect) {
          income += incomeEffect.value * facility.level
        }
      }
    })

    // Quest completion bonuses
    income += state.guildStats.consecutiveSuccessfulQuests * 50

    // Market trading income
    income += this.calculateMarketIncome(state)

    return Math.floor(income)
  }

  // Calculate market-based income
  private calculateMarketIncome(state: GameState): number {
    let income = 0
    
    state.shop.forEach(item => {
      if (item.stock > 0) {
        const trend = this.getMarketTrend(item.category)
        if (trend?.trend === 'rising') {
          income += Math.floor(item.currentPrice * 0.1) // 10% of item value as income
        }
      }
    })

    return income
  }

  // Update market trends
  updateMarketTrends(state: GameState): void {
    // Remove expired trends
    this.marketTrends = this.marketTrends.filter(trend => 
      state.day < trend.startDay + trend.duration
    )

    // Generate new trends
    if (Math.random() < 0.3) { // 30% chance per day
      this.generateNewMarketTrend(state)
    }

    // Update item prices based on trends
    this.updateItemPrices(state)
  }

  // Generate new market trend
  private generateNewMarketTrend(state: GameState): void {
    const categories = ['weapon', 'armor', 'potion', 'food', 'material', 'accessory']
    const category = categories[Math.floor(Math.random() * categories.length)]
    
    const trends: Array<'rising' | 'falling' | 'stable'> = ['rising', 'falling', 'stable']
    const trend = trends[Math.floor(Math.random() * trends.length)]
    
    const change = trend === 'stable' ? 0 : 
                   trend === 'rising' ? Math.random() * 20 + 10 : 
                   -(Math.random() * 20 + 10)
    
    const duration = Math.floor(Math.random() * 7) + 3 // 3-10 days
    
    const newTrend: MarketTrend = {
      category,
      trend,
      change,
      duration,
      description: this.generateTrendDescription(category, trend, change),
      startDay: state.day
    }
    
    this.marketTrends.push(newTrend)
  }

  // Generate trend description
  private generateTrendDescription(category: string, trend: string, change: number): string {
    const descriptions = {
      rising: [
        `High demand for ${category} drives prices up`,
        `${category} shortage causes price increase`,
        `Noble interest in ${category} raises market value`
      ],
      falling: [
        `${category} oversupply drops prices`,
        `New ${category} source discovered`,
        `Market saturation reduces ${category} value`
      ],
      stable: [
        `${category} market remains balanced`,
        `${category} supply meets demand`,
        `${category} prices stabilize`
      ]
    }
    
    const options = descriptions[trend as keyof typeof descriptions]
    return options[Math.floor(Math.random() * options.length)]
  }

  // Update item prices based on market trends
  private updateItemPrices(state: GameState): void {
    state.shop.forEach(item => {
      const trend = this.getMarketTrend(item.category)
      if (trend) {
        const priceChange = (trend.change / 100) * item.basePrice
        item.currentPrice = Math.max(
          Math.floor(item.basePrice * 0.5), // Minimum 50% of base price
          Math.floor(item.currentPrice + priceChange)
        )
        
        // Update price history
        this.updatePriceHistory(item.id, state.day, item.currentPrice)
      }
    })
  }

  // Get market trend for category
  private getMarketTrend(category: string): MarketTrend | undefined {
    return this.marketTrends.find(trend => trend.category === category)
  }

  // Update price history
  private updatePriceHistory(itemId: string, day: number, price: number): void {
    if (!this.priceHistory.has(itemId)) {
      this.priceHistory.set(itemId, [])
    }
    
    const history = this.priceHistory.get(itemId)!
    history.push({ day, price })
    
    // Keep only last 30 days of history
    if (history.length > 30) {
      history.shift()
    }
  }

  // Calculate facility maintenance costs
  calculateFacilityMaintenance(state: GameState): number {
    let totalCost = 0
    
    state.facilities.forEach(facility => {
      if (facility.isBuilt) {
        totalCost += facility.maintenanceCost * facility.level
      }
    })
    
    return totalCost
  }

  // Calculate member training costs
  calculateTrainingCosts(state: GameState): number {
    let totalCost = 0
    
    state.members.forEach(member => {
      if (member.trainingLevel < 5 && member.lastTrainingDay !== state.day) {
        totalCost += (member.trainingLevel + 1) * 100 // Increasing cost per level
      }
    })
    
    return totalCost
  }

  // Calculate quest success rate based on facilities and member training
  calculateQuestSuccessRate(state: GameState, questDifficulty: number, memberCount: number): number {
    let baseRate = 50 // Base 50% success rate
    
    // Member training bonus
    const avgTrainingLevel = state.members.reduce((sum, m) => sum + m.trainingLevel, 0) / Math.max(1, state.members.length)
    baseRate += avgTrainingLevel * 5 // +5% per training level
    
    // Facility bonuses
    state.facilities.forEach(facility => {
      if (facility.isBuilt) {
        const successEffect = facility.effects.find(e => e.type === 'quest_success_bonus')
        if (successEffect) {
          baseRate += successEffect.value * facility.level
        }
      }
    })
    
    // Difficulty penalty
    baseRate -= (questDifficulty - 5) * 3 // -3% per difficulty level above 5
    
    // Member count bonus
    baseRate += Math.min(memberCount * 2, 20) // +2% per member, max +20%
    
    // Reputation bonus
    baseRate += Math.floor(state.reputation / 10) // +1% per 10 reputation
    
    return Math.max(5, Math.min(95, baseRate)) // Clamp between 5% and 95%
  }

  // Calculate quest profit estimation
  calculateQuestProfit(state: GameState, questReward: number, questDifficulty: number, memberCount: number): number {
    const successRate = this.calculateQuestSuccessRate(state, questDifficulty, memberCount)
    const expectedReward = (questReward * successRate) / 100
    
    // Calculate costs
    const memberCosts = state.members.slice(0, memberCount).reduce((sum, m) => sum + m.upkeep, 0)
    const facilityCosts = this.calculateFacilityMaintenance(state) / 7 // Daily portion
    
    // Calculate net profit
    const netProfit = expectedReward - memberCosts - facilityCosts
    
    return Math.floor(netProfit)
  }

  // Get market insights for the player
  getMarketInsights(state: GameState): string[] {
    const insights: string[] = []
    
    // High-value opportunities
    const risingTrends = this.marketTrends.filter(t => t.trend === 'rising')
    if (risingTrends.length > 0) {
      const bestTrend = risingTrends.reduce((best, current) => 
        current.change > best.change ? current : best
      )
      insights.push(`💹 ${bestTrend.category} prices are rising fast (+${bestTrend.change.toFixed(1)}%)`)
    }
    
    // Bargain opportunities
    const fallingTrends = this.marketTrends.filter(t => t.trend === 'falling')
    if (fallingTrends.length > 0) {
      const bestBargain = fallingTrends.reduce((best, current) => 
        current.change < best.change ? current : best
      )
      insights.push(`📉 ${bestBargain.category} prices are dropping (${bestBargain.change.toFixed(1)}%)`)
    }
    
    // Facility recommendations
    if (state.money > 10000) {
      const unbuiltFacilities = state.facilities.filter(f => !f.isBuilt)
      if (unbuiltFacilities.length > 0) {
        const bestFacility = unbuiltFacilities.reduce((best, current) => 
          current.baseCost < best.baseCost ? current : best
        )
        insights.push(`🏗️ Consider building ${bestFacility.name} for ${bestFacility.baseCost}g`)
      }
    }
    
    return insights
  }

  // Get current market trends
  getCurrentMarketTrends(): MarketTrend[] {
    return [...this.marketTrends]
  }

  // Get price history for an item
  getPriceHistory(itemId: string): { day: number; price: number }[] {
    return this.priceHistory.get(itemId) || []
  }
}

// Export singleton instance
export const economyManager = EconomyManager.getInstance()
