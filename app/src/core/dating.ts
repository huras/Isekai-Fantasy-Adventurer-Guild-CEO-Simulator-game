import type { 
  DatingSystem, 
  RomanticInterest, 
  DatingAction, 
  DatingActionRequirement, 
  RomanceEvent, 
  HeartLevel, 
  DatingStatus, 
  Member, 
  GameState,
  DatingSpecialEvent,
  DatingEventEffect,
  DatingEventChoice
} from './types'

// Heart level colors and descriptions (similar to Harvest Moon)
export const HEART_LEVEL_INFO = {
  0: { color: '#8B4513', name: 'No Interest', description: 'They barely notice you' },
  1: { color: '#FF6B6B', name: 'Acquaintance', description: 'They recognize you as a friend' },
  2: { color: '#FF8E8E', name: 'Friend', description: 'You\'re on friendly terms' },
  3: { color: '#FFB3B3', name: 'Good Friend', description: 'They enjoy your company' },
  4: { color: '#FFD6D6', name: 'Close Friend', description: 'You share a special bond' },
  5: { color: '#FFE6E6', name: 'Crush', description: 'There\'s romantic tension' },
  6: { color: '#FFCCCC', name: 'Dating', description: 'You\'re in a relationship' },
  7: { color: '#FFB3B3', name: 'In Love', description: 'Deep feelings are developing' },
  8: { color: '#FF9999', name: 'Engaged', description: 'Marriage is on the horizon' },
  9: { color: '#FF8080', name: 'Married', description: 'You\'re life partners' },
  10: { color: '#FF6666', name: 'Soulmates', description: 'Perfect love and harmony' }
} as const

// Available dating actions
export const DATING_ACTIONS: DatingAction[] = [
  {
    id: 'conversation',
    name: 'Have a Conversation',
    description: 'Spend time talking and getting to know each other',
    heartGain: 1,
    cost: 0,
    cooldownDays: 0,
    requirements: [],
    isAvailable: () => true
  },
  {
    id: 'gift_flower',
    name: 'Give Flowers',
    description: 'A classic romantic gesture',
    heartGain: 2,
    cost: 50,
    cooldownDays: 1,
    requirements: [],
    isAvailable: () => true
  },
  {
    id: 'gift_jewelry',
    name: 'Give Jewelry',
    description: 'Show your commitment with precious gifts',
    heartGain: 3,
    cost: 200,
    cooldownDays: 3,
    requirements: [
      { type: 'heart_level', value: 3, description: 'Requires at least 3 hearts' }
    ],
    isAvailable: (member, romanticInterest) => romanticInterest.heartLevel >= 3
  },
  {
    id: 'date_walk',
    name: 'Go for a Walk',
    description: 'Take a romantic stroll together',
    heartGain: 2,
    cost: 100,
    cooldownDays: 2,
    requirements: [
      { type: 'heart_level', value: 2, description: 'Requires at least 2 hearts' }
    ],
    isAvailable: (member, romanticInterest) => romanticInterest.heartLevel >= 2
  },
  {
    id: 'date_dinner',
    name: 'Dinner Date',
    description: 'Share a romantic meal together',
    heartGain: 4,
    cost: 300,
    cooldownDays: 4,
    requirements: [
      { type: 'heart_level', value: 4, description: 'Requires at least 4 hearts' }
    ],
    isAvailable: (member, romanticInterest) => romanticInterest.heartLevel >= 4
  },
  {
    id: 'quest_together',
    name: 'Go on a Quest Together',
    description: 'Adventure side by side',
    heartGain: 5,
    cost: 500,
    cooldownDays: 7,
    requirements: [
      { type: 'heart_level', value: 5, description: 'Requires at least 5 hearts' },
      { type: 'guild_level', value: 3, description: 'Requires guild level 3' }
    ],
    isAvailable: (member, romanticInterest) => romanticInterest.heartLevel >= 5
  },
  {
    id: 'proposal',
    name: 'Propose Marriage',
    description: 'Ask for their hand in marriage',
    heartGain: 10,
    cost: 1000,
    cooldownDays: 30,
    requirements: [
      { type: 'heart_level', value: 8, description: 'Requires at least 8 hearts' },
      { type: 'dating_status', value: 'dating', description: 'Must be dating' }
    ],
    isAvailable: (member, romanticInterest) => 
      romanticInterest.heartLevel >= 8 && romanticInterest.datingStatus === 'dating'
  }
]

