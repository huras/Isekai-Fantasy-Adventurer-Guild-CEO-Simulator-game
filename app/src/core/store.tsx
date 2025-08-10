import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import type { GameState, Member, Quest } from './types'

const initialState: GameState = {
  day: 1,
  week: 1,
  money: 100,
  notoriety: 0,
  members: [],
  candidates: [],
  quests: [],
  inventory: [],
  shop: [],
  logs: { events: [], battle: [] },
  modifiers: { upkeepDeltaPerMember: 0, questSuccessBonus: 0, recruitStatBonus: 0 },
  settings: { autoAssign: false },
}

type Action = { type: 'emit' | 'load'; payload?: GameState }

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'load':
      return action.payload ?? state
    case 'emit':
    default:
      return { ...state }
  }
}

const StoreContext = createContext<{ state: GameState; emit: () => void; actions: {
  nextDay: () => void; save: () => void; load: () => void; reset: () => void;
} } | null>(null)

const STORAGE_KEY = 'guildSim_ts_v1'

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)

  // Ensure player exists
  useEffect(() => {
    if (!state.members.some(m => m.isPlayer)) {
      const player: Member = {
        id: 'player', isPlayer: true, name: 'You', class: 'Guildmaster', personality: 'heroic', gender: 'male',
        appearance: '♂️ Summoned human with dark hair and determined eyes; beauty 7/10',
        upkeep: 0, stats: { str: 6, int: 6, agi: 6, spr: 6 }, hpMax: 40, hp: 40, speed: 3, skills: ['Leadership', 'Tactics'],
      }
      // Direct mutate then emit for simplicity
      ;(state.members as Member[]).push(player)
      dispatch({ type: 'emit' })
    }
  }, [state.members])

  const actions = useMemo(() => ({
    nextDay() {
      state.day += 1
      state.week = Math.floor((state.day - 1) / 7) + 1
      dispatch({ type: 'emit' })
    },
    save() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
      state.logs.events.unshift('Game saved')
      dispatch({ type: 'emit' })
    },
    load() {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      try {
        const data = JSON.parse(raw) as GameState
        dispatch({ type: 'load', payload: data })
      } catch {}
    },
    reset() {
      localStorage.removeItem(STORAGE_KEY)
      Object.assign(state, initialState)
      dispatch({ type: 'emit' })
    },
  }), [state])

  const value = useMemo(() => ({ state, emit: () => dispatch({ type: 'emit' }), actions }), [state, actions])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('StoreProvider missing')
  return ctx
}


