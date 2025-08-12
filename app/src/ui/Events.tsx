import React, { useState } from 'react'
import { useStore } from '../core/store'

export function Events() {
  const { state } = useStore()
  const [collapsedBattles, setCollapsedBattles] = useState<Set<string>>(new Set())
  
  // Separate battle and general events
  const allEvents = state.logs.events || []
  
  // Group events by battle sessions
  const processedEvents: Array<{
    type: 'normal' | 'battle';
    content: string;
    battleId?: string;
    battleEvents?: string[];
    battleParticipants?: string[];
  }> = []
  
  let currentBattleId = ''
  let currentBattleEvents: string[] = []
  let currentBattleParticipants = new Set<string>()
  let inBattle = false
  
  console.log('Processing events:', allEvents.length)
  
  for (let i = 0; i < allEvents.length; i++) {
    const event = allEvents[i]
    
    // Check if this is a battle start event
    if (event.includes('⚔️ Battle begins') || event.includes('⚔️ A battle erupts')) {
      console.log('Battle start detected:', event)
      // If we were already in a battle, save it first
      if (inBattle && currentBattleId && currentBattleEvents.length > 0) {
        console.log('Saving previous battle:', currentBattleId, currentBattleEvents.length)
        processedEvents.push({
          type: 'battle',
          content: `Battle ${currentBattleId}`,
          battleId: currentBattleId,
          battleEvents: [...currentBattleEvents],
          battleParticipants: Array.from(currentBattleParticipants)
        })
      }
      
      // Start new battle
      inBattle = true
      const questMatch = event.match(/during (.+?)!/)
      currentBattleId = questMatch ? questMatch[1] : `Battle ${i}`
      currentBattleEvents = [event]
      currentBattleParticipants = new Set()
      console.log('New battle started:', currentBattleId)
      
    } else if (event.includes('⚔️ Battle concluded') || event.includes('💀 Battle lost') || 
               event.includes('⚔️ A new wave approaches!')) {
      console.log('Battle end/wave detected:', event)
      // End current battle
      if (inBattle && currentBattleId && currentBattleEvents.length > 0) {
        currentBattleEvents.push(event)
        console.log('Saving battle:', currentBattleId, currentBattleEvents.length)
        processedEvents.push({
          type: 'battle',
          content: `Battle ${currentBattleId}`,
          battleId: currentBattleId,
          battleEvents: [...currentBattleEvents],
          battleParticipants: Array.from(currentBattleParticipants)
        })
      }
      
      // Reset battle state
      inBattle = false
      currentBattleId = ''
      currentBattleEvents = []
      currentBattleParticipants = new Set()
      
    } else if (inBattle && (
      event.includes('⚔️') || event.includes('👹') || event.includes('🧪') || 
      event.includes('🛡️') || event.includes('🎉') || event.includes('⭐')
    )) {
      // Battle event - add to current battle
      currentBattleEvents.push(event)
      console.log('Battle event added:', event)
      
      // Extract participant names from battle events
      if (event.includes('attacks') || event.includes('hits')) {
        const nameMatch = event.match(/([A-Za-z]+) (?:attacks|hits)/)
        if (nameMatch) currentBattleParticipants.add(nameMatch[1])
      }
      
      // Also extract names from experience gains and other battle events
      if (event.includes('gained') && event.includes('experience')) {
        const nameMatch = event.match(/([A-Za-z]+) gained/)
        if (nameMatch) currentBattleParticipants.add(nameMatch[1])
      }
      
      if (event.includes('defends')) {
        const nameMatch = event.match(/([A-Za-z]+) defends/)
        if (nameMatch) currentBattleParticipants.add(nameMatch[1])
      }
      
      if (event.includes('used')) {
        const nameMatch = event.match(/([A-Za-z]+) used/)
        if (nameMatch) currentBattleParticipants.add(nameMatch[1])
      }
      
    } else {
      // Normal event - if we were in a battle, save it first
      if (inBattle && currentBattleId && currentBattleEvents.length > 0) {
        console.log('Saving battle before normal event:', currentBattleId, currentBattleEvents.length)
        processedEvents.push({
          type: 'battle',
          content: `Battle ${currentBattleId}`,
          battleId: currentBattleId,
          battleEvents: [...currentBattleEvents],
          battleParticipants: Array.from(currentBattleParticipants)
        })
        // Reset battle state
        inBattle = false
        currentBattleId = ''
        currentBattleEvents = []
        currentBattleParticipants = new Set()
      }
      
      // Add normal event
      processedEvents.push({ type: 'normal', content: event })
    }
  }
  
  // Add any remaining battle
  if (inBattle && currentBattleId && currentBattleEvents.length > 0) {
    console.log('Saving final battle:', currentBattleId, currentBattleEvents.length)
    processedEvents.push({
      type: 'battle',
      content: `Battle ${currentBattleId}`,
      battleId: currentBattleId,
      battleEvents: [...currentBattleEvents],
      battleParticipants: Array.from(currentBattleParticipants)
    })
  }
  
  console.log('Processed events:', processedEvents.length, 'battles:', processedEvents.filter(e => e.type === 'battle').length)
  
  const toggleBattle = (battleId: string) => {
    const newCollapsed = new Set(collapsedBattles)
    if (newCollapsed.has(battleId)) {
      newCollapsed.delete(battleId)
    } else {
      newCollapsed.add(battleId)
    }
    setCollapsedBattles(newCollapsed)
  }
  
  return (
    <div className="card">
      <div className="card-body">
        <h5 className="card-title">Event Log</h5>
        
        {/* Events Section */}
        <div className="border rounded-3 p-2" style={{ minHeight: 160, maxHeight: 280, overflowY: 'auto' }}>
          <div className="small text-muted mb-2 fw-semibold">📋 Events:</div>
          
          {processedEvents.slice(0, 50).map((event, index) => {
            if (event.type === 'battle') {
              const isCollapsed = collapsedBattles.has(event.battleId!)
              const participantNames = event.battleParticipants && event.battleParticipants.length > 0 
                ? `[${event.battleParticipants.join(' and ')}]` 
                : ''
              
              return (
                <div key={`battle-${index}`} className="mb-1">
                  <div 
                    className="text-primary text-decoration-underline small d-flex align-items-center gap-2" 
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleBattle(event.battleId!)}
                  >
                    {isCollapsed ? '▶' : '▼'}
                    <span className="text-muted">• {event.content} {participantNames}</span>
                  </div>
                  {!isCollapsed && event.battleEvents && (
                    <div className="ps-3 mt-1 small text-muted border-start border-2 border-primary">
                      {event.battleEvents.map((battleEvent, i) => (
                        <div key={i} className="mb-1">• {battleEvent}</div>
                      ))}
                    </div>
                  )}
                </div>
              )
            } else {
              return <div key={`normal-${index}`}>• {event.content}</div>
            }
          })}
        </div>
        
        {state.archives?.fallen?.length ? (
          <div className="mt-3">
            <h6 className="mb-2">Graveyard ⚰️</h6>
            <div className="small text-muted">
              {state.archives.fallen.slice(0, 10).map((f, i) => (
                <div key={i}>☠️ {f.name} — {f.class} · D{f.diedOnDay} · {f.cause}</div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}


