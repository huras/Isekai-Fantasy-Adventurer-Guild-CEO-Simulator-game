import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import type { BattleActor, BattleState, GameState, Member, ShopItem, InventoryItem, ExperienceCurve } from './types'
import { generateCandidates } from './recruitment'
import { advanceMissionsOneDay, autoAssign, generateQuestList, createBattleFromMission } from './quests'
import { dailyUpkeep, spendMoney } from './money'
import { addExperience, getExperienceProgress, getExperienceForNextLevel, getExperienceCurveEmoji, getExperienceCurveDescription } from './leveling'
import { loadItemCategories } from './categories'
import { logEvent, logBattle } from './logs'
// import { generateInitialShop } from './items'

const initialState: GameState = {
  day: 1,
  week: 1,
  money: 6000000,
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

// Versioned save format
type SaveEnvelopeV1 = { version: 1; savedAt: number; state: Partial<GameState> }
const SAVE_LATEST_VERSION = 1 as const
const STORAGE_KEY_NEW = 'guildSim.save.v1'
// Legacy keys supported for migration/read-only load
const STORAGE_KEYS_LEGACY = ['guildSim_ts_v1']

function computeWeekFromDay(day: number): number {
  return Math.floor((Math.max(1, day) - 1) / 7) + 1
}

function pickSavableState(state: GameState): Partial<GameState> {
  // Only store gameplay-relevant fields. Derived/runtime fields are omitted.
  const out: Partial<GameState> = {
    day: state.day,
    week: state.week,
    money: state.money,
    notoriety: state.notoriety,
    // Sanitize members to avoid saving placeholder nulls in inventories
    members: state.members.map((m: any) => {
      const copy: any = { ...m }
      if (Array.isArray(copy.items)) {
        copy.items = copy.items.filter((it: any) => it && typeof it === 'object' && it.id)
      }
      return copy
    }),
    candidates: state.candidates,
    quests: state.quests,
    activeMissions: state.activeMissions,
    inventory: state.inventory,
    logs: state.logs,
    modifiers: state.modifiers,
    settings: state.settings,
    archives: state.archives,
    isGameOver: state.isGameOver ?? false,
  }
  // Ensure we do not accidentally include heavy/derived fields
  ;(out as any).itemsCatalog = undefined
  ;(out as any).shop = undefined
  ;(out as any).itemsLoaded = undefined
  ;(out as any).battle = undefined
  return JSON.parse(JSON.stringify(out))
}

function serializeForSave(state: GameState): SaveEnvelopeV1 {
  return { version: SAVE_LATEST_VERSION, savedAt: Date.now(), state: pickSavableState(state) }
}

function ensureArray<T>(val: unknown, fallback: T[]): T[] {
  return Array.isArray(val) ? (val as T[]) : fallback
}

function hydrateLoadedState(input: unknown, previous: GameState): GameState {
  // Accept both new envelope and legacy raw GameState
  const raw = (() => {
    if (!input || typeof input !== 'object') return null
    const obj = input as any
    if (typeof obj.version === 'number' && obj.state) return obj.state as Partial<GameState>
    return obj as Partial<GameState>
  })()
  const base: GameState = { ...initialState }
  const provided = raw || {}

  const next: GameState = {
    ...base,
    day: typeof provided.day === 'number' ? provided.day : base.day,
    // Week is recomputed to avoid stale mismatch
    week: computeWeekFromDay(typeof provided.day === 'number' ? provided.day : base.day),
    money: typeof provided.money === 'number' ? provided.money : base.money,
    notoriety: typeof provided.notoriety === 'number' ? provided.notoriety : base.notoriety,
    members: ensureArray(provided.members, []),
    candidates: ensureArray(provided.candidates, []),
    quests: ensureArray(provided.quests, []),
    activeMissions: ensureArray(provided.activeMissions, []),
    battle: null, // never hydrate into the middle of a battle to avoid mismatch
    inventory: ensureArray(provided.inventory, []),
    // Preserve catalog-related runtime data from previous session so we don't need to re-fetch
    itemsCatalog: previous.itemsCatalog,
    itemsLoaded: previous.itemsLoaded,
    shop: previous.shop,
    kitchen: {
      foodStorage: ensureArray(provided.kitchen?.foodStorage, []),
      waitingForBreakfast: ensureArray(provided.kitchen?.waitingForBreakfast, []),
    },
    logs: {
      events: ensureArray(provided.logs?.events, []),
      battle: ensureArray(provided.logs?.battle, []),
    },
    modifiers: {
      upkeepDeltaPerMember: provided.modifiers?.upkeepDeltaPerMember ?? 0,
      questSuccessBonus: provided.modifiers?.questSuccessBonus ?? 0,
      recruitStatBonus: provided.modifiers?.recruitStatBonus ?? 0,
      shopDiscount: provided.modifiers?.shopDiscount ?? undefined,
    },
    settings: { autoAssign: !!(provided.settings?.autoAssign) },
    archives: {
      quests: ensureArray(provided.archives?.quests, []),
      candidates: ensureArray(provided.archives?.candidates, []),
      fallen: ensureArray(provided.archives?.fallen, []),
    },
    isGameOver: !!provided.isGameOver && provided.isGameOver === true,
  }

  // Normalize member inventory stacks: qty and instanceIds presence
  function makeIds(n: number): string[] {
    const out: string[] = []
    for (let i = 0; i < n; i++) out.push(`inst_${(crypto as any)?.randomUUID?.() || Math.random().toString(36).slice(2, 11)}`)
    return out
  }
  for (const m of next.members) {
    if (Array.isArray((m as any).items)) {
      const raw: any[] = (m as any).items
      const normalized: any[] = []
      for (const it of raw) {
        if (!it || typeof it !== 'object' || !(it as any).id) continue
        const qty = Math.max(1, (it as any).qty || 1)
        const ids: string[] = Array.isArray((it as any).instanceIds) ? [...(it as any).instanceIds] : []
        if (ids.length < qty) ids.push(...makeIds(qty - ids.length))
        if (ids.length > qty) ids.length = qty
        normalized.push({ id: (it as any).id, qty, instanceIds: ids })
      }
      ;(m as any).items = normalized
      // Prune equipped instance ids that no longer exist after normalization
      if (Array.isArray((m as any).equippedInstanceIds)) {
        const present = new Set<string>((((m as any).items || []) as any[]).flatMap((s: any) => s?.instanceIds || []))
        ;(m as any).equippedInstanceIds = (m as any).equippedInstanceIds.filter((eid: string) => present.has(eid))
      }
    }
  }

  return next
}

export function StoreProvider({ children, initial }: { children: React.ReactNode; initial?: Partial<GameState> }) {
  const [state, dispatch] = useReducer(reducer, { ...initialState, ...(initial || {}) })

  // Ensure player exists
  useEffect(() => {
    if (!state.members.some(m => m.isPlayer)) {
      const player: Member = {
        id: 'player', isPlayer: true, name: 'You', class: 'Guildmaster', personality: 'heroic', gender: 'male',
        appearance: '♂️ Summoned human with dark hair and determined eyes; beauty 7/10',
        upkeep: 0, stats: { str: 6, mag: 6, skill: 6, speed: 3, luck: 6, defense: 4, resistance: 4 }, hpMax: 40, hp: 18, mp: 10, mpMax: 300,
         speed: 3, skills: ['Leadership', 'Tactics'],
        level: 1, experience: 0, experienceCurve: 'normal',
        // Ensure Guildmaster starts with specific items (Short Sword + two fruits) using stubs until catalog loads.
        items: [
          { id: '1754878147635' },
          { id: '1754878147635' },
          { id: '1755037566949' },
          { id: '1754864404298' },
          { id: '1754864404298' },
          { id: '1754864578481' },
          { id: '1754955449841' },
          { id: '1754935730336' },
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
        // Load categories first
        await loadItemCategories()
        
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
        // Normalize member inventories: ensure qty and instanceIds per item
        function makeIds(n: number): string[] {
          const out: string[] = []
          for (let i = 0; i < n; i++) out.push(`inst_${(crypto as any)?.randomUUID?.() || Math.random().toString(36).slice(2, 11)}`)
          return out
        }
        for (const m of state.members) {
          if (Array.isArray(m.items)) {
            const normalized: any[] = []
            for (const it of m.items) {
              if (!it || typeof it !== 'object' || !(it as any).id) continue
              const qty = Math.max(1, (it as any).qty || 1)
              const ids: string[] = Array.isArray((it as any).instanceIds) ? [...(it as any).instanceIds] : []
              if (ids.length < qty) ids.push(...makeIds(qty - ids.length))
              if (ids.length > qty) ids.length = qty
              normalized.push({ id: (it as any).id, qty, instanceIds: ids })
            }
            m.items = normalized as any
          }
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
    // Clear expired buffs and keep active ones
    for (const m of state.members) {
      if (Array.isArray(m.activeBuffs)) {
        m.activeBuffs = m.activeBuffs.filter(b => b.expiresOnDay > day)
      }
    }
    const food = state.inventory
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
      const mpMax = 10 + Math.floor((c.stats.mag ?? 3) / 2)
      const recruitBonus = state.modifiers.recruitStatBonus || 0
      
      // Randomly assign experience curve
      const experienceCurves: ExperienceCurve[] = ['fast', 'normal', 'slow', 'erratic']
      const randomCurve = experienceCurves[Math.floor(Math.random() * experienceCurves.length)]
      
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
          mag: c.stats.mag + recruitBonus,
          skill: c.stats.skill + recruitBonus,
          speed: c.stats.speed + recruitBonus,
          luck: c.stats.luck + recruitBonus,
          defense: c.stats.defense + recruitBonus,
          resistance: c.stats.resistance + recruitBonus,
        },
        hpMax,
        hp: hpMax,
        mpMax,
        mp: mpMax,
        speed: Math.max(1, Math.floor(((c.stats.skill ?? 3) + recruitBonus) / 3)),
        skills: c.skills || [],
        level: 1,
        experience: 0,
        experienceCurve: randomCurve,
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
        logEvent(state, '⚔️ Ongoing battle prevents the day from advancing.')
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
        logEvent(state, `🏷️ Daily upkeep paid: −${paid}g`)
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
        expiredQuests.forEach(eq => logEvent(state, `⌛ Quest expired: ${eq.name} (D${eq.expiredOnDay})`))
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
          expired.forEach(ec => logEvent(state, `🕰️ Candidate expired: ${ec.name} — ${ec.class} (W${ec.expiredOnWeek})`))
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
      
      // Log attack to event log
      logEvent(state, `⚔️ ${actor.name} attacks ${target.name} for ${dmg} damage`)
      
      // Award experience for defeating this specific enemy
      if (target.hp <= 0) {
        const member = state.members.find(m => m.id === actor.id)
        if (member) {
          // Individual enemy defeat experience
          const enemyExp = Math.max(8, b.diff * 4)
          // Bonus for being the one to land the killing blow
          const killBonus = Math.floor(Math.random() * 8) + 5
          const totalExp = enemyExp + killBonus
          
          const result = addExperience(member, totalExp)
          if (result.leveledUp) {
            b.log.unshift(`🎉 ${member.name} leveled up to Lv.${member.level}! (+${totalExp} EXP for defeating ${target.name})`)
            logEvent(state, `🎉 ${member.name} leveled up to Lv.${member.level}! (+${totalExp} EXP for defeating ${target.name})`)
          } else {
            b.log.unshift(`⭐ ${member.name} gained ${totalExp} experience for defeating ${target.name}`)
            logEvent(state, `⭐ ${member.name} gained ${totalExp} experience for defeating ${target.name}`)
          }
        }
      }
      
      if (b.enemies.every(e => e.hp <= 0)) {
        b.log.unshift('Enemies defeated!')
        logEvent(state, `⚔️ Wave ${b.wave} cleared in ${b.questName}!`)
        
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
      
      // Log defend action to event log
      logEvent(state, `🛡️ ${actor.name} defends and recovers 2 HP`)
      
      // Award small experience for successful defense
      const member = state.members.find(m => m.id === actor.id)
      if (member) {
        const defenseExp = Math.max(3, Math.floor(b.diff * 1.5))
        const result = addExperience(member, defenseExp)
        if (result.leveledUp) {
          b.log.unshift(`🎉 ${member.name} leveled up to Lv.${member.level}! (+${defenseExp} EXP for tactical defense)`)
          logEvent(state, `🎉 ${member.name} leveled up to Lv.${member.level}! (+${defenseExp} EXP for tactical defense)`)
        }
      }
      
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

      // Process the entire enemy phase in one call to avoid softlocks
      const maxIterations = Math.max(1, b.enemies.length * 2) // safety against unexpected states
      let performed = 0
      while (b.turnSide === 'enemy' && performed < maxIterations) {
        const actor = b.enemies[b.turnIndex % Math.max(1, b.enemies.length)]
        if (!actor || actor.hp <= 0) {
          // Skip dead or invalid actor
          b.turnIndex += 1
          if (b.turnIndex >= b.enemies.length) {
            b.turnSide = 'ally'
            b.turnIndex = 0
          }
          performed += 1
          continue
        }
        // Target first alive ally
        const targetIdx = b.allies.findIndex(a => a.hp > 0)
        if (targetIdx < 0) {
          // All allies down (should have been caught already), end battle
          b.log.unshift('Your party has been defeated...')
          state.isGameOver = true
          logEvent(state, '💀 Battle lost. Game Over.')
          dispatch({ type: 'emit' })
          return
        }
        const target = b.allies[targetIdx]
        const dmg = Math.max(1, Math.floor((actor.power ?? 7) * (0.8 + Math.random() * 0.6)))
        target.hp = Math.max(0, target.hp - dmg)
        b.log.unshift(`${actor.name} hits ${target.name} for ${dmg}`)
        
        // Log enemy attack to event log
        logEvent(state, `👹 ${actor.name} attacks ${target.name} for ${dmg} damage`)
        
        if (b.allies.every(a => a.hp <= 0)) {
          b.log.unshift('Your party has been defeated...')
          state.isGameOver = true
          logEvent(state, '💀 Battle lost. Game Over.')
          dispatch({ type: 'emit' })
          return
        }
        // Next enemy or switch back to allies when the round ends
        b.turnIndex += 1
        if (b.turnIndex >= b.enemies.length) {
          b.turnSide = 'ally'
          b.turnIndex = 0
        }
        performed += 1
      }
      dispatch({ type: 'emit' })
    },
    battleContinue(): void {
      const b = state.battle
      if (!b) return
      // Find mission and decrement remaining battles
      const m = state.activeMissions.find(mm => mm.id === b.missionId)
      if (!m) { state.battle = null; return }
      // Sync battle ally HP/MP back to mission party so next waves don't reset
      for (const ally of b.allies) {
        const p = m.party.find(x => x.id === ally.id)
        if (p) {
          p.hp = Math.max(0, ally.hp)
          if (typeof ally.mp === 'number') p.mp = Math.max(0, ally.mp)
          if (p.hp <= 0) p.alive = false
        }
      }
      // Mark cleared
      m.battlesCleared = (m.battlesCleared || 0) + 1
      // Decrement one cleared wave from remaining
      m.battlesRemaining = Math.max(0, (m.battlesRemaining || 0) - 1)
      if ((m.battlesRemaining ?? 0) > 0) {
        // Spawn next wave
        const next = createBattleFromMission(m, (b.wave || 1) + 1, m.battlesPlanned || (b.wavesTotal || 1))
        state.battle = next
        logEvent(state, `⚔️ A new wave approaches!`)
      } else {
        // Clear battle and resume mission progression next day
        logEvent(state, `⚔️ Battle concluded. Quest combat cleared.`)
        
        // Ensure counters are consistent
        m.battlesCleared = m.battlesPlanned || m.battlesCleared || 0
        state.battle = null
      }
      dispatch({ type: 'emit' })
    },
    serveBreakfast() {
      tryServeBreakfast()
      logEvent(state, '🍳 Breakfast served')
      dispatch({ type: 'emit' })
    },
    save() {
      ;(async () => {
        try {
          const envelope = serializeForSave(state)
          const json = JSON.stringify(envelope, null, 2)
          const supportsFS = typeof (window as any).showSaveFilePicker === 'function'
          if (supportsFS) {
            const handle = await (window as any).showSaveFilePicker({
              suggestedName: `guild_save_D${state.day}_W${state.week}.json`,
              types: [
                {
                  description: 'Guild Save',
                  accept: { 'application/json': ['.json'] },
                },
              ],
            })
            const writable = await handle.createWritable()
            await writable.write(new Blob([json], { type: 'application/json' }))
            await writable.close()
          } else {
            const blob = new Blob([json], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `guild_save_D${state.day}_W${state.week}.json`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }
          logEvent(state, '💾 Save exported to file')
        } catch (err) {
          console.error('[Save] failed (file export):', err)
          logEvent(state, '⚠️ Save export failed')
        }
        dispatch({ type: 'emit' })
      })()
    },
    load() {
      ;(async () => {
        try {
          let text: string | null = null
          const supportsFS = typeof (window as any).showOpenFilePicker === 'function'
          if (supportsFS) {
            const handles = await (window as any).showOpenFilePicker({
              multiple: false,
              types: [
                {
                  description: 'Guild Save',
                  accept: { 'application/json': ['.json'] },
                },
              ],
            })
            const handle = Array.isArray(handles) ? handles[0] : null
            if (!handle) { logEvent(state, 'ℹ️ Load cancelled'); dispatch({ type: 'emit' }); return }
            const file = await handle.getFile()
            text = await file.text()
          } else {
            text = await new Promise<string | null>((resolve) => {
              const input = document.createElement('input')
              input.type = 'file'
              input.accept = 'application/json,.json'
              input.onchange = async () => {
                const f = input.files && input.files[0]
                if (!f) { resolve(null); return }
                const reader = new FileReader()
                reader.onload = () => resolve(String(reader.result || ''))
                reader.onerror = () => resolve(null)
                reader.readAsText(f)
              }
              // Must be appended in some browsers to trigger the dialog reliably
              document.body.appendChild(input)
              input.click()
              // Clean up after a tick
              setTimeout(() => { if (document.body.contains(input)) document.body.removeChild(input) }, 0)
            })
          }
          if (!text) { logEvent(state, 'ℹ️ No file selected'); dispatch({ type: 'emit' }); return }
          const parsed = JSON.parse(text)
          const hydrated = hydrateLoadedState(parsed, state)
          logEvent(hydrated, '📥 Game loaded from file')
          dispatch({ type: 'load', payload: hydrated })
        } catch (err) {
          console.error('[Load] failed (file import):', err)
          logEvent(state, '⚠️ Load failed (invalid file)')
          dispatch({ type: 'emit' })
        }
      })()
    },
    reset() {
      // User requested: reset = full page refresh
      try { window.location.reload() } catch { /* noop */ }
    },
  }), [state])

  const value = useMemo(() => ({ state, emit: () => dispatch({ type: 'emit' }), actions }), [state, actions])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export const useStore = () => useContext(StoreContext)


