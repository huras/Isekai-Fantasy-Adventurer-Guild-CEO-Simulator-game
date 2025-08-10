(() => {
  const { useStore } = window.GameReactApp;
  function Header() {
    const { state } = useStore();
    const week = Math.floor((state.day - 1) / 7) + 1;
    return (
      React.createElement('nav', { className: 'navbar navbar-light bg-light' },
        React.createElement('div', { className: 'container-fluid' },
          React.createElement('span', { className: 'navbar-brand' }, '⚔️ Guild CEO Simulator'),
          React.createElement('div', { className: 'd-flex gap-3 align-items-center text-dark small' },
            React.createElement('div', null, `Money: ${Utils.formatMoney(state.money)}g`),
            React.createElement('div', null, `Notoriety: ${state.notoriety}`),
            React.createElement('div', null, `Day ${state.day} / Week ${week}`),
            React.createElement('div', { className: 'vr' }),
            React.createElement('div', { className: 'form-check form-switch m-0' },
              React.createElement('input', { className: 'form-check-input', type: 'checkbox', id: 'autoAssignHeader', checked: !!state.settings.autoAssign, onChange: (e) => { state.settings.autoAssign = e.target.checked; if (window.Store) Store.emit(); } }),
              React.createElement('label', { className: 'form-check-label text-dark', htmlFor: 'autoAssignHeader' }, 'Auto-assign')
            ),
            React.createElement('button', { className: 'btn btn-warning btn-sm', onClick: async () => { await GameController.advanceDay(); if (window.Store) Store.emit(); } }, 'Next Day'),
            React.createElement('button', { className: 'btn btn-outline-dark btn-sm', onClick: () => { const ok = SaveStorage.save(GameState); UI.toast(ok ? 'Game saved' : 'Save failed', 'Storage'); } }, 'Save'),
            React.createElement('button', { className: 'btn btn-outline-dark btn-sm', onClick: async () => { const data = SaveStorage.load(); if (!data) { UI.toast('No save found', 'Storage'); return; } Object.assign(GameState, data); GameController.ensurePlayer(); await GameController.onNewDay(); if (window.Store) Store.emit(); } }, 'Load'),
            React.createElement('button', { className: 'btn btn-outline-danger btn-sm', onClick: async () => { SaveStorage.reset(); Object.assign(GameState, { day: 1, week: 1, money: 100, notoriety: 0, members: [], candidates: [], quests: [], inventory: [], shop: [], logs: { events: [], battle: [] }, modifiers: { upkeepDeltaPerMember: 0, questSuccessBonus: 0, recruitStatBonus: 0 }, settings: { autoAssign: false } }); await GameController.initialize(); if (window.Store) Store.emit(); } }, 'Reset')
          )
        )
      )
    );
  }
  window.GameReactApp = window.GameReactApp || {};
  window.GameReactApp.Header = Header;
})();


