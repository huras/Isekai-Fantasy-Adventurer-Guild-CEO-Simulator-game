(function (global) {
  function buildEnemy(state) {
    const tier = state.notoriety < 10 ? 1 : state.notoriety < 30 ? 2 : 3;
    const enemy = tier === 1 ?
      { name: 'Slime', hpMax: 25, hp: 25, atk: 5, speed: 3 } :
      tier === 2 ? { name: 'Bandit', hpMax: 40, hp: 40, atk: 8, speed: 4 } :
      { name: 'Wyvern', hpMax: 80, hp: 80, atk: 14, speed: 6 };
    return enemy;
  }

  function memberAttackPower(member) {
    const s = member.stats || { str: 5, int: 5 };
    return Math.max(1, Math.floor((s.str + s.int) / 3) + 3);
  }

  const BattleSystem = {
    startSkirmish(state) {
      const party = state.members.slice(0, 3);
      if (party.length === 0) {
        UI.toast('Recruit at least one member', 'Battle');
        return;
      }
      const enemy = buildEnemy(state);
      const log = [];
      const actors = [
        ...party.map(m => ({ type: 'ally', ref: m, name: m.name, hp: m.hp, hpMax: m.hpMax, speed: m.speed || 3 })),
        { type: 'enemy', ref: enemy, name: enemy.name, hp: enemy.hp, hpMax: enemy.hpMax, speed: enemy.speed },
      ];

      function aliveAllies() { return actors.filter(a => a.type === 'ally' && a.hp > 0); }
      function aliveEnemies() { return actors.filter(a => a.type === 'enemy' && a.hp > 0); }

      let round = 1;
      while (aliveAllies().length > 0 && aliveEnemies().length > 0 && round < 100) {
        const order = actors.filter(a => a.hp > 0).sort((a, b) => (b.speed || 1) - (a.speed || 1));
        for (const actor of order) {
          if (actor.hp <= 0) continue;
          if (actor.type === 'ally') {
            const target = Utils.pick(aliveEnemies());
            if (!target) break;
            const dmg = memberAttackPower(actor.ref) + Utils.randInt(0, 3);
            target.hp = Math.max(0, target.hp - dmg);
            log.push(`${actor.name} hits ${target.name} for ${dmg}. (${target.hp}/${target.hpMax})`);
          } else {
            const target = Utils.pick(aliveAllies());
            if (!target) break;
            const dmg = enemy.atk + Utils.randInt(0, 4);
            target.hp = Math.max(0, target.hp - dmg);
            log.push(`${actor.name} hits ${target.name} for ${dmg}. (${target.hp}/${target.hpMax})`);
          }
          if (aliveAllies().length === 0 || aliveEnemies().length === 0) break;
        }
        round += 1;
      }

      const victory = aliveAllies().length > 0;
      if (victory) {
        const reward = 20 + Utils.randInt(0, 20);
        const fame = 1 + Utils.randInt(0, 2);
        MoneySystem.addMoney(state, reward, 'Skirmish victory');
        NotorietySystem.addNotoriety(state, fame, 'Skirmish victory');
        log.push(`Victory! +${reward}g, +${fame} notoriety.`);
      } else {
        log.push('Defeat... No rewards.');
      }
      UI.renderBattle(state, actors, log);
      UI.appendBattleLog(log.join('\n'));
    },
  };

  global.BattleSystem = BattleSystem;
})(window);


