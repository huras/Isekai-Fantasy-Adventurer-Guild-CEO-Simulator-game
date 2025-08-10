(function (global) {
  const listeners = new Set();
  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
  function emit() {
    for (const l of Array.from(listeners)) {
      try { l(); } catch (_) {}
    }
  }
  const Store = {
    subscribe,
    emit,
    get() { return GameState; },
    set(mutator) {
      mutator(GameState);
      emit();
    },
  };
  global.Store = Store;
})(window);


