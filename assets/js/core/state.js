(function (global) {
  const GameState = {
    day: 1,
    week: 1,
    money: 100,
    notoriety: 0,
    members: [],
    candidates: [],
    quests: [],
    inventory: [],
    shop: [],
    logs: { events: [], battle: [] },
    modifiers: {
      upkeepDeltaPerMember: 0,
      questSuccessBonus: 0, // additive percentage points
      recruitStatBonus: 0,
    },
    settings: { autoAssign: false },
  };

  const GameController = {
    state: GameState,

    initialize() {
      // weekly and daily generation on fresh start
      this.ensurePlayer();
      this.ensureAvatars();
      return this.onNewWeek().then(() => this.onNewDay());
    },

    getWeekFromDay(day) {
      return Math.floor((day - 1) / 7) + 1;
    },

    async onNewWeek() {
      this.state.week = this.getWeekFromDay(this.state.day);
      this.state.candidates = await AIProvider.generateCandidates(this.state.notoriety, this.state.week);
    },

    async onNewDay() {
      // rotate quests and shop, roll event, pay upkeep
      this.state.quests = await AIProvider.generateQuestList(this.state.notoriety, this.state.day);
      ShopSystem.rotateShopInventory(this.state);
      EventSystem.rollDailyEvent(this.state);

      const upkeepCost = MoneySystem.getDailyUpkeep(this.state);
      if (upkeepCost > 0) {
        MoneySystem.spendMoney(this.state, upkeepCost, `Daily upkeep for ${this.state.members.length} members`);
      }
    },

    async advanceDay() {
      this.state.day += 1;
      const newWeek = this.getWeekFromDay(this.state.day);
      const weekChanged = newWeek !== this.state.week;
      if (weekChanged) {
        await this.onNewWeek();
      }
      await this.onNewDay();
      if (this.state.settings.autoAssign) {
        QuestSystem.autoAssignAndRun(this.state);
      }
    },

    ensurePlayer() {
      const exists = this.state.members.some(m => m.isPlayer);
      if (exists) return;
      const player = {
        id: 'player',
        isPlayer: true,
        name: 'You',
        class: 'Guildmaster',
        personality: 'heroic',
        gender: 'male',
        appearance: '♂️ Summoned human with dark hair and determined eyes; beauty 7/10',
        upkeep: 0,
        stats: { str: 6, int: 6, agi: 6, spr: 6 },
        hpMax: 40,
        hp: 40,
        speed: 3,
        skills: ['Leadership', 'Tactics'],
        avatar: (typeof PortraitProvider !== 'undefined' && PortraitProvider.random) ? PortraitProvider.random() : null,
      };
      this.state.members.push(player);
    },

    ensureAvatars() {
      if (!this.state || !Array.isArray(this.state.members)) return;
      for (const m of this.state.members) {
        if (!m.avatar && !m.portrait) {
          m.avatar = (typeof PortraitProvider !== 'undefined' && PortraitProvider.random) ? PortraitProvider.random() : null;
        }
      }
    },
  };

  global.GameState = GameState;
  global.GameController = GameController;
})(window);


