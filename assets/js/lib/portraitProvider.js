(function (global) {
  const basePath = 'assets/images/adventurers/';
  const PortraitProvider = {
    manifest: [],
    loaded: false,
    async loadManifest() {
      if (this.loaded && this.manifest.length) return this.manifest;
      try {
        const res = await fetch(basePath + 'manifest.json', { cache: 'no-cache' });
        if (res.ok) {
          this.manifest = await res.json();
          this.loaded = true;
        }
      } catch (e) {
        console.warn('Portrait manifest load failed', e);
        if (Array.isArray(window.PortraitsManifest) && window.PortraitsManifest.length) {
          this.manifest = window.PortraitsManifest;
          this.loaded = true;
        } else {
          this.manifest = [];
          this.loaded = false;
        }
      }
      return this.manifest;
    },
    random() {
      if (!this.manifest.length) return null;
      const file = Utils.pick(this.manifest);
      return basePath + file;
    },
  };
  global.PortraitProvider = PortraitProvider;
})(window);


