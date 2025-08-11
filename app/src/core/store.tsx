import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import type { GameState, Member, ShopItem } from './types'
import { generateCandidates } from './recruitment'
import { advanceMissionsOneDay, autoAssign, generateQuestList } from './quests'
import { dailyUpkeep, spendMoney } from './money'
// import { generateInitialShop } from './items'

const initialState: GameState = {
  day: 1,
  week: 1,
  money: 100,
  notoriety: 0,
  members: [],
  candidates: [],
  quests: [],
  activeMissions: [],
  inventory: [],
  shop: [],
  itemsCatalog: [],
  itemsLoaded: false,
  kitchen: { foodStorage: [], waitingForBreakfast: [] },
  logs: { events: [], battle: [] },
  archives: { quests: [], candidates: [], fallen: [] },
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

const defaultStore: { state: GameState; emit: () => void; actions: {
  nextDay: () => void; save: () => void; load: () => void; reset: () => void; serveBreakfast: () => void;
} } = {
  state: {
    day: 1,
    week: 1,
    money: 0,
    notoriety: 0,
    members: [],
    candidates: [],
    quests: [],
    activeMissions: [],
    inventory: [],
    shop: [],
    itemsCatalog: [],
    itemsLoaded: false,
    kitchen: { foodStorage: [], waitingForBreakfast: [] },
    logs: { events: [], battle: [] },
    archives: { quests: [], candidates: [], fallen: [] },
    modifiers: { upkeepDeltaPerMember: 0, questSuccessBonus: 0, recruitStatBonus: 0 },
    settings: { autoAssign: false },
  },
  emit: () => {},
  actions: { nextDay: () => {}, save: () => {}, load: () => {}, reset: () => {}, serveBreakfast: () => {} },
}

const StoreContext = createContext(defaultStore)

const STORAGE_KEY = 'guildSim_ts_v1'

export function StoreProvider({ children, initial }: { children: React.ReactNode; initial?: Partial<GameState> }) {
  const [state, dispatch] = useReducer(reducer, { ...initialState, ...(initial || {}) })

  // Ensure player exists
  useEffect(() => {
    if (!state.members.some(m => m.isPlayer)) {
      const player: Member = {
        id: 'player', isPlayer: true, name: 'You', class: 'Guildmaster', personality: 'heroic', gender: 'male',
        appearance: '♂️ Summoned human with dark hair and determined eyes; beauty 7/10',
        upkeep: 0, stats: { str: 6, int: 6, agi: 6, spr: 6 }, hpMax: 40, hp: 40, speed: 3, skills: ['Leadership', 'Tactics'],
        items: [ { id: 'starter_weapon', name: 'Starter Sword', price: 0, category: 'weapon', sprite: { row: 5, col: 0 }, apply() {} } ],
      }
      // Direct mutate then emit for simplicity
      ;(state.members as Member[]).push(player)
      dispatch({ type: 'emit' })
    }
  }, [state.members])

  // Seed shop on initial mount synchronously
  useEffect(() => {
    // If items already provided via initial state, skip fetch
    if ((state as any).itemsLoaded === true || (Array.isArray(state.itemsCatalog) && state.itemsCatalog.length > 0)) {
      return
    }
    // Load catalog from /items/items.json; if missing, create default minimal file in memory
    async function loadCatalog() {
      try {
        const base = (import.meta as any).env?.BASE_URL || '/'
        const url = new URL(`${base}${base.endsWith('/') ? '' : '/'}items/items.json`, window.location.href)
        console.log('[ItemsLoader] base:', base, 'location:', window.location.href, 'hash:', window.location.hash, 'computedUrl:', url.href)
        const res = await fetch(url.href, { cache: 'no-cache' })
        console.log('[ItemsLoader] response status:', res.status, res.statusText)
        const contentType = res.headers.get('content-type') || ''
        console.log('[ItemsLoader] content-type:', contentType)
        if (!res.ok || !contentType.includes('application/json')) {
          try {
            const preview = await res.clone().text()
            console.warn('[ItemsLoader] Non-JSON or error response preview:', preview.slice(0, 200))
          } catch {}
          throw new Error(`Failed to load items.json: ${res.status} ${res.statusText}`)
        }
        const catalog = (await res.json()) as ShopItem[]
        console.log('[ItemsLoader] parsed items count:', Array.isArray(catalog) ? catalog.length : '(not array)')
        // Ensure apply exists for each
        for (const it of catalog) {
          if (typeof (it as any).apply !== 'function') {
            ;(it as ShopItem).apply = () => {}
          }
        }
        state.itemsCatalog = catalog
      } catch {
        console.error('[ItemsLoader] failed to load items.json')
        state.itemsCatalog = []
      } finally {
        // Derive shop from catalog (sellable only)
        state.shop = state.itemsCatalog.filter(i => (i as any).sellable)
        console.log('[ItemsLoader] derived shop count:', state.shop.length)
        state.itemsLoaded = true
        console.log('[ItemsLoader] itemsLoaded set to true')
        dispatch({ type: 'emit' })
      }
    }
    void loadCatalog()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function tryServeBreakfast() {
    state.kitchen = state.kitchen || { foodStorage: [], waitingForBreakfast: [] }
    state.kitchen.waitingForBreakfast = []
    const day = state.day
    const food = state.kitchen.foodStorage
    for (const m of state.members) {
      if (m.alive === false) continue
      const idx = food.findIndex(f => f.category === 'food')
      if (idx >= 0) {
        food.splice(idx, 1)
        m.fedOnDay = day
      } else {
        m.fedOnDay = undefined
        state.kitchen.waitingForBreakfast.push(m.id)
      }
    }
  }

  const actions = useMemo(() => ({
    async nextDay() {
      // Advance day and compute current week
      state.day += 1
      const previousWeek = state.week
      state.week = Math.floor((state.day - 1) / 7) + 1

      // Daily: advance missions with attrition, xp, and completion
      advanceMissionsOneDay(state)

      // Breakfast each morning
      tryServeBreakfast()

      // Daily: pay adventurer upkeep
      const upkeepCost = dailyUpkeep(state)
      if (upkeepCost > 0) {
        const moneyBefore = state.money
        spendMoney(state, upkeepCost)
        const paid = Math.min(moneyBefore, upkeepCost)
        state.logs.events.unshift(`🏷️ Daily upkeep paid: −${paid}g`)
      }

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

      // Optional: auto-assign (no run, no day pass) if setting enabled
      if (state.settings.autoAssign) {
        autoAssign(state)
      }

      dispatch({ type: 'emit' })
    },
    serveBreakfast() {
      tryServeBreakfast()
      state.logs.events.unshift('🍳 Breakfast served')
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

export const useStore = () => useContext(StoreContext)


