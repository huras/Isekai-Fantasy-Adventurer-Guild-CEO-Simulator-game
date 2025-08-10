(function (global) {
  function calculateMemberPower(member) {
    const stats = member.stats || { str: 5, int: 5, agi: 5, spr: 5 };
    const values = [stats.str, stats.int, stats.agi, stats.spr].sort((a, b) => b - a);
    const topTwo = (values[0] || 0) + (values[1] || 0);
    return topTwo + Math.floor((member.speed || 1));
  }

  const QuestSystem = {
    async refreshDailyQuests(state) {
      state.quests = await AIProvider.generateQuestList(state.notoriety, state.day);
      if (window.Store) Store.emit();
    },

    assignMember(state, questId, memberId) {
      const quest = state.quests.find(q => q.id === questId);
      const member = state.members.find(m => m.id === memberId);
      if (!quest || !member) return;
      quest.assigned = quest.assigned || [];
      if (quest.assigned.find(m => m.id === memberId)) return;
      quest.assigned.push(member);
      if (window.Store) Store.emit();
    },

    unassignMember(state, questId, memberId) {
      const quest = state.quests.find(q => q.id === questId);
      if (!quest) return;
      quest.assigned = (quest.assigned || []).filter(m => m.id !== memberId);
      if (window.Store) Store.emit();
    },

    startQuest(state, questId) {
      const quest = state.quests.find(q => q.id === questId);
      if (!quest) return;
      const party = quest.assigned || [];
      if (party.length === 0) {
        UI.toast('Assign at least one member', 'Quest');
        return;
      }
      const teamPower = party.map(calculateMemberPower).reduce((a, b) => a + b, 0);
      const target = quest.diff * 10;
      const bonus = state.modifiers.questSuccessBonus || 0; // percentage points
      let successChance = Math.max(10, Math.min(90, Math.round((teamPower / target) * 60 + 20 + bonus)));
      successChance = Utils.clamp(successChance, 5, 95);
      const roll = Utils.randInt(1, 100);
      const success = roll <= successChance;

      if (success) {
        MoneySystem.addMoney(state, quest.reward, `Quest: ${quest.name}`);
        NotorietySystem.addNotoriety(state, quest.fame, `Quest: ${quest.name}`);
        UI.logEvent(`${party.length} member(s) completed ${quest.name}. Success ${successChance}% (roll ${roll}).`);
      } else {
        UI.logEvent(`${party.length} member(s) failed ${quest.name}. Success ${successChance}% (roll ${roll}).`);
      }
      // Reset assignment and remove quest
      quest.assigned = [];
      state.quests = state.quests.filter(q => q.id !== questId);
      if (window.Store) Store.emit();
    },

    autoAssignAndRun(state) {
      // Greedy: assign strongest available member to each quest and run
      const sortedMembers = Utils.deepClone(state.members).sort((a, b) => calculateMemberPower(b) - calculateMemberPower(a));
      for (const quest of state.quests) {
        quest.assigned = [];
        const needed = Math.min(3, Math.max(1, Math.floor(quest.diff / 3)));
        for (let i = 0; i < needed && sortedMembers.length > 0; i++) {
          quest.assigned.push(sortedMembers.shift());
        }
        this.startQuest(state, quest.id);
      }
    },
  };

  global.QuestSystem = QuestSystem;
})(window);


