(() => {
  const { useStore } = window.GameReactApp;
  function CandidateCard({ c }) {
    return (
      React.createElement('div', { className: 'entity-pill d-flex justify-content-between align-items-center' },
        React.createElement('div', { className: 'd-flex align-items-center gap-2' },
          (c.avatar || c.portrait) ? React.createElement('img', { src: c.avatar || c.portrait, alt: c.name, width: 40, height: 40, style: { objectFit: 'cover', borderRadius: 8 } }) : null,
          React.createElement('div', null,
            React.createElement('div', null, React.createElement('strong', null, c.name), ` — ${c.class} · `, React.createElement('span', { className: 'subtle' }, c.personality)),
            React.createElement('div', { className: 'small subtle' }, c.appearance || ''),
            React.createElement('div', { className: 'small subtle' }, `STR ${c.stats.str} INT ${c.stats.int} AGI ${c.stats.agi} SPR ${c.stats.spr} · Upkeep ${c.upkeep}g`)
          )
        ),
        React.createElement('div', { className: 'btn-group' },
          React.createElement('button', { className: 'btn btn-sm btn-outline-primary', onClick: () => RecruitmentSystem.acceptCandidate(GameState, c.id) }, 'Accept'),
          React.createElement('button', { className: 'btn btn-sm btn-outline-secondary', onClick: () => RecruitmentSystem.rejectCandidate(GameState, c.id) }, 'Reject')
        )
      )
    );
  }
  function Recruitment() {
    const { state } = useStore();
    return (
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-body' },
          React.createElement('div', { className: 'd-flex justify-content-between align-items-center mb-2' },
            React.createElement('h5', { className: 'mb-0' }, 'Weekly Candidates'),
            React.createElement('div', { className: 'small subtle' }, `Week ${Math.floor((state.day - 1)/7)+1}`)
          ),
          state.candidates.length === 0 ? React.createElement('div', { className: 'text-muted' }, 'No candidates yet.') :
            React.createElement('div', { className: 'vstack gap-2' }, state.candidates.map(c => React.createElement(CandidateCard, { key: c.id, c })))
        )
      )
    );
  }
  window.GameReactApp = window.GameReactApp || {};
  window.GameReactApp.Recruitment = Recruitment;
})();

function Recruitment() {
  const { state, actions } = window.GameReactStore.useGame();
  const list = state.candidates || [];
  if (list.length === 0) return <div className="text-muted">No candidates this week.</div>;
  return (
    <div className="vstack gap-2">
      {list.map(c => (
        <div key={c.id} className="entity-pill d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            {c.portrait ? <img src={c.portrait} alt="portrait" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} /> : null}
            <div>
              <div><strong>{c.name}</strong> — {c.class} · <span className="subtle">{c.personality}</span></div>
              <div className="small subtle">{c.appearance || ''}</div>
              <div className="small subtle">STR {c.stats.str} INT {c.stats.int} AGI {c.stats.agi} SPR {c.stats.spr} · Upkeep {c.upkeep}g</div>
            </div>
          </div>
          <div className="btn-group">
            <button className="btn btn-sm btn-outline-primary" onClick={() => actions.acceptCandidate(c.id)}><i className="bi bi-check2"></i> Accept</button>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => actions.rejectCandidate(c.id)}><i className="bi bi-x"></i> Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}

window.GameReactRecruitment = { Recruitment };


