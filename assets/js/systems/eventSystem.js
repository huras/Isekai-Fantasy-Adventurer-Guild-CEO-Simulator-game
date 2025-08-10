(function (global) {
  const EventSystem = {
    async rollDailyEvent(state) {
      const chance = 0.35; // 35%
      if (Math.random() <= chance) {
        const summary = await AIProvider.generateEventSummary({
          day: state.day,
          notoriety: state.notoriety,
          members: state.members.length,
        });
        // minor mechanical effect randomly
        const roll = Utils.randInt(1, 4);
        switch (roll) {
          case 1:
            MoneySystem.addMoney(state, 25, 'Event windfall');
            break;
          case 2:
            if (state.money >= 15) MoneySystem.spendMoney(state, 15, 'Event expense');
            break;
          case 3:
            NotorietySystem.addNotoriety(state, 2, 'Event publicity');
            break;
          default:
            break;
        }
        state.logs = state.logs || { events: [], battle: [] };
        state.logs.events.unshift(summary);
        if (window.Store) Store.emit();
      }
    },
  };

  global.EventSystem = EventSystem;
})(window);


