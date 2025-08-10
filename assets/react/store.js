(() => {
  const { createContext, useContext, useEffect, useMemo, useReducer } = React;

  const initial = GameState;

  function reducer(state, action) {
    switch (action.type) {
      case 'emit':
        return { ...GameState };
      default:
        return state;
    }
  }

  const StoreContext = createContext(null);

  function StoreProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, initial);

    useEffect(() => {
      // Wire global Store.emit to React dispatch
      if (window.Store) {
        const unsubscribe = window.Store.subscribe(() => dispatch({ type: 'emit' }));
        return unsubscribe;
      }
    }, []);

    useEffect(() => {
      (async () => { await PortraitProvider.loadManifest(); })();
      (async () => {
        await GameController.initialize();
        if (window.Store) window.Store.emit(); else dispatch({ type: 'emit' });
      })();
    }, []);

    const value = useMemo(() => ({ state, dispatch }), [state]);
    return React.createElement(StoreContext.Provider, { value }, children);
  }

  function useStore() {
    return useContext(StoreContext);
  }

  window.GameReactApp = window.GameReactApp || {};
  window.GameReactApp.StoreProvider = StoreProvider;
  window.GameReactApp.useStore = useStore;
})();

// React store wrapping existing GameState/Controller with reactivity and persistence
const { createContext, useContext, useEffect, useMemo, useReducer } = React;

const GameContext = createContext(null);

function reducer(state, action) {
  switch (action.type) {
    case 'tick':
      return { ...state, version: state.version + 1 };
    default:
      return state;
  }
}

function GameProvider({ children }) {
  const [local, dispatch] = useReducer(reducer, { version: 0 });

  useEffect(() => {
    (async () => { await PortraitProvider.ready(); })();
  }, []);

  useEffect(() => {
    (async () => {
      const loaded = SaveStorage.load();
      if (loaded) Object.assign(GameState, loaded);
      await GameController.initialize();
      dispatch({ type: 'tick' });
    })();
  }, []);

  const actions = useMemo(() => ({
    refresh() { dispatch({ type: 'tick' }); },
    async nextDay() { await GameController.advanceDay(); dispatch({ type: 'tick' }); },
    save() { SaveStorage.save(GameState); dispatch({ type: 'tick' }); },
    async load() { const data = SaveStorage.load(); if (data) Object.assign(GameState, data); await GameController.onNewDay(); dispatch({ type: 'tick' }); },
    async reset() {
      SaveStorage.reset();
      Object.assign(GameState, { day: 1, week: 1, money: 100, notoriety: 0, members: [], candidates: [], quests: [], inventory: [], shop: [], logs: { events: [], battle: [] }, modifiers: { upkeepDeltaPerMember: 0, questSuccessBonus: 0, recruitStatBonus: 0 }, settings: { autoAssign: false } });
      GameController.ensurePlayer();
      await GameController.initialize();
      dispatch({ type: 'tick' });
    },
    acceptCandidate(id) { RecruitmentSystem.acceptCandidate(GameState, id); dispatch({ type: 'tick' }); },
    rejectCandidate(id) { RecruitmentSystem.rejectCandidate(GameState, id); dispatch({ type: 'tick' }); },
    fireMember(id) { RecruitmentSystem.fireMember(GameState, id); dispatch({ type: 'tick' }); },
    assign(questId, memberId) { QuestSystem.assignMember(GameState, questId, memberId); dispatch({ type: 'tick' }); },
    unassign(questId, memberId) { QuestSystem.unassignMember(GameState, questId, memberId); dispatch({ type: 'tick' }); },
    startQuest(questId) { QuestSystem.startQuest(GameState, questId); dispatch({ type: 'tick' }); },
    refreshQuests() { QuestSystem.refreshDailyQuests(GameState); dispatch({ type: 'tick' }); },
    buy(itemId) { ShopSystem.buy(GameState, itemId); dispatch({ type: 'tick' }); },
    startBattle() { BattleSystem.startSkirmish(GameState); dispatch({ type: 'tick' }); },
  }), []);

  const value = useMemo(() => ({ state: GameState, actions, version: local.version }), [local.version, actions]);
  return React.createElement(GameContext.Provider, { value }, children);
}

function useGame() {
  return useContext(GameContext);
}

window.GameReactStore = { GameProvider, useGame };


