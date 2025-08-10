(() => {
  const { useStore } = window.GameReactApp;
  function MemberCard({ m }) {
    return (
      React.createElement('div', { className: 'entity-pill d-flex justify-content-between align-items-center' },
        React.createElement('div', { className: 'd-flex align-items-center gap-2' },
          (m.avatar || m.portrait) ? React.createElement('img', { src: m.avatar || m.portrait, alt: m.name, width: 40, height: 40, style: { objectFit: 'cover', borderRadius: 8 } }) : null,
          React.createElement('div', null,
            React.createElement('div', null, React.createElement('strong', null, m.name), ` — ${m.class} `, m.isPlayer ? React.createElement('span', { className: 'badge text-bg-info ms-1' }, 'You') : null, ' · ', React.createElement('span', { className: 'subtle' }, m.personality)),
            React.createElement('div', { className: 'small subtle' }, m.appearance || ''),
            React.createElement('div', { className: 'small subtle' }, `STR ${m.stats.str} INT ${m.stats.int} AGI ${m.stats.agi} SPR ${m.stats.spr} · Upkeep ${m.upkeep}g`)
          )
        ),
        React.createElement('div', null,
          !m.isPlayer && React.createElement('button', { className: 'btn btn-sm btn-outline-danger', onClick: () => RecruitmentSystem.fireMember(GameState, m.id) }, 'Fire')
        )
      )
    );
  }
  function Guild() {
    const { state } = useStore();
    return (
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-body' },
          React.createElement('h5', { className: 'card-title' }, 'Guild Members'),
          state.members.length === 0 ? React.createElement('div', { className: 'text-muted' }, 'No members yet.') :
            React.createElement('div', { className: 'vstack gap-2' }, state.members.map(m => React.createElement(MemberCard, { key: m.id, m })))
        )
      )
    );
  }
  window.GameReactApp = window.GameReactApp || {};
  window.GameReactApp.Guild = Guild;
})();

function Guild() {
  const { state, actions } = window.GameReactStore.useGame();
  if (!state.members || state.members.length === 0) {
    return <div className="text-muted">No members yet.</div>;
  }
  return (
    <div className="vstack gap-2">
      {state.members.map(m => (
        <div key={m.id} className="entity-pill d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            {m.portrait ? <img src={m.portrait} alt="portrait" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} /> : null}
            <div>
              <div><strong>{m.name}</strong> — {m.class} {m.isPlayer ? <span className="badge text-bg-info ms-1">You</span> : null} · <span className="subtle">{m.personality}</span></div>
              <div className="small subtle">{m.appearance || ''}</div>
              <div className="small subtle">STR {m.stats.str} INT {m.stats.int} AGI {m.stats.agi} SPR {m.stats.spr} · Upkeep {m.upkeep}g</div>
            </div>
          </div>
          <div>
            {!m.isPlayer ? <button className="btn btn-sm btn-outline-danger" onClick={() => actions.fireMember(m.id)}><i className="bi bi-person-dash"></i> Fire</button> : null}
          </div>
        </div>
      ))}
    </div>
  );
}

window.GameReactGuild = { Guild };


