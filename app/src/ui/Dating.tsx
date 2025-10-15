import React, { useState } from 'react'
import { useStore } from '../core/store'
import { 
  DatingAction, 
  RomanticInterest, 
  Member, 
  HeartLevel 
} from '../core/types'
import { 
  performDatingAction, 
  getHeartLevelInfo, 
  getHeartLevelEmoji,
  HEART_LEVEL_INFO,
  createRomanticInterest
} from '../core/dating'

export function Dating() {
  const { state, emit } = useStore()
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)
  const [selectedAction, setSelectedAction] = useState<DatingAction | null>(null)
  const [showActionModal, setShowActionModal] = useState(false)
  const [actionResult, setActionResult] = useState<{ success: boolean; message: string } | null>(null)

  // Get all members that can be romantic interests (exclude player)
  const availableMembers = state.members.filter(member => !member.isPlayer && member.gender)

  // Get or create romantic interest for a member
  const getRomanticInterest = (memberId: string): RomanticInterest | null => {
    return state.datingSystem.romanticInterests.find(ri => ri.memberId === memberId) || null
  }

  // Start dating a member
  const startDating = (member: Member) => {
    if (state.datingSystem.romanticInterests.length >= state.datingSystem.maxRomanticInterests) {
      alert('You can only have up to 5 romantic interests at once!')
      return
    }

    // Check if already dating
    const existing = getRomanticInterest(member.id)
    if (existing) {
      alert('You are already pursuing this person!')
      return
    }

    // Create new romantic interest
    const newInterest = createRomanticInterest(member.id, member)

    state.datingSystem.romanticInterests.push(newInterest)
    emit()
  }

  // Perform dating action
  const handleDatingAction = () => {
    if (!selectedMember || !selectedAction) return

    const romanticInterest = getRomanticInterest(selectedMember.id)
    if (!romanticInterest) {
      alert('You need to start dating this person first!')
      return
    }

    const result = performDatingAction(selectedAction, romanticInterest, selectedMember, state)
    
    if (result.success) {
      // Spend money if action costs money
      if (selectedAction.cost > 0) {
        state.money -= selectedAction.cost
      }
      
      emit()
      setActionResult({ success: true, message: result.message })
    } else {
      setActionResult({ success: false, message: result.message })
    }

    setTimeout(() => setActionResult(null), 3000)
  }

  // Render heart level bar
  const renderHeartBar = (heartLevel: HeartLevel, progress: number) => {
    const heartInfo = getHeartLevelInfo(heartLevel)
    const emoji = getHeartLevelEmoji(heartLevel)
    
    return (
      <div className="heart-level-display">
        <div className="heart-header">
          <span className="heart-emoji">{emoji}</span>
          <span className="heart-level-text">
            {heartLevel} Hearts - {heartInfo.name}
          </span>
        </div>
        <div className="heart-progress-bar">
          <div 
            className="heart-progress-fill"
            style={{ 
              width: `${progress}%`,
              backgroundColor: heartInfo.color
            }}
          />
        </div>
        <div className="heart-description">{heartInfo.description}</div>
      </div>
    )
  }

  // Render dating actions
  const renderDatingActions = (member: Member, romanticInterest: RomanticInterest) => {
    const availableActions = state.datingSystem.availableActions.filter(action => 
      action.isAvailable(member, romanticInterest)
    )

    return (
      <div className="dating-actions">
        <h4>Available Actions</h4>
        <div className="action-grid">
          {availableActions.map(action => (
            <button
              key={action.id}
              className="action-button"
              onClick={() => {
                setSelectedMember(member)
                setSelectedAction(action)
                setShowActionModal(true)
              }}
            >
              <div className="action-name">{action.name}</div>
              <div className="action-cost">
                {action.cost > 0 ? `${action.cost}g` : 'Free'}
              </div>
              <div className="action-hearts">+{action.heartGain} ❤️</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // Render member card
  const renderMemberCard = (member: Member) => {
    const romanticInterest = getRomanticInterest(member.id)
    const isDating = !!romanticInterest

    return (
      <div key={member.id} className="member-card">
        <div className="member-header">
          <div className="member-avatar">
            {member.avatar ? (
              <img src={member.avatar} alt={member.name} />
            ) : (
              <div className="avatar-placeholder">
                {member.gender === 'female' ? '♀️' : '♂️'}
              </div>
            )}
          </div>
          <div className="member-info">
            <h3>{member.name}</h3>
            <p className="member-class">{member.class}</p>
            <p className="member-personality">{member.personality}</p>
          </div>
          <div className="member-status">
            {isDating ? (
              <span className="status-dating">💕 Dating</span>
            ) : (
              <span className="status-single">💔 Single</span>
            )}
          </div>
        </div>

        {isDating && romanticInterest ? (
          <div className="romantic-details">
            {renderHeartBar(romanticInterest.heartLevel, romanticInterest.heartProgress)}
            <div className="relationship-info">
              <p><strong>Status:</strong> {romanticInterest.datingStatus}</p>
              <p><strong>Total Interactions:</strong> {romanticInterest.totalInteractions}</p>
              {romanticInterest.relationshipStartDay && (
                <p><strong>Dating Since:</strong> Day {romanticInterest.relationshipStartDay}</p>
              )}
            </div>
            {renderDatingActions(member, romanticInterest)}
          </div>
        ) : (
          <div className="start-dating">
            <button 
              className="start-dating-btn"
              onClick={() => startDating(member)}
            >
              💕 Start Dating
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="dating-container">
      <div className="dating-header">
        <h1>💕 Dating & Romance</h1>
        <p>Build relationships with your guild members and find true love!</p>
        <div className="dating-stats">
          <span>Romantic Interests: {state.datingSystem.romanticInterests.length}/{state.datingSystem.maxRomanticInterests}</span>
          <span>Marriage Enabled: {state.datingSystem.marriageEnabled ? '✅' : '❌'}</span>
        </div>
      </div>

      {availableMembers.length === 0 ? (
        <div className="no-members">
          <p>No eligible members found. Recruit some adventurers to start dating!</p>
        </div>
      ) : (
        <div className="members-grid">
          {availableMembers.map(renderMemberCard)}
        </div>
      )}

      {/* Action Modal */}
      {showActionModal && selectedMember && selectedAction && (
        <div className="modal-overlay" onClick={() => setShowActionModal(false)}>
          <div className="action-modal" onClick={e => e.stopPropagation()}>
            <h3>💕 {selectedAction.name}</h3>
            <p>{selectedAction.description}</p>
            <div className="action-details">
              <p><strong>Cost:</strong> {selectedAction.cost > 0 ? `${selectedAction.cost}g` : 'Free'}</p>
              <p><strong>Heart Gain:</strong> +{selectedAction.heartGain} ❤️</p>
              <p><strong>Cooldown:</strong> {selectedAction.cooldownDays} days</p>
            </div>
            <div className="action-requirements">
              <h4>Requirements:</h4>
              {selectedAction.requirements.length > 0 ? (
                <ul>
                  {selectedAction.requirements.map((req, index) => (
                    <li key={index}>{req.description}</li>
                  ))}
                </ul>
              ) : (
                <p>No special requirements</p>
              )}
            </div>
            <div className="modal-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowActionModal(false)}
              >
                Cancel
              </button>
              <button 
                className="confirm-btn"
                onClick={handleDatingAction}
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Result Toast */}
      {actionResult && (
        <div className={`action-result ${actionResult.success ? 'success' : 'error'}`}>
          {actionResult.message}
        </div>
      )}

      <style jsx>{`
        .dating-container {
          padding: 20px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .dating-header {
          text-align: center;
          margin-bottom: 30px;
          padding: 20px;
          background: linear-gradient(135deg, #ff6b9d, #c44569);
          border-radius: 15px;
          color: white;
        }

        .dating-header h1 {
          margin: 0 0 10px 0;
          font-size: 2.5em;
        }

        .dating-stats {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 15px;
        }

        .members-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
          gap: 20px;
        }

        .member-card {
          background: white;
          border-radius: 15px;
          padding: 20px;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
          border: 2px solid #f8f9fa;
        }

        .member-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 20px;
        }

        .member-avatar img {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
        }

        .member-info h3 {
          margin: 0 0 5px 0;
          color: #2c3e50;
        }

        .member-class, .member-personality {
          margin: 5px 0;
          color: #7f8c8d;
          font-size: 0.9em;
        }

        .member-status {
          margin-left: auto;
        }

        .status-dating {
          color: #e74c3c;
          font-weight: bold;
        }

        .status-single {
          color: #95a5a6;
        }

        .romantic-details {
          border-top: 1px solid #ecf0f1;
          padding-top: 20px;
        }

        .heart-level-display {
          margin-bottom: 20px;
        }

        .heart-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 10px;
        }

        .heart-emoji {
          font-size: 24px;
        }

        .heart-level-text {
          font-weight: bold;
          color: #2c3e50;
        }

        .heart-progress-bar {
          width: 100%;
          height: 20px;
          background: #ecf0f1;
          border-radius: 10px;
          overflow: hidden;
          margin-bottom: 10px;
        }

        .heart-progress-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .heart-description {
          font-size: 0.9em;
          color: #7f8c8d;
          text-align: center;
        }

        .relationship-info {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 20px;
        }

        .relationship-info p {
          margin: 5px 0;
          font-size: 0.9em;
        }

        .dating-actions h4 {
          margin: 0 0 15px 0;
          color: #2c3e50;
        }

        .action-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 10px;
        }

        .action-button {
          background: white;
          border: 2px solid #3498db;
          border-radius: 10px;
          padding: 15px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-align: center;
        }

        .action-button:hover {
          background: #3498db;
          color: white;
          transform: translateY(-2px);
        }

        .action-name {
          font-weight: bold;
          margin-bottom: 5px;
        }

        .action-cost {
          font-size: 0.8em;
          color: #27ae60;
          margin-bottom: 5px;
        }

        .action-hearts {
          font-size: 0.9em;
          color: #e74c3c;
        }

        .start-dating {
          text-align: center;
          padding: 20px;
        }

        .start-dating-btn {
          background: linear-gradient(135deg, #ff6b9d, #c44569);
          color: white;
          border: none;
          border-radius: 25px;
          padding: 12px 30px;
          font-size: 1.1em;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .start-dating-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(255, 107, 157, 0.4);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .action-modal {
          background: white;
          border-radius: 15px;
          padding: 30px;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .action-modal h3 {
          margin: 0 0 15px 0;
          color: #2c3e50;
        }

        .action-details {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 10px;
          margin: 20px 0;
        }

        .action-details p {
          margin: 8px 0;
          font-size: 0.9em;
        }

        .action-requirements {
          margin: 20px 0;
        }

        .action-requirements h4 {
          margin: 0 0 10px 0;
          color: #2c3e50;
        }

        .action-requirements ul {
          margin: 0;
          padding-left: 20px;
        }

        .action-requirements li {
          margin: 5px 0;
          font-size: 0.9em;
        }

        .modal-actions {
          display: flex;
          gap: 15px;
          justify-content: flex-end;
          margin-top: 30px;
        }

        .cancel-btn, .confirm-btn {
          padding: 10px 20px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 1em;
          transition: all 0.3s ease;
        }

        .cancel-btn {
          background: #95a5a6;
          color: white;
        }

        .confirm-btn {
          background: #3498db;
          color: white;
        }

        .cancel-btn:hover, .confirm-btn:hover {
          transform: translateY(-2px);
        }

        .action-result {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 15px 25px;
          border-radius: 10px;
          color: white;
          font-weight: bold;
          z-index: 1001;
          animation: slideIn 0.3s ease;
        }

        .action-result.success {
          background: #27ae60;
        }

        .action-result.error {
          background: #e74c3c;
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .no-members {
          text-align: center;
          padding: 60px 20px;
          color: #7f8c8d;
          font-size: 1.2em;
        }
      `}</style>
    </div>
  )
}
