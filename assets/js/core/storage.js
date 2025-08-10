(function (global) {
  const STORAGE_KEY = 'isekaiGuildSave_v1';

  const Storage = {
    save(state) {
      try {
        const copy = Utils.deepClone(state);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(copy));
        return true;
      } catch (e) {
        console.error('Save failed', e);
        return false;
      }
    },
    load() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return data;
      } catch (e) {
        console.error('Load failed', e);
        return null;
      }
    },
    reset() {
      localStorage.removeItem(STORAGE_KEY);
    },
  };

  global.SaveStorage = Storage;
})(window);


