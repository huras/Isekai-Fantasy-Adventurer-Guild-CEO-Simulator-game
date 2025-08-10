(function (global) {
  const Catalog = [
    { id: 'bedrolls', name: '🛏️ Bedrolls (Upkeep -1/member)', price: 120, apply: (state) => { state.modifiers.upkeepDeltaPerMember -= 1; } },
    { id: 'lucky', name: '🍀 Lucky Charm (+5% quest success)', price: 150, apply: (state) => { state.modifiers.questSuccessBonus += 5; } },
    { id: 'dummy', name: '🎯 Training Dummy (+1 to recruit stats)', price: 100, apply: (state) => { state.modifiers.recruitStatBonus += 1; } },
    { id: 'library', name: '📚 Small Library (+1 INT to recruits)', price: 120, apply: (state) => { state.modifiers.recruitStatBonus += 1; } },
    { id: 'forge', name: '⚒️ Forge Discount (-10% shop prices)', price: 200, apply: (state) => { state.modifiers.shopDiscount = (state.modifiers.shopDiscount || 0) + 10; } },
  ];

  const ShopSystem = {
    rotateShopInventory(state) {
      const count = 3 + Math.floor(Math.min(3, state.notoriety / 20));
      const items = Utils.deepClone(Catalog);
      // random pick without replacement
      const picked = [];
      while (picked.length < count && items.length) {
        const i = Utils.randInt(0, items.length - 1);
        picked.push(items.splice(i, 1)[0]);
      }
      state.shop = picked.map(it => ({ ...it }));
      if (window.Store) Store.emit();
    },
    getPrice(state, item) {
      const discount = state.modifiers.shopDiscount || 0;
      const price = Math.floor(item.price * (1 - discount / 100));
      return Math.max(1, price);
    },
    buy(state, itemId) {
      const item = state.shop.find(s => s.id === itemId);
      if (!item) return;
      const price = this.getPrice(state, item);
      if (state.money < price) {
        UI.toast('Not enough gold', 'Shop');
        return;
      }
      MoneySystem.spendMoney(state, price, `Bought ${item.name}`);
      item.apply(state);
      state.inventory.push(item);
      state.shop = state.shop.filter(s => s.id !== itemId);
      if (window.Store) Store.emit();
    },
  };

  global.ShopSystem = ShopSystem;
})(window);


