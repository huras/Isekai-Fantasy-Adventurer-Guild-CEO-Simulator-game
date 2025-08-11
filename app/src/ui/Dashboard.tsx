import React from 'react'
import { useStore } from '../core/store'

export function Dashboard() {
  const { state } = useStore()
  const week = Math.floor((state.day - 1) / 7) + 1
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="mb-3">Dashboard</h5>
        <div className="row g-3">
          <div className="col-md-4">
            <div className="p-3 border rounded-3">
              <div>💰 Money: {state.money}g</div>
              <div>⭐ Notoriety: {state.notoriety}</div>
              <div>📅 Day {state.day} / Week {week}</div>
              <div>🧑‍🚀 Members: {state.members.length}</div>
              <div>🧭 Active missions: {state.activeMissions?.length || 0}</div>
            </div>
          </div>
          <div className="col-md-8">
            <div className="p-3 border rounded-3 small text-muted">
              💡 Tips: Recruit weekly, assign quests, buy artifacts, increase notoriety.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


