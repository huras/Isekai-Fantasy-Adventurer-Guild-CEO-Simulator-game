import type { BattleActor, GameState, Member, ShopItem, ActiveBuff } from './types'

export type ItemUseContext = {
  state: GameState
  source: 'guild' | 'member'
  user?: Member | null
  target?: Member | BattleActor | null
  battle?: {
    allies: BattleActor[]
    enemies: BattleActor[]
  } | null
}

export type UseDescriptor = {
  type: 'heal' | 'heal_mp' | 'damage' | 'buff' | 'cleanse'
  amount?: number
  target?: 'self' | 'ally' | 'enemy' | 'any'
  stat?: 'str' | 'mag' | 'skill' | 'speed' | 'luck' | 'defense' | 'resistance'
  durationDays?: number
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function canUseItem(item: ShopItem): boolean {
  const use = (item as any).use as UseDescriptor | undefined
  return !!use
}

export function applyItemEffect(item: ShopItem, ctx: ItemUseContext) {
  const { state } = ctx
  const use = ((item as any).use || null) as UseDescriptor | null
  if (!use) {
    // No high-level use descriptor — do nothing
    return
  }

  function applyHealHP(target: { hp: number; hpMax: number }, amount: number) {
    const before = target.hp
    target.hp = clamp(target.hp + amount, 0, target.hpMax)
    return target.hp - before
  }

  // Resolve target object
  const target = ctx.target
  switch (use.type) {
    case 'heal': {
      if (!target) break
      const amount = Math.max(0, Math.floor(use.amount ?? 0))
      if ('hpMax' in target) {
        const healed = applyHealHP(target, amount)
        if (ctx.battle) state.logs.battle.unshift(`${ctx.user?.name || 'Someone'} uses ${item.name} on ${(target as any).name} (+${healed} HP)`) 
        else state.logs.events.unshift(`${ctx.user?.name || 'Someone'} uses ${item.name} on ${(target as any).name} (+${healed} HP)`) 
      }
      break
    }
    case 'buff': {
      if (!target) break
      if (!('hpMax' in target)) break
      const member = ctx.user as Member | null
      const stat = use.stat || 'str'
      const amount = Math.max(0, Math.floor(use.amount ?? 0))
      const duration = Math.max(1, Math.floor(use.durationDays ?? 1))
      if (member) {
        member.activeBuffs = member.activeBuffs || []
        const buff: ActiveBuff = { stat, delta: amount, expiresOnDay: ctx.state.day + duration, sourceItemId: item.id }
        member.activeBuffs.push(buff)
        if (ctx.battle) ctx.state.logs.battle.unshift(`${member.name} gains +${amount} ${stat.toUpperCase()} for ${duration} day(s) from ${item.name}`)
        else ctx.state.logs.events.unshift(`${member.name} gains +${amount} ${stat.toUpperCase()} for ${duration} day(s) from ${item.name}`)
      }
      break
    }
    case 'heal_mp': {
      // Optional future: implement MP heal here
      break
    }
    case 'damage': {
      // Optional future: implement damage items
      break
    }
    case 'buff':
    case 'cleanse':
    default:
      // Not implemented yet
      break
  }
}


