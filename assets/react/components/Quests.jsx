(() => {
  const { useStore } = window.GameReactApp;
  function MemberChip({ m, onRemove }) {
    return React.createElement('span', { className: 'badge text-bg-secondary me-1 d-inline-flex align-items-center gap-1' },
      (m.avatar || m.portrait) ? React.createElement('img', { src: m.avatar || m.portrait, alt: m.name, width: 16, height: 16, style: { objectFit: 'cover', borderRadius: 3 } }) : null,
      m.name,
      React.createElement('a', { href: '#', onClick: (e) => { e.preventDefault(); onRemove && onRemove(); }, className: 'text-reset text-decoration-none ms-1' }, '×')
    );
  }
  function AssignPicker({ quest, members }) {
    const available = members.filter(m => !(quest.assigned || []).some(a => a.id === m.id));
    return (
      React.createElement('div', { className: 'd-flex align-items-center flex-wrap gap-2' },
        React.createElement('div', { className: 'd-flex flex-wrap gap-2' },
          (quest.assigned || []).map(m => React.createElement(MemberChip, { key: m.id, m, onRemove: () => QuestSystem.unassignMember(GameState, quest.id, m.id) }))
        ),
        available.length > 0 && React.createElement('div', { className: 'dropdown' },
          React.createElement('button', { className: 'btn btn-sm btn-outline-primary dropdown-toggle', 'data-bs-toggle': 'dropdown' }, 'Assign'),
          React.createElement('ul', { className: 'dropdown-menu' },
            available.map(m => React.createElement('li', { key: m.id },
              React.createElement('a', { className: 'dropdown-item d-flex align-items-center gap-2', href: '#', onClick: (e) => { e.preventDefault(); QuestSystem.assignMember(GameState, quest.id, m.id); } },
                (m.avatar || m.portrait) ? React.createElement('img', { src: m.avatar || m.portrait, width: 20, height: 20, style: { objectFit: 'cover', borderRadius: 4 } }) : null,
                `${m.name} (${m.class})`
              )
            ))
          )
        )
      )
    );
  }
  function QuestCard({ q, members }) {
    return (
      React.createElement('div', { className: 'entity-pill' },
        React.createElement('div', { className: 'd-flex justify-content-between align-items-center' },
          React.createElement('div', null,
            React.createElement('strong', null, q.name),
            React.createElement('span', { className: 'subtle small ms-1' }, `· Diff ${q.diff} · Reward ${q.reward}g · Fame +${q.fame}`)
          ),
          React.createElement('div', null,
            React.createElement('button', { className: 'btn btn-sm btn-outline-success', onClick: () => QuestSystem.startQuest(GameState, q.id) }, 'Run')
          )
        ),
        React.createElement('div', { className: 'mt-2' }, React.createElement(AssignPicker, { quest: q, members }))
      )
    );
  }
  function Quests() {
    const { state } = useStore();
    return (
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-body' },
          React.createElement('div', { className: 'd-flex justify-content-between align-items-center mb-2' },
            React.createElement('h5', { className: 'mb-0' }, 'Available Quests'),
            React.createElement('button', { className: 'btn btn-sm btn-primary', onClick: async () => { await QuestSystem.refreshDailyQuests(GameState); } }, 'Refresh')
          ),
          state.quests.length === 0 ? React.createElement('div', { className: 'text-muted' }, 'No quests available.') :
            React.createElement('div', { className: 'vstack gap-2' }, state.quests.map(q => React.createElement(QuestCard, { key: q.id, q, members: state.members })))
        )
      )
    );
  }
  window.GameReactApp = window.GameReactApp || {};
  window.GameReactApp.Quests = Quests;
})();

function Quests() {
  const { state, actions } = window.GameReactStore.useGame();
  const members = state.members || [];
  const quests = state.quests || [];
  if (quests.length === 0) return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="mb-0">Available Quests</h5>
        <button className="btn btn-sm btn-primary" onClick={() => actions.refreshQuests()}><i className="bi bi-arrow-repeat"></i> Refresh</button>
      </div>
      <div className="text-muted">No quests available today.</div>
    </div>
  );
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="mb-0">Available Quests</h5>
        <button className="btn btn-sm btn-primary" onClick={() => actions.refreshQuests()}><i className="bi bi-arrow-repeat"></i> Refresh</button>
      </div>
      <div className="vstack gap-2">
        {quests.map(q => <QuestItem key={q.id} q={q} members={members} actions={actions} />)}
      </div>
    </div>
  );
}

function QuestItem({ q, members, actions }) {
  const [selected, setSelected] = React.useState('');
  const assigned = q.assigned || [];
  return (
    <div className="entity-pill">
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <strong>{q.name}</strong> <span className="subtle small">· Diff {q.diff} · Reward {q.reward}g · Fame +{q.fame}</span>
        </div>
        <div className="btn-group">
          <button className="btn btn-sm btn-outline-success" onClick={() => actions.startQuest(q.id)}><i className="bi bi-play"></i> Run</button>
        </div>
      </div>
      <div className="mt-2">
        <select className="form-select form-select-sm w-auto d-inline-block me-2" value={selected} onChange={(e) => setSelected(e.target.value)}>
          <option value="">Assign member...</option>
          {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.class})</option>)}
        </select>
        <button className="btn btn-sm btn-outline-primary me-2" onClick={() => { if (selected) actions.assign(q.id, selected); }}><i className="bi bi-person-plus"></i></button>
        <span className="small">
          {assigned.length ? assigned.map(m => (
            <span key={m.id} className="badge text-bg-secondary me-1">{m.name} <a href="#" className="text-reset text-decoration-none" onClick={(e) => { e.preventDefault(); actions.unassign(q.id, m.id); }}>×</a></span>
          )) : <span className="subtle">No members assigned.</span>}
        </span>
      </div>
    </div>
  );
}

window.GameReactQuests = { Quests };


