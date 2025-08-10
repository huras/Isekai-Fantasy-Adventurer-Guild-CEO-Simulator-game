import React from 'react'
import { StoreProvider } from '../core/store'
import { Header } from './Header'
import { Tabs } from './Tabs'
import { Dashboard } from './Dashboard'
import { Guild } from './Guild'
import { Recruitment } from './Recruitment'
import { Quests } from './Quests'
import { Shop } from './Shop'
import { Battle } from './Battle'
import { Events } from './Events'

export function App() {
  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊', render: () => <Dashboard /> },
    { key: 'guild', label: 'Guild', icon: '👥', render: () => <Guild /> },
    { key: 'recruitment', label: 'Recruitment', icon: '📝', render: () => <Recruitment /> },
    { key: 'quests', label: 'Quests', icon: '📜', render: () => <Quests /> },
    { key: 'shop', label: 'Shop', icon: '🛒', render: () => <Shop /> },
    { key: 'battle', label: 'Battle', icon: '⚔️', render: () => <Battle /> },
    { key: 'events', label: 'Events', icon: '💬', render: () => <Events /> },
  ] as const
  return (
    <StoreProvider>
      <Header />
      <Tabs tabs={tabs as any} />
    </StoreProvider>
  )
}


