import React from 'react'
import { StoreProvider } from '../core/store'
import { Header } from './Header'
import { Tabs } from './Tabs'
import { Dashboard } from './Dashboard'
import { Guild } from './Guild'
import { Recruitment } from './Recruitment'
import { Quests } from './Quests'
import { Kitchen } from './Kitchen'
import { Shop } from './Shop'
import { Battle } from './Battle'
import { Events } from './Events'
import { Expired } from './Expired'
import { Tilesets } from './Tilesets'
import { Items } from './Items'

export function App({ initialState }: { initialState?: Partial<import('../core/types').GameState> }) {
  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊', render: () => <Dashboard /> },
    { key: 'guild', label: 'Guild', icon: '👥', render: () => <Guild /> },
    { key: 'recruitment', label: 'Recruitment', icon: '📝', render: () => <Recruitment /> },
    { key: 'quests', label: 'Quests', icon: '📜', render: () => <Quests /> },
    { key: 'kitchen', label: 'Kitchen', icon: '🍳', render: () => <Kitchen /> },
    { key: 'tilesets', label: 'Tilesets', icon: '🧩', render: () => <Tilesets /> },
    { key: 'items', label: 'Items', icon: '🎒', render: () => <Items /> },
    { key: 'shop', label: 'Shop', icon: '🛒', render: () => <Shop /> },
    { key: 'battle', label: 'Battle', icon: '⚔️', render: () => <Battle /> },
    { key: 'events', label: 'Events', icon: '💬', render: () => <Events /> },
    { key: 'expired', label: 'Expired', icon: '⏳', render: () => <Expired /> },
  ] as const
  return (
    <StoreProvider initial={initialState}>
      <Header />
      <Tabs tabs={tabs as any} />
    </StoreProvider>
  )
}


