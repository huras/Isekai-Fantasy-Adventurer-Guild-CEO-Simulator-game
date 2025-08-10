(function (global) {
  const RecruitmentSystem = {
    async refreshWeeklyCandidates(state) {
      state.candidates = await AIProvider.generateCandidates(state.notoriety, state.week);
      UI.renderCandidates(state);
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
      UI.renderGuild(state);
      UI.renderCandidates(state);
      UI.refreshTopBar(state);
    },
    rejectCandidate(state, candidateId) {
      state.candidates = state.candidates.filter(c => c.id !== candidateId);
      UI.renderCandidates(state);
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
      UI.renderGuild(state);
      UI.refreshTopBar(state);
    },
  };

  global.RecruitmentSystem = RecruitmentSystem;
})(window);


