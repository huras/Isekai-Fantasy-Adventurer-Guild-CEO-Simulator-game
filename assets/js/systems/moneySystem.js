(function (global) {
  const MoneySystem = {
    addMoney(state, amount, reason = '') {
      state.money = Math.max(0, Math.floor(state.money + amount));
      UI.toast(`+${Utils.formatMoney(amount)}g`, reason || 'Income');
      UI.refreshTopBar(state);
    },
    spendMoney(state, amount, reason = '') {
      state.money = Math.max(0, Math.floor(state.money - amount));
      UI.toast(`-${Utils.formatMoney(amount)}g`, reason || 'Expense');
      UI.refreshTopBar(state);
    },
    getDailyUpkeep(state) {
      const base = state.members.reduce((sum, m) => sum + (m.upkeep || 0), 0);
      const mod = state.modifiers.upkeepDeltaPerMember * state.members.length;
      return Math.max(0, Math.floor(base + mod));
    },
  };

  global.MoneySystem = MoneySystem;
})(window);


