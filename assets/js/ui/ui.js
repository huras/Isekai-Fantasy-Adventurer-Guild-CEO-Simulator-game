(function (global) {
  const UI = {
    toast(title, body) {
      try {
        $('#toast-title').text(title);
        $('#toast-body').text(body || '');
        $('#toast-time').text(Utils.now());
        const toastEl = document.getElementById('toast');
        const toast = bootstrap.Toast.getOrCreateInstance(toastEl);
        toast.show();
      } catch (_) {}
    },

    refreshTopBar(state) {
      $('#ui-money').text(Utils.formatMoney(state.money));
      $('#ui-notoriety').text(state.notoriety);
      $('#ui-day').text(state.day);
      const week = Math.floor((state.day - 1) / 7) + 1;
      $('#ui-week').text(week);
      $('#ui-week-2').text(week);
      $('#ui-upkeep').text(Utils.formatMoney(MoneySystem.getDailyUpkeep(state)));
      $('#ui-guild-count').text(state.members.length);
    },

    logEvent(text) {
      const el = $('#event-log');
      const line = $('<div>').text(`• ${text}`);
      el.prepend(line);
    },

    appendBattleLog(text) {
      const el = $('#battle-log');
      const pre = $('<pre class="mb-0">').text(text);
      el.prepend(pre);
    },

    renderGuild(state) {
      const root = $('#guild-list').empty();
      if (state.members.length === 0) {
        root.append('<div class="text-muted">No members yet. Recruit some candidates.</div>');
        return;
      }
      state.members.forEach(m => {
        const card = $(`
          <div class="entity-pill d-flex justify-content-between align-items-center">
            <div>
              <div><strong>${m.name}</strong> — ${m.class} ${m.isPlayer ? '<span class="badge text-bg-info ms-1">You</span>' : ''} · <span class="subtle">${m.personality}</span></div>
              <div class="small subtle">${m.appearance || ''}</div>
              <div class="small subtle">STR ${m.stats.str} INT ${m.stats.int} AGI ${m.stats.agi} SPR ${m.stats.spr} · Upkeep ${m.upkeep}g</div>
            </div>
            <div>
              ${m.isPlayer ? '' : `<button class="btn btn-sm btn-outline-danger" data-fire="${m.id}"><i class="bi bi-person-dash"></i> Fire</button>`}
            </div>
          </div>
        `);
        if (!m.isPlayer) {
          card.find('[data-fire]').on('click', () => RecruitmentSystem.fireMember(GameState, m.id));
        }
        root.append(card);
      });
    },

    renderCandidates(state) {
      const root = $('#candidate-list').empty();
      if (state.candidates.length === 0) {
        root.append('<div class="text-muted">No candidates this week. Come back next week.</div>');
        return;
      }
      state.candidates.forEach(c => {
        const card = $(`
          <div class="entity-pill d-flex justify-content-between align-items-center">
            <div>
              <div><strong>${c.name}</strong> — ${c.class} · <span class="subtle">${c.personality}</span></div>
              <div class="small subtle">${c.appearance || ''}</div>
              <div class="small subtle">STR ${c.stats.str} INT ${c.stats.int} AGI ${c.stats.agi} SPR ${c.stats.spr} · Upkeep ${c.upkeep}g</div>
            </div>
            <div class="btn-group">
              <button class="btn btn-sm btn-outline-primary" data-accept="${c.id}"><i class="bi bi-check2"></i> Accept</button>
              <button class="btn btn-sm btn-outline-secondary" data-reject="${c.id}"><i class="bi bi-x"></i> Reject</button>
            </div>
          </div>
        `);
        card.find('[data-accept]').on('click', () => RecruitmentSystem.acceptCandidate(GameState, c.id));
        card.find('[data-reject]').on('click', () => RecruitmentSystem.rejectCandidate(GameState, c.id));
        root.append(card);
      });
    },

    renderQuests(state) {
      const root = $('#quest-list').empty();
      if (state.quests.length === 0) {
        root.append('<div class="text-muted">No quests available today. Refresh or come back tomorrow.</div>');
        return;
      }
      state.quests.forEach(q => {
        const container = $('<div class="entity-pill"></div>');
        const top = $(`
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <strong>${q.name}</strong>
              <span class="subtle small">· Diff ${q.diff} · Reward ${q.reward}g · Fame +${q.fame}</span>
            </div>
            <div class="btn-group">
              <button class="btn btn-sm btn-outline-success" data-start="${q.id}"><i class="bi bi-play"></i> Run</button>
            </div>
          </div>
        `);
        container.append(top);

        const assignment = $('<div class="mt-2"></div>');
        const select = $('<select class="form-select form-select-sm w-auto d-inline-block me-2"></select>');
        select.append('<option value="">Assign member...</option>');
        GameState.members.forEach(m => {
          select.append(`<option value="${m.id}">${m.name} (${m.class})</option>`);
        });
        const addBtn = $('<button class="btn btn-sm btn-outline-primary me-2"><i class="bi bi-person-plus"></i></button>');
        const assignedWrap = $('<span class="small"></span>');

        function renderAssigned() {
          assignedWrap.empty();
          const list = (q.assigned || []).map(m => {
            return `<span class="badge text-bg-secondary me-1">${m.name} <a href="#" data-unassign="${m.id}" class="text-reset text-decoration-none">×</a></span>`;
          }).join('');
          assignedWrap.html(list || '<span class="subtle">No members assigned.</span>');
          assignedWrap.find('[data-unassign]').on('click', (e) => {
            e.preventDefault();
            const id = $(e.currentTarget).attr('data-unassign');
            QuestSystem.unassignMember(GameState, q.id, id);
          });
        }
        renderAssigned();

        addBtn.on('click', () => {
          const id = select.val();
          if (!id) return;
          QuestSystem.assignMember(GameState, q.id, id);
          renderAssigned();
        });

        assignment.append(select, addBtn, assignedWrap);
        container.append(assignment);
        top.find('[data-start]').on('click', () => QuestSystem.startQuest(GameState, q.id));
        root.append(container);
      });
    },

    renderShop(state) {
      const root = $('#shop-list').empty();
      if (state.shop.length === 0) {
        root.append('<div class="text-muted">Shop is empty today.</div>');
        return;
      }
      state.shop.forEach(item => {
        const price = ShopSystem.getPrice(state, item);
        const line = $(`
          <div class="entity-pill d-flex justify-content-between align-items-center">
            <div><strong>${item.name}</strong> <span class="subtle small">${price}g</span></div>
            <button class="btn btn-sm btn-outline-warning" data-buy="${item.id}"><i class="bi bi-bag"></i> Buy</button>
          </div>
        `);
        line.find('[data-buy]').on('click', () => ShopSystem.buy(GameState, item.id));
        root.append(line);
      });
    },

    renderBattle(state, actors, log) {
      const partyRoot = $('#battle-party').empty();
      const enemyRoot = $('#battle-enemies').empty();
      actors.filter(a => a.type === 'ally').forEach(a => {
        const pct = Math.floor((a.hp / a.hpMax) * 100);
        partyRoot.append(`
          <div>
            <div class="d-flex justify-content-between"><strong>${a.name}</strong><span class="small subtle">SPD ${a.speed}</span></div>
            <div class="progress"><div class="progress-bar" role="progressbar" style="width:${pct}%">${a.hp}/${a.hpMax}</div></div>
          </div>
        `);
      });
      actors.filter(a => a.type === 'enemy').forEach(a => {
        const pct = Math.floor((a.hp / a.hpMax) * 100);
        enemyRoot.append(`
          <div>
            <div class="d-flex justify-content-between"><strong>${a.name}</strong><span class="small subtle">SPD ${a.speed}</span></div>
            <div class="progress"><div class="progress-bar bg-danger" role="progressbar" style="width:${pct}%">${a.hp}/${a.hpMax}</div></div>
          </div>
        `);
      });
      const logBox = $('#battle-log').empty();
      log.forEach(line => logBox.prepend($('<div>').text(line)));
    },
  };

  global.UI = UI;
})(window);