// Special dating events
export const DATING_SPECIAL_EVENTS: DatingSpecialEvent[] = [
  {
    id: 'valentines_day',
    name: 'Valentine\'s Day',
    description: 'A special day for romance and gifts',
    triggerCondition: (gameState: GameState) => {
      // Trigger on day 14 of any month (simplified)
      return gameState.day % 28 === 14
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
      return gameState.day % 30 === 0
    },
    effects: [
      { type: 'heart_gain', value: 3, target: 'all', description: 'All romantic interests gain 3 hearts' }
    ],
    isOneTime: false,
    hasOccurred: false
  }
]

// Initialize dating system
export function initializeDatingSystem(): DatingSystem {
  return {
    romanticInterests: [],
    availableActions: DATING_ACTIONS,
    marriageEnabled: true,
    childrenEnabled: false, // Future feature
    maxRomanticInterests: 5,
    heartDecayRate: 0.1, // Hearts lost per day without interaction
    specialEvents: DATING_SPECIAL_EVENTS
  }
}

// Create a new romantic interest
export function createRomanticInterest(memberId: string, member: Member): RomanticInterest {
  const personalityTraits = generatePersonalityTraits(member.personality, member.gender)
  const favoriteGifts = generateFavoriteGifts(member.class, personalityTraits)
  const dislikedGifts = generateDislikedGifts(member.class, personalityTraits)
  
  return {
    id: `romance_${memberId}`,
    memberId,
    heartLevel: 0,
    heartProgress: 0,
    datingStatus: 'single',
    totalInteractions: 0,
    favoriteGifts,
    dislikedGifts,
    personalityTraits,
    romanceEvents: []
  }
}

// Auto-create romantic interest when member is recruited
export function autoCreateRomanticInterest(member: Member, datingSystem: DatingSystem): void {
  // Only create for non-player members with gender
  if (member.isPlayer || !member.gender) return
  
  // Check if already exists
  const existing = datingSystem.romanticInterests.find(ri => ri.memberId === member.id)
  if (existing) return
  
  // Check if we have room for more romantic interests
  if (datingSystem.romanticInterests.length >= datingSystem.maxRomanticInterests) return
  
  // Create new romantic interest
  const newInterest = createRomanticInterest(member.id, member)
  datingSystem.romanticInterests.push(newInterest)
}

// Generate personality traits based on character personality
function generatePersonalityTraits(personality: string, gender?: 'male' | 'female'): string[] {
  const traits: string[] = []
  
  switch (personality) {
    case 'heroic':
      traits.push('brave', 'honorable', 'adventurous', 'protective')
      break
    case 'cunning':
      traits.push('intelligent', 'strategic', 'mysterious', 'independent')
      break
    case 'stoic':
      traits.push('calm', 'reliable', 'patient', 'loyal')
      break
    case 'chaotic':
      traits.push('energetic', 'creative', 'unpredictable', 'passionate')
      break
    case 'scholar':
      traits.push('wise', 'curious', 'knowledgeable', 'thoughtful')
      break
  }
  
  // Add gender-specific traits
  if (gender === 'female') {
    traits.push('graceful', 'elegant')
  } else if (gender === 'male') {
    traits.push('chivalrous', 'strong')
  }
  
  return traits
}

// Generate favorite gifts based on class and personality
function generateFavoriteGifts(characterClass: string, traits: string[]): string[] {
  const favorites: string[] = []
  
  // Class-based favorites
  switch (characterClass) {
    case 'Warrior':
      favorites.push('weapon', 'armor', 'strength_potion')
      break
    case 'Mage':
      favorites.push('magic_scroll', 'mana_potion', 'crystal')
      break
    case 'Rogue':
      favorites.push('dagger', 'stealth_item', 'agility_potion')
      break
    case 'Cleric':
      favorites.push('holy_symbol', 'healing_potion', 'blessed_item')
      break
    case 'Ranger':
      favorites.push('bow', 'nature_item', 'survival_gear')
      break
  }
  
  // Trait-based favorites
  if (traits.includes('brave')) favorites.push('courage_medal')
  if (traits.includes('intelligent')) favorites.push('ancient_tome')
  if (traits.includes('graceful')) favorites.push('elegant_clothing')
  if (traits.includes('passionate')) favorites.push('romance_novel')
  
  return favorites
}

// Generate disliked gifts based on class and personality
function generateDislikedGifts(characterClass: string, traits: string[]): string[] {
  const disliked: string[] = []
  
  // Class-based dislikes
  switch (characterClass) {
    case 'Warrior':
      disliked.push('magic_scroll', 'delicate_item')
      break
    case 'Mage':
      disliked.push('heavy_armor', 'crude_weapon')
      break
    case 'Rogue':
      disliked.push('heavy_armor', 'loud_item')
      break
    case 'Cleric':
      disliked.push('dark_item', 'cursed_object')
      break
    case 'Ranger':
      disliked.push('urban_item', 'confined_space')
      break
  }
  
  // Trait-based dislikes
  if (traits.includes('honorable')) disliked.push('stolen_goods')
  if (traits.includes('mysterious')) disliked.push('common_item')
  if (traits.includes('chaotic')) disliked.push('boring_item')
  
  return disliked
}

