(() => {
  const { useStore } = window.GameReactApp;
  function Shop() {
    const { state } = useStore();
    return (
      React.createElement('div', { className: 'card' },
        React.createElement('div', { className: 'card-body' },
          React.createElement('h5', { className: 'card-title' }, 'Shop'),
          state.shop.length === 0 ? React.createElement('div', { className: 'text-muted' }, 'Shop is empty today.') :
            React.createElement('div', { className: 'vstack gap-2' }, state.shop.map(item => (
              React.createElement('div', { key: item.id, className: 'entity-pill d-flex justify-content-between align-items-center' },
                React.createElement('div', null, React.createElement('strong', null, item.name), ' ', React.createElement('span', { className: 'subtle small' }, `${ShopSystem.getPrice(state, item)}g`)),
                React.createElement('button', { className: 'btn btn-sm btn-outline-warning', onClick: () => ShopSystem.buy(GameState, item.id) }, 'Buy')
              )
            )))
        )
      )
    );
  }
  window.GameReactApp = window.GameReactApp || {};
  window.GameReactApp.Shop = Shop;
})();

function Shop() {
  const { state, actions } = window.GameReactStore.useGame();
  const shop = state.shop || [];
  if (!shop.length) return <div className="text-muted">Shop is empty today.</div>;
  return (
    <div className="vstack gap-2">
      {shop.map(item => (
        <div key={item.id} className="entity-pill d-flex justify-content-between align-items-center">
          <div><strong>{item.name}</strong> <span className="subtle small">{ShopSystem.getPrice(state, item)}g</span></div>
          <button className="btn btn-sm btn-outline-warning" onClick={() => actions.buy(item.id)}><i className="bi bi-bag"></i> Buy</button>
        </div>
      ))}
    </div>
  );
}

window.GameReactShop = { Shop };


