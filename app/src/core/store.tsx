import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import type { BattleActor, BattleState, GameState, Member, ShopItem, InventoryItem } from './types'
import { generateCandidates } from './recruitment'
import { advanceMissionsOneDay, autoAssign, generateQuestList, createBattleFromMission } from './quests'
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
  battleAttack: () => void; battleDefend: () => void; battleUseItem: () => void; battleEnemyTurn: () => void; battleContinue: () => void;
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
  actions: { nextDay: () => {}, save: () => {}, load: () => {}, reset: () => {}, serveBreakfast: () => {}, battleAttack: () => {}, battleDefend: () => {}, battleUseItem: () => {}, battleEnemyTurn: () => {}, battleContinue: () => {} },
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
        // Ensure Guildmaster starts with specific items (Short Sword + two fruits) using stubs until catalog loads.
        items: [
          { id: '1754878147635' },
          { id: '1754878147635' },
          { id: '1754864404298' },
          { id: '1754864404298' },
          { id: '1754864404298' },
        ] as InventoryItem[],
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
        // No need to sync member item objects; inventory stores only references (id/qty)
        const gm = state.members.find(m => m.isPlayer)
        if (gm && Array.isArray(gm.items)) {
          // Ensure quantities default
          gm.items = gm.items.map((it: any) => ({ id: it.id, qty: it.qty || 1 })) as any
        }
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
    acceptCandidate(id: string) {
      const idx = state.candidates.findIndex(c => c.id === id)
      if (idx === -1) return
      const c = state.candidates.splice(idx, 1)[0]
      const hpMax = c.stats.hp ?? 20
      const mpMax = 10 + Math.floor((c.stats.spr ?? 3) / 2)
      const recruitBonus = state.modifiers.recruitStatBonus || 0
      const member: Member = {
        id: `mem_${Math.random().toString(36).slice(2, 9)}`,
        name: c.name,
        class: c.class,
        personality: c.personality,
        gender: c.gender,
        appearance: c.appearance,
        avatar: c.avatar,
        upkeep: c.upkeep,
        stats: {
          str: c.stats.str + recruitBonus,
          int: c.stats.int + recruitBonus,
          agi: c.stats.agi + recruitBonus,
          spr: c.stats.spr + recruitBonus,
        },
        hpMax,
        hp: hpMax,
        mpMax,
        mp: mpMax,
        speed: Math.max(1, Math.floor(((c.stats.agi ?? 3) + recruitBonus) / 3)),
        skills: c.skills || [],
        baseLevel: 1,
        baseExp: 0,
        classLevel: 1,
        classExp: 0,
        skillLevels: (c.skills || []).reduce<Record<string, number>>((acc, s) => { acc[s] = 1; return acc }, {}),
        skillExp: {},
        alive: true,
        items: (c.starterItems || []).map(it => ({ id: it.id, qty: it.qty || 1 })),
      }
      state.members.push(member)
      // No emit here; caller should emit to keep patterns uniform
    },
    async nextDay() {
      // If a battle is active, do not advance day; battles resolve via actions
      if (state.battle) {
        state.logs.events.unshift('⚔️ Ongoing battle prevents the day from advancing.')
        dispatch({ type: 'emit' })
        return
      }
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
        expiredQuests.forEach(eq => state.logs.events.unshift(`⌛ Quest expired: ${eq.name} (D${eq.expiredOnDay})`))
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
          expired.forEach(ec => state.logs.events.unshift(`🕰️ Candidate expired: ${ec.name} — ${ec.class} (W${ec.expiredOnWeek})`))
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
    battleAttack(): void {
      const b = state.battle
      if (!b || state.isGameOver) return
      if (b.turnSide !== 'ally') return
      const actor = b.allies[b.turnIndex % b.allies.length]
      if (!actor || actor.hp <= 0) { b.turnIndex = (b.turnIndex + 1) % b.allies.length; return this.battleAttack() }
      // Pick first alive enemy
      const targetIdx = b.enemies.findIndex(e => e.hp > 0)
      if (targetIdx < 0) return
      const target = b.enemies[targetIdx]
      const dmg = Math.max(1, Math.floor((actor.power ?? 8) * (0.8 + Math.random() * 0.6)))
      target.hp = Math.max(0, target.hp - dmg)
      b.log.unshift(`${actor.name} hits ${target.name} for ${dmg}`)
      if (b.enemies.every(e => e.hp <= 0)) {
        b.log.unshift('Enemies defeated!')
        // Signal continue to next wave or finish
        this.battleContinue()
        dispatch({ type: 'emit' })
        return
      }
      // Next ally or enemies turn
      b.turnIndex += 1
      if (b.turnIndex >= b.allies.length) {
        b.turnSide = 'enemy'; b.turnIndex = 0
        // Enemy auto-turns
        this.battleEnemyTurn()
      }
      dispatch({ type: 'emit' })
    },
    battleDefend(): void {
      const b = state.battle
      if (!b || state.isGameOver) return
      if (b.turnSide !== 'ally') return
      const actor = b.allies[b.turnIndex % b.allies.length]
      if (!actor || actor.hp <= 0) { b.turnIndex = (b.turnIndex + 1) % b.allies.length; return this.battleDefend() }
      b.log.unshift(`${actor.name} braces for impact (defend).`)
      // Simple defend: small heal
      actor.hp = Math.min(actor.hpMax, actor.hp + 2)
      b.turnIndex += 1
      if (b.turnIndex >= b.allies.length) { b.turnSide = 'enemy'; b.turnIndex = 0; this.battleEnemyTurn() }
      dispatch({ type: 'emit' })
    },
    battleUseItem(): void {
      const b = state.battle
      if (!b || state.isGameOver) return
      if (b.turnSide !== 'ally') return
      const actor = b.allies[b.turnIndex % b.allies.length]
      if (!actor) return
      // Find a potion in inventory
      const idx = state.inventory.findIndex(it => it.category === 'potion')
      if (idx < 0) { b.log.unshift('No usable items.'); dispatch({ type: 'emit' }); return }
      const it = state.inventory[idx]
      state.inventory.splice(idx, 1)
      const heal = 10
      actor.hp = Math.min(actor.hpMax, actor.hp + heal)
      b.log.unshift(`${actor.name} uses ${it.name} and heals ${heal}.`)
      b.turnIndex += 1
      if (b.turnIndex >= b.allies.length) { b.turnSide = 'enemy'; b.turnIndex = 0; this.battleEnemyTurn() }
      dispatch({ type: 'emit' })
    },
    battleEnemyTurn(): void {
      const b = state.battle
      if (!b || state.isGameOver) return
      if (b.turnSide !== 'enemy') return
      const actor = b.enemies[b.turnIndex % b.enemies.length]
      if (!actor || actor.hp <= 0) { b.turnIndex = (b.turnIndex + 1) % b.enemies.length; return this.battleEnemyTurn() }
      // Target first alive ally
      const targetIdx = b.allies.findIndex(a => a.hp > 0)
      if (targetIdx < 0) return
      const target = b.allies[targetIdx]
      const dmg = Math.max(1, Math.floor((actor.power ?? 7) * (0.8 + Math.random() * 0.6)))
      target.hp = Math.max(0, target.hp - dmg)
      b.log.unshift(`${actor.name} hits ${target.name} for ${dmg}`)
      if (b.allies.every(a => a.hp <= 0)) {
        b.log.unshift('Your party has been defeated...')
        state.isGameOver = true
        state.logs.events.unshift('💀 Battle lost. Game Over.')
        dispatch({ type: 'emit' })
        return
      }
      // Next enemy or allies turn
      b.turnIndex += 1
      if (b.turnIndex >= b.enemies.length) { b.turnSide = 'ally'; b.turnIndex = 0 }
      dispatch({ type: 'emit' })
    },
    battleContinue(): void {
      const b = state.battle
      if (!b) return
      // Find mission and decrement remaining battles
      const m = state.activeMissions.find(mm => mm.id === b.missionId)
      if (!m) { state.battle = null; return }
      // Mark cleared
      m.battlesCleared = (m.battlesCleared || 0) + 1
      // Decrement one cleared wave from remaining
      m.battlesRemaining = Math.max(0, (m.battlesRemaining || 0) - 1)
      if ((m.battlesRemaining ?? 0) > 0) {
        // Spawn next wave
        const next = createBattleFromMission(m, (b.wave || 1) + 1, m.battlesPlanned || (b.wavesTotal || 1))
        state.battle = next
        state.logs.events.unshift('⚔️ A new wave approaches!')
      } else {
        // Clear battle and resume mission progression next day
        state.logs.events.unshift('⚔️ Battle concluded. Quest combat cleared.')
        // Ensure counters are consistent
        m.battlesCleared = m.battlesPlanned || m.battlesCleared || 0
        state.battle = null
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