// Perform a dating action
export function performDatingAction(
  action: DatingAction,
  romanticInterest: RomanticInterest,
  member: Member,
  gameState: GameState
): { success: boolean; heartGain: number; message: string } {
  // Check if action is available
  if (!action.isAvailable(member, romanticInterest)) {
    return {
      success: false,
      heartGain: 0,
      message: 'This action is not available at this time.'
    }
  }
  
  // Check cooldown
  const lastEvent = romanticInterest.romanceEvents
    .filter(e => e.type === action.id)
    .sort((a, b) => b.day - a.day)[0]
  
  if (lastEvent && gameState.day - lastEvent.day < action.cooldownDays) {
    return {
      success: false,
      heartGain: 0,
      message: `This action is on cooldown. Available again in ${action.cooldownDays - (gameState.day - lastEvent.day)} days.`
    }
  }
  
  // Check if player can afford it
  if (gameState.money < action.cost) {
    return {
      success: false,
      heartGain: 0,
      message: 'You don\'t have enough money for this action.'
    }
  }
  
  // Calculate heart gain with modifiers
  let heartGain = action.heartGain
  
  // Bonus for favorite gifts
  if (action.id.includes('gift') && action.id !== 'gift_flower') {
    // Check if it's a favorite gift (simplified)
    heartGain += 1
  }
  
  // Bonus for high heart level
  if (romanticInterest.heartLevel >= 5) {
    heartGain += 1
  }
  
  // Create romance event
  const romanceEvent: RomanceEvent = {
    id: `event_${Date.now()}`,
    type: action.id.includes('gift') ? 'gift' : 'conversation',
    day: gameState.day,
    description: `${action.name} with ${member.name}`,
    heartGain
  }
  
  // Update romantic interest
  romanticInterest.romanceEvents.push(romanceEvent)
  romanticInterest.lastInteractionDay = gameState.day
  romanticInterest.totalInteractions++
  
  // Update heart level and progress
  const newProgress = romanticInterest.heartProgress + heartGain
  if (newProgress >= 100) {
    romanticInterest.heartLevel = Math.min(10, romanticInterest.heartLevel + 1) as HeartLevel
    romanticInterest.heartProgress = newProgress - 100
    
    // Update dating status based on heart level
    if (romanticInterest.heartLevel >= 6 && romanticInterest.datingStatus === 'single') {
      romanticInterest.datingStatus = 'dating'
      romanticInterest.relationshipStartDay = gameState.day
    }
  } else {
    romanticInterest.heartProgress = newProgress
  }
  
  return {
    success: true,
    heartGain,
    message: `${action.name} successful! ${member.name} gained ${heartGain} hearts.`
  }
}

// Daily heart decay
export function processHeartDecay(datingSystem: DatingSystem, gameState: GameState): void {
  datingSystem.romanticInterests.forEach(interest => {
    if (interest.lastInteractionDay && gameState.day - interest.lastInteractionDay > 7) {
      // Lose hearts if no interaction for more than a week
      const daysSinceInteraction = gameState.day - interest.lastInteractionDay
      const heartLoss = Math.floor(daysSinceInteraction * datingSystem.heartDecayRate)
      
      if (heartLoss > 0) {
        interest.heartProgress = Math.max(0, interest.heartProgress - heartLoss)
        
        // Lose heart level if progress goes below 0
        if (interest.heartProgress < 0) {
          interest.heartLevel = Math.max(0, interest.heartLevel - 1) as HeartLevel
          interest.heartProgress = 100 + interest.heartProgress
        }
      }
    }
  })
}

// Check for special events
export function checkSpecialEvents(datingSystem: DatingSystem, gameState: GameState): DatingSpecialEvent[] {
  return datingSystem.specialEvents.filter(event => {
    if (event.isOneTime && event.hasOccurred) return false
    return event.triggerCondition(gameState)
  })
}

// Get heart level display info
export function getHeartLevelInfo(heartLevel: HeartLevel) {
  return HEART_LEVEL_INFO[heartLevel]
}

// Get heart level emoji
export function getHeartLevelEmoji(heartLevel: HeartLevel): string {
  if (heartLevel === 0) return '🤍'
  if (heartLevel <= 2) return '💙'
  if (heartLevel <= 4) return '💚'
  if (heartLevel <= 6) return '💛'
  if (heartLevel <= 8) return '🧡'
  return '❤️'
}
