(() => {
  const { useStore } = window.GameReactApp;
  function Dashboard() {
    const { state } = useStore();
    const week = Math.floor((state.day - 1) / 7) + 1;
    return (
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-body' },
          React.createElement('h5', { className: 'mb-3' }, 'Dashboard'),
          React.createElement('div', { className: 'row g-3' },
            React.createElement('div', { className: 'col-md-4' },
              React.createElement('div', { className: 'entity-pill' },
                React.createElement('div', null, `Money: ${Utils.formatMoney(state.money)}g`),
                React.createElement('div', null, `Notoriety: ${state.notoriety}`),
                React.createElement('div', null, `Day ${state.day} / Week ${week}`),
                React.createElement('div', null, `Members: ${state.members.length}`),
              )
            ),
            React.createElement('div', { className: 'col-md-8' },
              React.createElement('div', { className: 'entity-pill' },
                React.createElement('div', { className: 'small subtle mt-2' }, 'Tips: Recruit weekly, assign quests, buy artifacts, and grow notoriety.')
              )
            )
          )
        )
      )
    );
  }
  window.GameReactApp = window.GameReactApp || {};
  window.GameReactApp.Dashboard = Dashboard;
})();

function Dashboard() {
  const { state } = window.GameReactStore.useGame();
  return (
    <div className="row g-3">
      <div className="col-md-4">
        <div className="card h-100"><div className="card-body">
          <h5 className="card-title">Guild Snapshot</h5>
          <div className="d-flex flex-column gap-2 small">
            <div>Members: <strong>{state.members.length}</strong></div>
            <div>Upkeep/day: <strong>{MoneySystem.getDailyUpkeep(state)}g</strong></div>
            <div>Quests today: <strong>{state.quests.length}</strong></div>
          </div>
        </div></div>
      </div>
      <div className="col-md-8">
        <div className="card h-100"><div className="card-body">
          <h5 className="card-title">Tips</h5>
          <ul className="small mb-0">
            <li>Recruit weekly candidates to build your party.</li>
            <li>Assign members to quests for gold and notoriety.</li>
            <li>Buy artifacts to boost stats.</li>
            <li>Harder quests increase notoriety. More notoriety → better candidates.</li>
            <li>Random events may occur daily.</li>
          </ul>
        </div></div>
      </div>
    </div>
  );
}

window.GameReactDashboard = { Dashboard };


