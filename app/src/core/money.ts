import type { GameState } from './types'

export function addMoney(state: GameState, amount: number) {
  state.money = Math.max(0, Math.floor(state.money + amount))
}

export function spendMoney(state: GameState, amount: number) {
  state.money = Math.max(0, Math.floor(state.money - amount))
}

export function dailyUpkeep(state: GameState) {
  const base = state.members.reduce((sum, m) => sum + (m.upkeep || 0), 0)
  const mod = (state.modifiers.upkeepDeltaPerMember || 0) * state.members.length
  return Math.max(0, Math.floor(base + mod))
}



