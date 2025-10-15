import React, { useState, useEffect } from 'react'
import { DungeonScene } from './DungeonScene'
import { DungeonLogic } from '../core/dungeonLogic'
import { DungeonState, DungeonAction, DungeonEvent, DungeonQuest } from '../core/types'
import { createDungeonState } from '../core/dungeon'

interface DungeonCrawlerProps {
  quest: DungeonQuest
  party: any[]
  onComplete: (success: boolean, rewards: any) => void
  onExit: () => void
}

export function DungeonCrawler({ quest, party, onComplete, onExit }: DungeonCrawlerProps) {
  const [dungeonState, setDungeonState] = useState<DungeonState | null>(null)
  const [dungeonLogic, setDungeonLogic] = useState<DungeonLogic | null>(null)
  const [gameLog, setGameLog] = useState<string[]>([])
  const [showAutomap, setShowAutomap] = useState(false)
  const [currentMessage, setCurrentMessage] = useState<string>('')

  useEffect(() => {
    if (!dungeonState) {
      const newDungeonState = createDungeonState(quest, party)
      setDungeonState(newDungeonState)
      setDungeonLogic(new DungeonLogic(newDungeonState))
      
      // Add initial log entry
      setGameLog([`Entered ${quest.theme} - ${quest.description}`])
    }
  }, [quest, party, dungeonState])

  const handleAction = (action: DungeonAction) => {
    if (!dungeonLogic || !dungeonState) return

    const result = dungeonLogic.processAction(action)
    
    if (result.success) {
      // Add success message to log
      const newLog = [...gameLog, `✓ ${result.message}`]
      setGameLog(newLog)
      setCurrentMessage(result.message)

      // Add events to log
      if (result.events) {
        result.events.forEach(event => {
          newLog.push(`💡 ${event.description}`)
        })
        setGameLog(newLog)
      }

      // Check if dungeon is completed
      if (dungeonLogic.isDungeonCompleted()) {
        handleDungeonComplete(true)
      }

      // Update dungeon state
      setDungeonState({ ...dungeonLogic.getDungeonState() })
    } else {
      // Add failure message to log
      setGameLog([...gameLog, `✗ ${result.message}`])
      setCurrentMessage(result.message)
    }

    // Clear message after 3 seconds
    setTimeout(() => setCurrentMessage(''), 3000)
  }

  const handleDungeonComplete = (success: boolean) => {
    if (!dungeonState) return

    const rewards = {
      experience: quest.reward.experience,
      gold: quest.reward.gold,
      items: dungeonState.inventory,
      reputation: quest.reward.reputation
    }

    // Add completion message to log
    if (success) {
      setGameLog([...gameLog, `🎉 Dungeon completed successfully!`, `Rewards: ${rewards.gold}g, ${rewards.experience} XP`])
    } else {
      setGameLog([...gameLog, `💀 Dungeon failed!`])
    }

    // Wait a moment then call completion callback
    setTimeout(() => {
      onComplete(success, rewards)
    }, 2000)
  }

  const handleExit = () => {
    if (dungeonState && dungeonLogic) {
      // Check if dungeon is completed
      if (dungeonLogic.isDungeonCompleted()) {
        handleDungeonComplete(true)
      } else {
        // Ask for confirmation
        if (window.confirm('Are you sure you want to exit? Progress will be lost.')) {
          onExit()
        }
      }
    } else {
      onExit()
    }
  }

  const renderAutomap = () => {
    if (!dungeonState || !showAutomap) return null

    const currentLevel = dungeonState.levels[dungeonState.currentLevel - 1]
    if (!currentLevel) return null

    const tileSize = 8 // Smaller tiles for automap
    const mapWidth = currentLevel.width
    const mapHeight = currentLevel.height

    return (
      <div className="automap-overlay">
        <div className="automap-header">
          <h3>Automap - Level {dungeonState.currentLevel}</h3>
          <button onClick={() => setShowAutomap(false)}>Close</button>
        </div>
        <div className="automap-container">
          <div 
            className="automap-grid"
            style={{
              width: mapWidth * tileSize,
              height: mapHeight * tileSize
            }}
          >
            {Array.from({ length: mapHeight }, (_, y) =>
              Array.from({ length: mapWidth }, (_, x) => {
                const tile = currentLevel.tiles[x]?.[y]
                const isExplored = dungeonState.automap.exploredTiles.has(`${x},${y}`)
                const isPlayerHere = dungeonState.playerPosition.x === x && dungeonState.playerPosition.y === y
                
                if (!tile || !isExplored) {
                  return <div key={`${x}-${y}`} className="automap-tile unexplored" />
                }

                let tileClass = 'automap-tile'
                let tileContent = ''

                if (isPlayerHere) {
                  tileClass += ' player'
                  tileContent = '👤'
                } else {
                  switch (tile.type) {
                    case 'floor':
                      tileClass += ' floor'
                      break
                    case 'wall':
                      tileClass += ' wall'
                      break
                    case 'water':
                      tileClass += ' water'
                      break
                    case 'stairs_up':
                      tileClass += ' stairs'
                      tileContent = '⬆️'
                      break
                    case 'stairs_down':
                      tileClass += ' stairs'
                      tileContent = '⬇️'
                      break
                    case 'door':
                      tileClass += ' door'
                      tileContent = '🚪'
                      break
                    default:
                      tileClass += ' floor'
                  }

                  // Add items
                  const item = currentLevel.items.find(i => i.x === x && i.y === y && !i.isCollected)
                  if (item) {
                    tileContent = '💎'
                  }

                  // Add monsters
                  const monster = currentLevel.monsters.find(m => m.x === x && m.y === y && m.isAlive)
                  if (monster) {
                    tileContent = '👹'
                  }

                  // Add traps
                  const trap = currentLevel.traps.find(t => t.x === x && t.y === y && !t.isTriggered)
                  if (trap) {
                    tileContent = '⚠️'
                  }
                }

                return (
                  <div 
                    key={`${x}-${y}`} 
                    className={tileClass}
                    style={{
                      width: tileSize,
                      height: tileSize
                    }}
                  >
                    {tileContent}
                  </div>
                )
              })
            )}
          </div>
        </div>
        <div className="automap-legend">
          <div className="legend-item">
            <span className="legend-symbol">👤</span> Player
          </div>
          <div className="legend-item">
            <span className="legend-symbol">⬆️</span> Stairs Up
          </div>
          <div className="legend-item">
            <span className="legend-symbol">⬇️</span> Stairs Down
          </div>
          <div className="legend-item">
            <span className="legend-symbol">💎</span> Item
          </div>
          <div className="legend-item">
            <span className="legend-symbol">👹</span> Monster
          </div>
          <div className="legend-item">
            <span className="legend-symbol">⚠️</span> Trap
          </div>
          <div className="legend-item">
            <span className="legend-symbol">🚪</span> Door
          </div>
        </div>
      </div>
    )
  }

  if (!dungeonState || !dungeonLogic) {
    return (
      <div className="dungeon-loading">
        <div className="loading-spinner">Generating Dungeon...</div>
      </div>
    )
  }

  return (
    <div className="dungeon-crawler">
      {/* Game Scene */}
      <DungeonScene 
        dungeonState={dungeonState}
        onAction={handleAction}
        onExit={handleExit}
      />

      {/* UI Overlay */}
      <div className="ui-overlay">
        {/* Top Bar */}
        <div className="top-bar">
          <div className="quest-info">
            <h2>{quest.name}</h2>
            <p>{quest.description}</p>
          </div>
          <div className="player-stats">
            <div className="stat">
              <span className="stat-label">HP:</span>
              <span className="stat-value">{dungeonState.playerStats.hp}/{dungeonState.playerStats.maxHp}</span>
            </div>
            <div className="stat">
              <span className="stat-label">MP:</span>
              <span className="stat-value">{dungeonState.playerStats.mp}/{dungeonState.playerStats.maxMp}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Level:</span>
              <span className="stat-value">{dungeonState.currentLevel}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Turns:</span>
              <span className="stat-value">{dungeonState.turns}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button onClick={() => handleAction({ type: 'search' })}>🔍 Search</button>
          <button onClick={() => handleAction({ type: 'rest' })}>😴 Rest</button>
          <button onClick={() => handleAction({ type: 'flee' })}>🏃 Flee</button>
          <button onClick={() => setShowAutomap(!showAutomap)}>🗺️ Map</button>
          <button onClick={handleExit} className="exit-btn">🚪 Exit</button>
        </div>

        {/* Game Log */}
        <div className="game-log">
          <h3>Game Log</h3>
          <div className="log-content">
            {gameLog.slice(-20).map((entry, index) => (
              <div key={index} className="log-entry">
                {entry}
              </div>
            ))}
          </div>
        </div>

        {/* Current Message */}
        {currentMessage && (
          <div className="current-message">
            {currentMessage}
          </div>
        )}

        {/* Inventory */}
        <div className="inventory">
          <h3>Inventory ({dungeonState.inventory.length})</h3>
          <div className="inventory-items">
            {dungeonState.inventory.map((item, index) => (
              <div key={index} className="inventory-item">
                <span className="item-name">{item.name}</span>
                <span className="item-value">{item.value}g</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Automap Overlay */}
      {renderAutomap()}

      <style jsx>{`
        .dungeon-crawler {
          position: relative;
          width: 100%;
          height: 100vh;
          background: #000;
        }

        .ui-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 100;
        }

        .top-bar {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          pointer-events: auto;
        }

        .quest-info h2 {
          margin: 0 0 5px 0;
          font-size: 18px;
        }

        .quest-info p {
          margin: 0;
          font-size: 14px;
          opacity: 0.8;
        }

        .player-stats {
          display: flex;
          gap: 20px;
        }

        .stat {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .stat-label {
          font-size: 12px;
          opacity: 0.7;
        }

        .stat-value {
          font-size: 16px;
          font-weight: bold;
        }

        .action-buttons {
          position: absolute;
          top: 80px;
          right: 10px;
          display: flex;
          flex-direction: column;
          gap: 5px;
          pointer-events: auto;
        }

        .action-buttons button {
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          border: 1px solid #333;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .action-buttons button:hover {
          background: rgba(0, 0, 0, 0.9);
          border-color: #666;
        }

        .exit-btn {
          background: rgba(255, 0, 0, 0.8) !important;
          border-color: #ff0000 !important;
        }

        .game-log {
          position: absolute;
          bottom: 10px;
          left: 10px;
          width: 300px;
          height: 200px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          border-radius: 4px;
          pointer-events: auto;
        }

        .game-log h3 {
          margin: 0;
          padding: 10px;
          border-bottom: 1px solid #333;
          font-size: 16px;
        }

        .log-content {
          height: 150px;
          overflow-y: auto;
          padding: 10px;
        }

        .log-entry {
          margin-bottom: 5px;
          font-size: 12px;
          line-height: 1.3;
        }

        .current-message {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.9);
          color: white;
          padding: 20px;
          border-radius: 8px;
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          pointer-events: none;
          z-index: 200;
        }

        .inventory {
          position: absolute;
          bottom: 10px;
          right: 10px;
          width: 250px;
          height: 200px;
          background: rgba(0, 0, 0, 0.8);
          color: white;
          border-radius: 4px;
          pointer-events: auto;
        }

        .inventory h3 {
          margin: 0;
          padding: 10px;
          border-bottom: 1px solid #333;
          font-size: 16px;
        }

        .inventory-items {
          height: 150px;
          overflow-y: auto;
          padding: 10px;
        }

        .inventory-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 5px;
          font-size: 12px;
        }

        .item-name {
          opacity: 0.9;
        }

        .item-value {
          opacity: 0.7;
        }

        .automap-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(0, 0, 0, 0.95);
          color: white;
          border-radius: 8px;
          padding: 20px;
          z-index: 300;
          pointer-events: auto;
        }

        .automap-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .automap-header h3 {
          margin: 0;
        }

        .automap-header button {
          padding: 5px 10px;
          background: #333;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }

        .automap-container {
          display: flex;
          justify-content: center;
          margin-bottom: 15px;
        }

        .automap-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, 8px);
          gap: 0;
          border: 1px solid #333;
        }

        .automap-tile {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 6px;
          border: 1px solid transparent;
        }

        .automap-tile.unexplored {
          background: #222;
        }

        .automap-tile.floor {
          background: #444;
        }

        .automap-tile.wall {
          background: #666;
        }

        .automap-tile.water {
          background: #0066cc;
        }

        .automap-tile.stairs {
          background: #cc6600;
        }

        .automap-tile.door {
          background: #996633;
        }

        .automap-tile.player {
          background: #00cc00;
        }

        .automap-legend {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 5px;
          font-size: 12px;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .legend-symbol {
          font-size: 14px;
        }

        .dungeon-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background: #000;
          color: white;
        }

        .loading-spinner {
          font-size: 24px;
          font-weight: bold;
        }
      `}</style>
    </div>
  )
}
