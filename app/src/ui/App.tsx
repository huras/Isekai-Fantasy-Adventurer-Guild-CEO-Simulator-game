import React from 'react'
import { StoreProvider, useStore } from '../core/store'
import { Header } from './Header'
import { Tabs } from './Tabs'
import { Dashboard } from './Dashboard'
import { Guild } from './Guild'
import { Recruitment } from './Recruitment'
import { Quests } from './Quests'
import { Kitchen } from './Kitchen'
import { Shop } from './Shop'
import { Battle } from './Battle'
import { BattleModal } from './BattleModal'
import { Events } from './Events'
import { Expired } from './Expired'
import { Tilesets } from './Tilesets'
import { Items } from './Items'
import { GuildInventory } from './GuildInventory'
import { NextDayFAB } from './NextDayFAB'
import { BattleAdmin } from './BattleAdmin'

function MainTabs() {
  const { state } = useStore()
  const inBattle = !!state.battle
  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: '📊', render: () => <Dashboard /> },
    { key: 'guild', label: 'Guild', icon: '👥', render: () => <Guild /> },
    { key: 'recruitment', label: 'Recruitment', icon: '📝', render: () => <Recruitment /> },
    { key: 'quests', label: 'Quests', icon: '📜', render: () => <Quests /> },
    { key: 'kitchen', label: 'Kitchen (dev)', icon: '🍳', render: () => <Kitchen /> },
    { key: 'tilesets', label: 'Tilesets (admin)', icon: '🧩', render: () => <Tilesets /> },
    { key: 'items', label: 'Items (admin)', icon: '🎒', render: () => <Items /> },
    { key: 'guild-inventory', label: 'Guild Inventory', icon: '📦', render: () => <GuildInventory /> },
    { key: 'shop', label: 'Shop', icon: '🛒', render: () => <Shop /> },
    // Keep battle tab for admin/testing, but it will be disabled during active battles and UI shown in modal
    { key: 'battle', label: inBattle ? 'Battle (Active)' : 'Battle', icon: '⚔️', highlight: inBattle, render: () => <Battle /> },
    { key: 'battle-admin', label: 'Battle Trigger (admin)', icon: '🧪', render: () => <BattleAdmin /> },
    { key: 'events', label: 'Events', icon: '💬', render: () => <Events /> },
    { key: 'expired', label: 'Expired', icon: '⏳', render: () => <Expired /> },
  ] as const
  return <Tabs tabs={tabs as any} />
}

export function App({ initialState }: { initialState?: Partial<import('../core/types').GameState> }) {
  return (
    <StoreProvider initial={initialState}>
      <Header />
      <MainTabs />
      <NextDayFAB />
      {/* Global battle modal overlay. Unclosable; only ends via battle actions. */}
      <BattleModal />
    </StoreProvider>
  )
}


