(function (global) {
  const NotorietySystem = {
    addNotoriety(state, amount, reason = '') {
      state.notoriety = Math.max(0, Math.floor(state.notoriety + amount));
      UI.toast(`Notoriety +${amount}`, reason || 'Reputation rises');
      if (window.Store) Store.emit();
    },
  };

  global.NotorietySystem = NotorietySystem;
})(window);


