(function (global) {
  const Utils = {
    clamp(value, min, max) { return Math.max(min, Math.min(max, value)); },
    randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; },
    pick(array) { return array[Math.floor(Math.random() * array.length)]; },
    uid(prefix = "id") { return `${prefix}_${Math.random().toString(36).slice(2, 9)}`; },
    now() { return new Date().toLocaleTimeString(); },
    formatMoney(n) { return n.toLocaleString(undefined, { maximumFractionDigits: 0 }); },
    deepClone(obj) { return JSON.parse(JSON.stringify(obj)); },
    sum(arr, selector = (x) => x) { return arr.reduce((a, b) => a + selector(b), 0); },
  };

  global.Utils = Utils;
})(window);


