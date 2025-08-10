(() => {
  const { useStore } = window.GameReactApp;
  function Events() {
    const { state } = useStore();
    const events = state.logs?.events || [];
    return (
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-body' },
          React.createElement('h5', { className: 'card-title' }, 'Event Log'),
          React.createElement('div', { className: 'log-box' }, events.slice(0, 60).map((e, i) => React.createElement('div', { key: i }, `• ${e}`)))
        )
      )
    );
  }
  window.GameReactApp = window.GameReactApp || {};
  window.GameReactApp.Events = Events;
})();

function Events() {
  const { state } = window.GameReactStore.useGame();
  const events = state.logs && state.logs.events ? state.logs.events : [];
  return (
    <div className="log-box">
      {events.length ? events.slice().reverse().map((e, i) => <div key={i}>• {e}</div>) : <div className="text-muted">No events yet.</div>}
    </div>
  );
}

window.GameReactEvents = { Events };


