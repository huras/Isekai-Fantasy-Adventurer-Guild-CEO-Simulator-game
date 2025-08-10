(function (global) {
  const RecruitmentSystem = {
    async refreshWeeklyCandidates(state) {
      state.candidates = await AIProvider.generateCandidates(state.notoriety, state.week);
      if (window.Store) Store.emit();
    },
    acceptCandidate(state, candidateId) {
      const idx = state.candidates.findIndex(c => c.id === candidateId);
      if (idx === -1) return;
      const c = state.candidates.splice(idx, 1)[0];
      const hpMax = c.stats.hp || 20;
      const recruitBonus = state.modifiers.recruitStatBonus || 0;
      const member = {
        id: Utils.uid('mem'),
        name: c.name,
        class: c.class,
        personality: c.personality,
        gender: c.gender,
        appearance: c.appearance,
        avatar: c.avatar || c.portrait || null,
        upkeep: c.upkeep,
        stats: {
          str: c.stats.str + recruitBonus,
          int: c.stats.int + recruitBonus,
          agi: c.stats.agi + recruitBonus,
          spr: c.stats.spr + recruitBonus,
        },
        hpMax,
        hp: hpMax,
        speed: Math.max(1, Math.floor((c.stats.agi + recruitBonus) / 3)),
        skills: c.skills || [],
      };
      state.members.push(member);
      UI.toast(`${member.name} joined!`, 'New recruit');
      if (window.Store) Store.emit();
    },
    rejectCandidate(state, candidateId) {
      state.candidates = state.candidates.filter(c => c.id !== candidateId);
      if (window.Store) Store.emit();
    },
    fireMember(state, memberId) {
      const idx = state.members.findIndex(m => m.id === memberId);
      if (idx === -1) return;
      const m = state.members[idx];
      if (m.isPlayer) {
        UI.toast('You cannot fire yourself', 'Guildmaster');
        return;
      }
      state.members.splice(idx, 1);
      UI.toast(`${m.name} was released.`, 'Fired');
      if (window.Store) Store.emit();
    },
  };

  global.RecruitmentSystem = RecruitmentSystem;
})(window);


