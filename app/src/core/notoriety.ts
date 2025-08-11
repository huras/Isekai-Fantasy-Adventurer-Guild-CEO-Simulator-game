import type { GameState } from './types'

export function addNotoriety(state: GameState, amount: number) {
  state.notoriety = Math.max(0, Math.floor(state.notoriety + amount))
}



