import type { GameState } from './types'

export type LogLevel = 'info' | 'warn' | 'error' | 'success'

const MAX_EVENT_LOGS = 400
const MAX_BATTLE_LOGS = 400

function cap(list: string[], max: number) {
  if (list.length > max) list.length = max
}

function formatMessage(message: string, opts?: { level?: LogLevel; category?: string; timestamp?: boolean }) {
  const parts: string[] = []
  if (opts?.category) parts.push(`[${opts.category}]`)
  // Avoid forcing emojis; messages often include them already. Levels are reserved for future styling.
  parts.push(message)
  if (opts?.timestamp) {
    const d = new Date()
    const hh = String(d.getHours()).padStart(2, '0')
    const mm = String(d.getMinutes()).padStart(2, '0')
    const ss = String(d.getSeconds()).padStart(2, '0')
    parts.push(`(${hh}:${mm}:${ss})`)
  }
  return parts.join(' ')
}

export function logEvent(state: GameState, message: string, opts?: { level?: LogLevel; category?: string; timestamp?: boolean }) {
  state.logs = state.logs || { events: [], battle: [] }
  state.logs.events = state.logs.events || []
  state.logs.events.unshift(formatMessage(message, opts))
  cap(state.logs.events, MAX_EVENT_LOGS)
}

export function logBattle(state: GameState, message: string, opts?: { timestamp?: boolean }) {
  state.logs = state.logs || { events: [], battle: [] }
  state.logs.battle = state.logs.battle || []
  const line = opts?.timestamp ? formatMessage(message, { timestamp: true }) : message
  state.logs.battle.unshift(line)
  cap(state.logs.battle, MAX_BATTLE_LOGS)
}



