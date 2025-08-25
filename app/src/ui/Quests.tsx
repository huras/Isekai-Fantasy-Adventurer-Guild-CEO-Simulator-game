import React, { useMemo, useState } from 'react'
import { useStore } from '../core/store'
import { assignMember, generateQuestList, runQuest, unassignMember, calculateQuestExperience } from '../core/quests'
import { economyManager } from '../core/economy'
import { guildManager } from '../core/guild'
import { initializeGameSystems } from '../core/init'
import { AdventurerModal } from './AdventurerModal'
import { ProgressBar } from './ProgressBar'

export function Quests() {
  const { state, emit } = useStore()
  const inBattle = false // No battle system in current implementation
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'quests' | 'guild' | 'economy' | 'goals'>('quests')
  
  // Initialize guild systems on first render
  React.useEffect(() => {
    initializeGameSystems(state)
  }, [])
  
  const selectedMember = useMemo(() => state.members.find(x => x.id === selectedId) || null, [state.members, selectedId])
  
  const unassigned = useMemo(() => {
    const assignedIds = new Set<string>()
    for (const q of state.quests) {
      for (const m of q.assigned || []) assignedIds.add(m.id)
    }
    const onMissionIds = new Set<string>()
    for (const m of state.activeMissions || []) {
      for (const p of m.party || []) onMissionIds.add(p.id)
    }
    return state.members.filter(m => m.alive !== false && !assignedIds.has(m.id) && !onMissionIds.has(m.id))
  }, [state.members, state.quests, state.activeMissions])

  // Calculate daily income and costs
  const dailyIncome = useMemo(() => economyManager.calculateDailyIncome(state), [state])
  const facilityMaintenance = useMemo(() => economyManager.calculateFacilityMaintenance(state), [state])
  const trainingCosts = useMemo(() => economyManager.calculateTrainingCosts(state), [state])
  const netDailyIncome = dailyIncome - facilityMaintenance - trainingCosts

  // Get market insights and recommendations
  const marketInsights = useMemo(() => economyManager.getMarketInsights(state), [state])
  const facilityRecommendations = useMemo(() => guildManager.getFacilityRecommendations(state), [state])
  const availableUpgrades = useMemo(() => guildManager.getAvailableUpgrades(state), [state])

  function refresh() {
    const more = generateQuestList(state.notoriety, state.day)
    state.quests = [...state.quests, ...more]
    emit()
  }

  function assign(qid: string, mid: string) {
    assignMember(state, qid, mid)
    emit()
  }

  function unassign(qid: string, mid: string) {
    unassignMember(state, qid, mid)
    emit()
  }

  function run(qid: string) {
    runQuest(state, qid)
    emit()
  }

  function runAllAssigned() {
    const toRun = state.quests.filter(q => (q.assigned || []).length > 0).map(q => q.id)
    if (toRun.length === 0) return
    for (const id of toRun) {
      runQuest(state, id)
    }
    emit()
  }

  function buildFacility(facilityId: string) {
    if (guildManager.buildFacility(state, facilityId)) {
      emit()
    }
  }

  function upgradeFacility(facilityId: string) {
    if (guildManager.upgradeFacility(state, facilityId)) {
      emit()
    }
  }

  function purchaseUpgrade(upgradeId: string) {
    if (guildManager.purchaseUpgrade(state, upgradeId)) {
      emit()
    }
  }

  function trainMember(memberId: string) {
    const member = state.members.find(m => m.id === memberId)
    if (member && member.trainingLevel < 5 && member.lastTrainingDay !== state.day) {
      const cost = (member.trainingLevel + 1) * 100
      if (state.money >= cost) {
        state.money -= cost
        member.trainingLevel++
        member.lastTrainingDay = state.day
        member.loyalty = Math.min(100, member.loyalty + 10)
        emit()
      }
    }
  }

  return (
    <>
    <div className="card">
      <div className="card-body">
        {/* Header with Guild Status */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <h5 className="card-title mb-0">🏰 Guild Management</h5>
            <div className="small text-muted">
              Level {state.guildLevel} • Reputation: {state.reputation}/100 • Influence: {state.influence}/100
            </div>
          </div>
          <div className="text-end">
            <div className="fw-bold fs-5">💰 {state.money.toLocaleString()}g</div>
            <div className={`small ${netDailyIncome >= 0 ? 'text-success' : 'text-danger'}`}>
              {netDailyIncome >= 0 ? '+' : ''}{netDailyIncome}g/day
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="d-flex gap-2 mb-3">
          <button 
            className={`btn btn-sm ${activeTab === 'quests' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('quests')}
          >
            🗺️ Quests
          </button>
          <button 
            className={`btn btn-sm ${activeTab === 'guild' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('guild')}
          >
            🏗️ Guild
          </button>
          <button 
            className={`btn btn-sm ${activeTab === 'economy' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('economy')}
          >
            💰 Economy
          </button>
          <button 
            className={`btn btn-sm ${activeTab === 'goals' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setActiveTab('goals')}
          >
            🎯 Goals
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'quests' && (
          <div>
            {/* Quest Management Header */}
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">🗺️ Available Quests</h6>
              <div className="d-flex gap-2">
                <button className="btn btn-sm btn-outline-success" onClick={runAllAssigned} disabled={inBattle || state.quests.every(q => (q.assigned || []).length === 0)}>
                  ⚔️ Run All Assigned
                </button>
                <button className="btn btn-sm btn-primary" onClick={refresh} disabled={inBattle}>
                  🔄 Refresh Quests
                </button>
              </div>
            </div>
            
            {/* Available Adventurers */}
            {unassigned.length > 0 && (
              <div className="mb-4 p-3" style={{ background: 'rgba(139, 115, 85, 0.1)', borderRadius: '10px', border: '1px solid var(--parchment-border)' }}>
                <div className="small text-muted mb-2 fw-semibold">👥 Available Adventurers ({unassigned.length})</div>
                <div className="d-flex flex-wrap gap-2">
                  {unassigned.map(m => (
                    <div
                      key={m.id}
                      className="adventurer-avatar d-flex align-items-center justify-content-center"
                      style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', cursor: 'pointer' }}
                      title={`${m.name} — ${m.class} (Training: ${m.trainingLevel}/5, Loyalty: ${m.loyalty}/100)`}
                      onClick={() => setSelectedId(m.id)}
                    >
                      {m.avatar ? (
                        <img src={m.avatar} width={40} height={40} style={{ objectFit: 'cover' }} />
                      ) : (
                        <span className="small text-muted fw-bold">
                          {m.name.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Quest List */}
            {state.quests.length === 0 ? (
              <div className="text-center p-4" style={{ background: 'rgba(139, 115, 85, 0.1)', borderRadius: '10px', border: '1px dashed var(--parchment-border)' }}>
                <div className="text-muted mb-2">📜 No quests available</div>
                <button className="btn btn-primary" onClick={refresh}>🔍 Search for Quests</button>
              </div>
            ) : (
              <div className="row g-3">
                {state.quests.map(q => {
                  const successRate = economyManager.calculateQuestSuccessRate(state, q.difficulty || q.diff, (q.assigned || []).length)
                  const estimatedProfit = economyManager.calculateQuestProfit(state, q.reward, q.difficulty || q.diff, (q.assigned || []).length)
                  
                  return (
                    <div key={q.id} className="col-12 col-md-6 col-lg-4">
                      <div className="quest-card h-100 d-flex flex-column">
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <strong className="fs-6">{q.name}</strong>
                              <span className={`rank-badge rank-${q.rank || 'H'}`}>{q.rank || 'H'}</span>
                            </div>
                            
                            <div className="d-flex flex-wrap gap-1 mb-2">
                              <span className="badge text-bg-light border" title="Reward">💰 {q.reward}g</span>
                              <span className="badge text-bg-light border" title="Fame">⭐ +{q.fame}</span>
                              <span className="badge text-bg-success border fw-bold" title="Estimated experience">📚 ~{calculateQuestExperience(q)} EXP</span>
                            </div>
                            
                            <div className="d-flex flex-wrap gap-1 mb-2">
                              <span className="badge text-bg-light border" title="Trip duration">🗺️⏳ {q.daysRequired || 1}d</span>
                              <span className="badge text-bg-light border" title="Expires on day">📅 D{q.expiresOnDay}</span>
                            </div>
                            
                            {/* Success Rate and Profit Estimation */}
                            <div className="mb-2">
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="small text-muted">Success Rate:</span>
                                <span className={`fw-bold ${successRate >= 70 ? 'text-success' : successRate >= 50 ? 'text-warning' : 'text-danger'}`}>
                                  {successRate}%
                                </span>
                              </div>
                              <div className="progress" style={{ height: 6 }}>
                                <div 
                                  className={`progress-bar ${successRate >= 70 ? 'bg-success' : successRate >= 50 ? 'bg-warning' : 'bg-danger'}`} 
                                  style={{ width: `${successRate}%` }}
                                />
                              </div>
                            </div>
                            
                            {/* Profit Estimation */}
                            <div className="mb-2">
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="small text-muted">Est. Profit:</span>
                                <span className={`fw-bold ${estimatedProfit >= 0 ? 'text-success' : 'text-danger'}`}>
                                  {estimatedProfit >= 0 ? '+' : ''}{estimatedProfit}g
                                </span>
                              </div>
                            </div>
                            
                            {/* Trip visualization */}
                            <div className="mb-2" title={`Trip plan: ${q.daysRequired || 1} day(s)`}>
                              <span className="small text-muted">
                                {Array.from({ length: Math.min(q.daysRequired || 1, 6) }).map((_, i) => (
                                  <span key={i} style={{ marginRight: 2, color: 'var(--accent-gold)' }}>●</span>
                                ))}
                                {((q.daysRequired || 1) > 6) && <span className="ms-1">+{(q.daysRequired || 1) - 6}</span>}
                              </span>
                            </div>
                            
                            {/* Quest expiration progress bar */}
                            {(() => {
                              const total = Math.max(0, (q.expiresOnDay - q.day))
                              const denom = Math.max(0, total - 1)
                              const elapsed = Math.max(0, (state.day - q.day))
                              const ratio = denom <= 0 ? 1 : Math.max(0, Math.min(1, elapsed / denom))
                              const pct = Math.round(ratio * 100)
                              const barClass = ratio > 0.66 ? 'bg-danger' : ratio > 0.33 ? 'bg-warning' : 'bg-success'
                              return (
                                <div className="mb-2">
                                  <div className="small text-muted mb-1">⏰ Quest Expiration</div>
                                  <div className="progress" style={{ height: 6 }}>
                                    <div className={`progress-bar ${barClass}`} style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                              )
                            })()}
                            
                            {q.desc && (
                              <div className="small text-muted mb-2" style={{ fontStyle: 'italic' }}>
                                "{q.desc}"
                              </div>
                            )}
                            
                            {Array.isArray(q.tags) && q.tags.length > 0 && (
                              <div className="mb-2">
                                {q.tags.slice(0, 3).map(t => (
                                  <span key={t} className="badge text-bg-light border me-1" style={{ fontSize: '0.75em' }}>
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <button className="btn btn-sm btn-outline-success ms-2" onClick={() => run(q.id)} disabled={inBattle}>
                            ⚔️ Run
                          </button>
                        </div>
                        
                        <div className="mt-auto">
                          <div className="mb-2">
                            {(q.assigned || []).map(m => (
                              <span
                                key={m.id}
                                className="assigned-adventurer-badge badge text-bg-secondary d-inline-flex align-items-center gap-1 me-1 mb-1"
                                onClick={() => setSelectedId(m.id)}
                                style={{ cursor: 'pointer' }}
                              >
                                {m.avatar && <img src={m.avatar} width={16} height={16} style={{ objectFit: 'cover', borderRadius: 3 }} />}
                                {m.name}
                                <a href="#" className="text-reset text-decoration-none ms-1" onClick={e => { e.preventDefault(); e.stopPropagation(); unassign(q.id, m.id) }}>×</a>
                              </span>
                            ))}
                          </div>
                          
                          <div className="dropdown d-block">
                            <button className="btn btn-sm btn-outline-primary dropdown-toggle w-100" data-bs-toggle="dropdown">
                              👥 Assign Adventurer
                            </button>
                            <ul className="dropdown-menu">
                              {state.members
                                .filter(m => {
                                  const alreadyAssignedHere = (q.assigned || []).some(x => x.id === m.id)
                                  const assignedElsewhere = state.quests.some(qq => qq.id !== q.id && (qq.assigned || []).some(x => x.id === m.id))
                                  const onMission = (state.activeMissions || []).some(mm => (mm.party || []).some(x => x.id === m.id))
                                  return !alreadyAssignedHere && !assignedElsewhere && !onMission
                                })
                                .map(m => (
                                <li key={m.id}>
                                  <a className="dropdown-item d-flex align-items-center gap-2" href="#" onClick={e => { e.preventDefault(); assign(q.id, m.id) }}>
                                    {m.avatar && <img src={m.avatar} width={20} height={20} style={{ objectFit: 'cover', borderRadius: 4 }} />}
                                    <div>
                                      <div className="fw-semibold">{m.name}</div>
                                      <small className="text-muted">{m.class} (Lv.{m.trainingLevel})</small>
                                    </div>
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
            
            {/* Active Missions */}
            {Array.isArray(state.activeMissions) && state.activeMissions.length > 0 && (
              <div className="mt-4">
                <h6 className="mb-3 fw-bold" style={{ color: 'var(--accent-blue)', borderBottom: '2px solid var(--accent-blue)', paddingBottom: '0.5rem' }}>
                  ⚔️ Active Missions
                </h6>
                <div className="vstack gap-3">
                  {state.activeMissions.map(m => (
                    <div key={m.id} className="active-mission-card">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                                                     <div className="d-flex align-items-center gap-2 mb-2">
                             <strong className="fs-6">{m.questName}</strong>
                             <span className="badge text-bg-primary">Active</span>
                           </div>
                          <div className="small text-muted mb-2">
                            👥 {m.party?.length || 0} members • 📅 Day {m.dayStarted} → {m.endOnDay} • ⚔️ {m.battlesCleared || 0}/{m.battlesPlanned || 0} battles cleared
                          </div>
                          {m.log && m.log.length > 0 && (
                            <div className="small text-muted">
                              {m.log.slice(-2).map((line, i) => (
                                <div key={i} className="d-flex align-items-center gap-2">
                                  <span style={{ color: 'var(--accent-gold)' }}>•</span>
                                  <span>{line}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-end ms-3">
                          <div className="badge text-bg-success mb-1">💰 {m.reward}g</div>
                          <div className="badge text-bg-warning">⭐ +{m.fame}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Guild Management Tab */}
        {activeTab === 'guild' && (
          <div>
            <h6 className="mb-3">🏗️ Guild Facilities</h6>
            <div className="row g-3">
              {state.facilities.map(facility => (
                <div key={facility.id} className="col-12 col-md-6">
                  <div className="quest-card">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <h6 className="mb-1">{facility.name}</h6>
                        <p className="small text-muted mb-2">{facility.description}</p>
                        <div className="mb-2">
                          <span className="badge text-bg-light me-2">
                            Level {facility.level}/{facility.maxLevel}
                          </span>
                          {facility.isBuilt && (
                            <span className="badge text-bg-info">
                              Maintenance: {facility.maintenanceCost}g/day
                            </span>
                          )}
                        </div>
                        {facility.effects.map((effect, i) => (
                          <div key={i} className="small text-muted mb-1">
                            • {effect.description}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="d-flex gap-2">
                      {!facility.isBuilt ? (
                        <button 
                          className="btn btn-sm btn-primary"
                          onClick={() => buildFacility(facility.id)}
                          disabled={state.money < facility.baseCost}
                        >
                          🏗️ Build ({facility.baseCost}g)
                        </button>
                      ) : facility.level < facility.maxLevel ? (
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => upgradeFacility(facility.id)}
                          disabled={state.money < facility.upgradeCost}
                        >
                          ⬆️ Upgrade ({facility.upgradeCost}g)
                        </button>
                      ) : (
                        <span className="badge text-bg-success">Max Level</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <h6 className="mb-3 mt-4">⚡ Available Upgrades</h6>
            <div className="row g-3">
              {availableUpgrades.map(upgrade => (
                <div key={upgrade.id} className="col-12 col-md-6">
                  <div className="quest-card">
                    <h6 className="mb-1">{upgrade.name}</h6>
                    <p className="small text-muted mb-2">{upgrade.description}</p>
                    <div className="mb-2">
                      {upgrade.effects.map((effect, i) => (
                        <div key={i} className="small text-muted mb-1">
                          • {effect.description}
                        </div>
                      ))}
                    </div>
                    <button 
                      className="btn btn-sm btn-primary"
                      onClick={() => purchaseUpgrade(upgrade.id)}
                      disabled={state.money < upgrade.cost}
                    >
                      💰 Purchase ({upgrade.cost}g)
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Member Training Section */}
            <h6 className="mb-3 mt-4">🏋️ Member Training</h6>
            <div className="row g-2">
              {state.members.map(member => (
                <div key={member.id} className="col-12 col-md-6 col-lg-4">
                  <div className="quest-card">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      {member.avatar && (
                        <img src={member.avatar} width={32} height={32} style={{ objectFit: 'cover', borderRadius: '50%' }} />
                      )}
                      <div>
                        <div className="fw-semibold">{member.name}</div>
                        <small className="text-muted">{member.class}</small>
                      </div>
                    </div>
                    <div className="mb-2">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small">Training Level:</span>
                        <span className="fw-bold">{member.trainingLevel}/5</span>
                      </div>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="small">Loyalty:</span>
                        <span className="fw-bold">{member.loyalty}/100</span>
                      </div>
                    </div>
                    {member.trainingLevel < 5 && member.lastTrainingDay !== state.day && (
                      <button 
                        className="btn btn-sm btn-outline-primary w-100"
                        onClick={() => trainMember(member.id)}
                        disabled={state.money < (member.trainingLevel + 1) * 100}
                      >
                        🏋️ Train ({(member.trainingLevel + 1) * 100}g)
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Economy Tab */}
        {activeTab === 'economy' && (
          <div>
            <h6 className="mb-3">💰 Economic Overview</h6>
            
            {/* Income Breakdown */}
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <div className="quest-card text-center">
                  <div className="fw-bold fs-4 text-success">+{dailyIncome}g</div>
                  <div className="small text-muted">Daily Income</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="quest-card text-center">
                  <div className="fw-bold fs-4 text-danger">-{facilityMaintenance}g</div>
                  <div className="small text-muted">Facility Costs</div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="quest-card text-center">
                  <div className="fw-bold fs-4 text-warning">-{trainingCosts}g</div>
                  <div className="small text-muted">Training Costs</div>
                </div>
              </div>
            </div>

            {/* Market Insights */}
            <h6 className="mb-3">💹 Market Insights</h6>
            <div className="quest-card mb-3">
              {marketInsights.length > 0 ? (
                <div className="vstack gap-2">
                  {marketInsights.map((insight, i) => (
                    <div key={i} className="d-flex align-items-center gap-2">
                      <span className="text-success">💡</span>
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted">No market insights available</div>
              )}
            </div>

            {/* Facility Recommendations */}
            <h6 className="mb-3">🏗️ Recommendations</h6>
            <div className="quest-card">
              {facilityRecommendations.length > 0 ? (
                <div className="vstack gap-2">
                  {facilityRecommendations.map((rec, i) => (
                    <div key={i} className="d-flex align-items-center gap-2">
                      <span className="text-primary">💡</span>
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted">No recommendations at this time</div>
              )}
            </div>
          </div>
        )}

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div>
            <h6 className="mb-3">🎯 Guild Goals</h6>
            
            {/* Active Goals */}
            <div className="row g-3">
              {state.goals.filter(g => !g.isCompleted).map(goal => (
                <div key={goal.id} className="col-12 col-md-6">
                  <div className="quest-card">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <h6 className="mb-1">{goal.name}</h6>
                        <p className="small text-muted mb-2">{goal.description}</p>
                        <div className="mb-2">
                          <span className={`badge ${goal.type === 'short_term' ? 'text-bg-success' : goal.type === 'medium_term' ? 'text-bg-warning' : 'text-bg-danger'}`}>
                            {goal.type.replace('_', ' ').toUpperCase()}
                          </span>
                          {goal.deadline && (
                            <span className="badge text-bg-light ms-2">
                              Due: Day {goal.deadline}
                            </span>
                          )}
                        </div>
                        <div className="mb-2">
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small">Progress:</span>
                            <span className="fw-bold">{goal.current}/{goal.target}</span>
                          </div>
                          <div className="progress" style={{ height: 8 }}>
                            <div 
                              className="progress-bar bg-success" 
                              style={{ width: `${(goal.current / goal.target) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="small text-muted">
                      <strong>Reward:</strong> {goal.reward.money}g, +{goal.reward.notoriety} notoriety, +{goal.reward.reputation} reputation
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Completed Goals */}
            {state.goals.filter(g => g.isCompleted).length > 0 && (
              <div className="mt-4">
                <h6 className="mb-3">✅ Completed Goals</h6>
                <div className="row g-3">
                  {state.goals.filter(g => g.isCompleted).map(goal => (
                    <div key={goal.id} className="col-12 col-md-6">
                      <div className="quest-card" style={{ opacity: 0.7 }}>
                        <div className="d-flex align-items-center gap-2 mb-2">
                          <h6 className="mb-0">{goal.name}</h6>
                          <span className="badge text-bg-success">✓ Completed</span>
                        </div>
                        <p className="small text-muted mb-0">{goal.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
    
    <AdventurerModal
      open={!!selectedMember}
      onClose={() => setSelectedId(null)}
      adventurer={{
        id: selectedMember?.id || '',
        name: selectedMember?.name || '',
        class: selectedMember?.class || '',
        avatar: selectedMember?.avatar,
        appearance: selectedMember?.appearance,
        personality: selectedMember?.personality,
        gender: selectedMember?.gender,
        upkeep: selectedMember?.upkeep,
        stats: selectedMember?.stats,
        hp: selectedMember?.hp,
        hpMax: selectedMember?.hpMax,
        speed: selectedMember?.speed,
        skills: selectedMember?.skills,
        items: (selectedMember?.items as any) || [],
      }}
    />
    </>
  )
}

export default Quests
