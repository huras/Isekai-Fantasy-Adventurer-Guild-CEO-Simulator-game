(function (global) {
  const NotorietySystem = {
    addNotoriety(state, amount, reason = '') {
      state.notoriety = Math.max(0, Math.floor(state.notoriety + amount));
      UI.toast(`Notoriety +${amount}`, reason || 'Reputation rises');
      UI.refreshTopBar(state);
    },
  };

  global.NotorietySystem = NotorietySystem;
})(window);


