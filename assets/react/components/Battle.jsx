(() => {
  const { useStore } = window.GameReactApp;
  function Battle() {
    const { state } = useStore();
    const lastLogs = state.logs?.battle || [];
    return (
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-body' },
          React.createElement('div', { className: 'd-flex justify-content-between align-items-center mb-2' },
            React.createElement('h5', { className: 'mb-0' }, 'Skirmish'),
            React.createElement('button', { className: 'btn btn-sm btn-danger', onClick: () => BattleSystem.startSkirmish(GameState) }, 'Start Battle')
          ),
          React.createElement('div', { className: 'small text-muted mb-1' }, 'Turn Log'),
          React.createElement('div', { className: 'log-box' }, lastLogs.slice(0, 40).map((l, i) => React.createElement('div', { key: i }, l)))
        )
      )
    );
  }
  window.GameReactApp = window.GameReactApp || {};
  window.GameReactApp.Battle = Battle;
})();

function Battle() {
  const { state, actions } = window.GameReactStore.useGame();
  const log = (state.logs && state.logs.battle) || [];
  const members = state.members.slice(0, 3);
  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h5 className="mb-0">Skirmish (Prototype)</h5>
        <button className="btn btn-sm btn-danger" onClick={() => actions.startBattle()}><i className="bi bi-swords"></i> Start Battle</button>
      </div>
      <div className="row g-3">
        <div className="col-md-6">
          <h6>Party</h6>
          <div className="vstack gap-2">
            {members.map(m => (
              <div key={m.id}><strong>{m.name}</strong> <span className="subtle small">SPD {m.speed}</span></div>
            ))}
          </div>
        </div>
        <div className="col-md-6">
          <h6>Enemy</h6>
          <div className="subtle small">Random foe based on notoriety.</div>
        </div>
      </div>
      <hr/>
      <div className="small text-muted">Turn Log</div>
      <div className="log-box">
        {log.slice().reverse().map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
}

window.GameReactBattle = { Battle };


