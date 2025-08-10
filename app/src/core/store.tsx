import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import type { GameState, Member } from './types'
import { generateCandidates } from './recruitment'
import { autoAssignAndRun, generateQuestList } from './quests'

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
  archives: { quests: [], candidates: [] },
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
    async nextDay() {
      // Advance day and compute current week
      state.day += 1
      const previousWeek = state.week
      state.week = Math.floor((state.day - 1) / 7) + 1

      // Daily: expire outdated quests, log, and archive
      const [activeQuests, expiredQuests] = state.quests.reduce<[typeof state.quests, typeof state.archives.quests]>(
        (acc, q) => {
          if (q.expiresOnDay > state.day) acc[0].push(q)
          else acc[1].push({ id: q.id, name: q.name, expiredOnDay: state.day })
          return acc
        },
        [[], []]
      )
      state.quests = activeQuests
      if (expiredQuests.length) {
        state.archives.quests.unshift(...expiredQuests)
        expiredQuests.forEach(eq => state.logs.events.unshift(`Quest expired: ${eq.name} (D${eq.expiredOnDay})`))
      }

      // Daily: generate new quests and append
      const newQuests = generateQuestList(state.notoriety, state.day)
      state.quests = [...state.quests, ...newQuests]

      // Weekly: refresh recruitment at week change
      if (state.week !== previousWeek) {
        // Remove expired candidates, log, and archive
        const surviving: typeof state.candidates = []
        const expired: typeof state.archives.candidates = []
        for (const c of state.candidates) {
          if (c.expiresOnWeek > state.week) {
            surviving.push(c)
          } else {
            expired.push({
              id: c.id,
              name: c.name,
              class: c.class,
              expiredOnWeek: state.week,
              weekAppeared: c.weekAppeared,
              gender: c.gender,
              appearance: c.appearance,
              avatar: c.avatar,
              stats: c.stats,
              upkeep: c.upkeep,
              personality: c.personality,
            })
          }
        }
        state.candidates = surviving
        if (expired.length) {
          state.archives.candidates.unshift(...expired)
          expired.forEach(ec => state.logs.events.unshift(`Candidate expired: ${ec.name} — ${ec.class} (W${ec.expiredOnWeek})`))
        }
        // Append new weekly candidates
        const newCandidates = await generateCandidates(state.notoriety, state.week)
        state.candidates = [...state.candidates, ...newCandidates]
      }

      // Optional: auto-assign and run if setting enabled
      if (state.settings.autoAssign) {
        autoAssignAndRun(state)
      }

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


