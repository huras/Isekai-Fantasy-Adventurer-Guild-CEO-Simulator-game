$(async function () {
  // Bind controls
  $('#btn-save').on('click', () => {
    const ok = SaveStorage.save(GameState);
    UI.toast(ok ? 'Game saved' : 'Save failed', 'Storage');
  });
  $('#btn-load').on('click', async () => {
    const data = SaveStorage.load();
    if (!data) { UI.toast('No save found', 'Storage'); return; }
    Object.assign(GameState, data);
    GameController.ensurePlayer();
    await GameController.onNewDay();
    UI.refreshTopBar(GameState);
    UI.renderGuild(GameState);
    UI.renderCandidates(GameState);
    UI.renderQuests(GameState);
    UI.renderShop(GameState);
    UI.toast('Game loaded', 'Storage');
  });
  $('#btn-reset').on('click', async () => {
    SaveStorage.reset();
    Object.assign(GameState, { day: 1, week: 1, money: 100, notoriety: 0, members: [], candidates: [], quests: [], inventory: [], shop: [], logs: { events: [], battle: [] }, modifiers: { upkeepDeltaPerMember: 0, questSuccessBonus: 0, recruitStatBonus: 0 }, settings: { autoAssign: $('#ui-auto-assign').is(':checked') } });
    await GameController.initialize();
    UI.refreshTopBar(GameState);
    UI.renderGuild(GameState);
    UI.renderCandidates(GameState);
    UI.renderQuests(GameState);
    UI.renderShop(GameState);
    UI.toast('Reset to new game', 'System');
  });
  $('#btn-next-day').on('click', async () => {
    await GameController.advanceDay();
    UI.refreshTopBar(GameState);
    UI.renderQuests(GameState);
    UI.renderShop(GameState);
    UI.renderCandidates(GameState);
    UI.toast('A new day dawns', 'Time');
  });
  $('#btn-generate-quests').on('click', async () => {
    await QuestSystem.refreshDailyQuests(GameState);
    UI.toast('Quests refreshed', 'Board');
  });
  $('#btn-start-battle').on('click', () => BattleSystem.startSkirmish(GameState));
  $('#ui-auto-assign').on('change', function () {
    GameState.settings.autoAssign = $(this).is(':checked');
  });

  // Initialize new or load
  const loaded = SaveStorage.load();
  if (loaded) {
    Object.assign(GameState, loaded);
  }

  await GameController.initialize();
  UI.refreshTopBar(GameState);
  UI.renderGuild(GameState);
  UI.renderCandidates(GameState);
  UI.renderQuests(GameState);
  UI.renderShop(GameState);
});


