import type { GameState } from './types'

export function rollDailyEvent(state: GameState) {
  const chance = 0.35
  if (Math.random() > chance) return
  const seeds = [
    '🎁 A mysterious benefactor donates equipment. Strings attached?',
    '🏴‍☠️ A rival guild undercuts your contracts; tensions rise.',
    '👹 Rumors of the Demon Lord’s new lieutenant spread fear.',
    '📚 A noble requests an escort to a haunted library.',
    '⚒️ A blacksmith offers discount repairs after a rousing pub tale.',
    '🎉 The town holds a festival; morale and prices fluctuate.',
  ]
  const line = seeds[Math.floor(Math.random() * seeds.length)]
  const stamp = new Date().toLocaleString()
  const summary = `${line} (${stamp})`

  // Minor effects
  const roll = Math.floor(Math.random() * 4) + 1
  switch (roll) {
    case 1:
      state.money += 25
      state.logs.events.unshift(`💰 Windfall! +25g.`)
      break
    case 2:
      state.money = Math.max(0, state.money - 15)
      state.logs.events.unshift(`🪙 Unexpected expense −15g.`)
      break
    case 3:
      state.notoriety += 2
      state.logs.events.unshift(`⭐ Word spreads: +2 notoriety.`)
      break
    default:
      break
  }
  state.logs.events.unshift(summary)
}


