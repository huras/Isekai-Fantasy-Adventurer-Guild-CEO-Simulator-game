import type { BattleActor, GameState, Member, ShopItem, ActiveBuff, UseDescriptor } from './types'
import { logEvent, logBattle } from './logs'

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

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export function canUseItem(item: ShopItem): boolean {
  const use = (item as any).use as UseDescriptor | UseDescriptor[] | undefined
  return Array.isArray(use) ? use.length > 0 : !!use
}

export function applyItemEffect(item: ShopItem, ctx: ItemUseContext) {
  const { state } = ctx
  const usesRaw = (item as any).use as UseDescriptor | UseDescriptor[] | undefined
  const uses: UseDescriptor[] = Array.isArray(usesRaw) ? usesRaw : usesRaw ? [usesRaw] : []
  if (uses.length === 0) {
    // No high-level use descriptor — do nothing
    return
  }

  function applyHealHP(target: { hp: number; hpMax: number }, amount: number) {
    const before = target.hp
    target.hp = clamp(target.hp + amount, 0, target.hpMax)
    return target.hp - before
  }
  function applyHealMP(target: { mp?: number; mpMax?: number }, amount: number) {
    const before = target.mp ?? 0
    const max = target.mpMax ?? before
    const next = clamp(before + amount, 0, max)
    target.mp = next
    return next - before
  }

  for (const use of uses) {
    // Resolve target object selected by UI/flow; for now, rely on ctx.target
    const target = ctx.target
    switch (use.type) {
      case 'heal': {
        if (!target) break
        const amount = Math.max(0, Math.floor(use.amount ?? 0))
        if ('hpMax' in target) {
          const healed = applyHealHP(target as any, amount)
          if (ctx.battle) logBattle(state, `${ctx.user?.name || 'Someone'} uses ${item.name} on ${(target as any).name} (+${healed} HP)`) 
          else logEvent(state, `${ctx.user?.name || 'Someone'} uses ${item.name} on ${(target as any).name} (+${healed} HP)`) 
        }
        break
      }
      case 'heal_mp': {
        if (!target) break
        const amount = Math.max(0, Math.floor(use.amount ?? 0))
        const healed = applyHealMP(target as any, amount)
        if (healed !== 0) {
          if (ctx.battle) logBattle(state, `${ctx.user?.name || 'Someone'} restores ${healed} MP to ${(target as any).name} with ${item.name}`)
          else logEvent(state, `${ctx.user?.name || 'Someone'} restores ${healed} MP to ${(target as any).name} with ${item.name}`)
        }
        break
      }
      case 'damage': {
        if (!target) break
        const amount = Math.max(0, Math.floor(use.amount ?? 0))
        if ('hpMax' in target) {
          const before = (target as any).hp
          ;(target as any).hp = clamp(before - amount, 0, (target as any).hpMax)
          const delta = before - (target as any).hp
          const text = `${ctx.user?.name || 'Someone'} uses ${item.name} on ${(target as any).name} (−${delta} HP)`
          if (ctx.battle) {
            logBattle(state, text)
          } else {
            logEvent(state, text)
          }
        }
        break
      }
      case 'buff': {
        if (!target) break
        if (!('hpMax' in target)) break
        const member = ctx.user as Member | null
        const stat = use.stat || 'str'
        const amount = Math.max(0, Math.floor(use.amount ?? 0))
        const rawDuration = Math.floor(use.durationDays ?? 1)
        const isInfinite = rawDuration <= 0
        const duration = isInfinite ? 0 : Math.max(1, rawDuration)
        if (member) {
          member.activeBuffs = member.activeBuffs || []
          const expiresOnDay = isInfinite ? Number.MAX_SAFE_INTEGER : (ctx.state.day + duration)
          const buff: ActiveBuff = { stat, delta: amount, expiresOnDay, sourceItemId: item.id }
          member.activeBuffs.push(buff)
          const text = isInfinite
            ? `${member.name} gains +${amount} ${stat.toUpperCase()} indefinitely from ${item.name}`
            : `${member.name} gains +${amount} ${stat.toUpperCase()} for ${duration} day(s) from ${item.name}`
          if (ctx.battle) {
            logBattle(ctx.state, text)
          } else {
            logEvent(ctx.state, text)
          }
        }
        break
      }
      case 'cleanse': {
        // Remove buffs from the user by stat or all
        const member = ctx.user as Member | null
        if (member && Array.isArray(member.activeBuffs)) {
          if (use.stat) member.activeBuffs = member.activeBuffs.filter(b => b.stat !== use.stat)
          else member.activeBuffs = []
          const text = `${member.name} is cleansed by ${item.name}${use.stat ? ` (removed ${use.stat.toUpperCase()} buffs)` : ''}`
          if (ctx.battle) {
            logBattle(ctx.state, text)
          } else {
            logEvent(ctx.state, text)
          }
        }
        break
      }
      default:
        break
    }
  }
}


