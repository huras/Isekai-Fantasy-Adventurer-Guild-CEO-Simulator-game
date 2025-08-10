(function (global) {
  // Placeholder procedural AI with hooks for real OpenAI integration later.
  // Swap implementation of generate() to call your backend that invokes OpenAI.

  const personalities = [
    { key: 'heroic', prompt: 'brave, honorable, determined' },
    { key: 'cunning', prompt: 'sly, strategic, pragmatic' },
    { key: 'stoic', prompt: 'calm, reserved, insightful' },
    { key: 'chaotic', prompt: 'wild, unpredictable, passionate' },
    { key: 'scholar', prompt: 'curious, verbose, analytical' },
  ];

  const AIProvider = {
    randomPersonality() { return Utils.pick(personalities).key; },

    async generateEventSummary(context) {
      // Procedural fallback
      const seeds = [
        'A mysterious benefactor donates equipment. Strings attached?',
        'A rival guild undercuts your contracts; tensions rise.',
        'Rumors of the Demon Lord’s new lieutenant spread fear.',
        'A noble requests an escort to a haunted library.',
        'A blacksmith offers discount repairs after a rousing pub tale.',
        'The town holds a festival; morale and prices fluctuate.',
      ];
      const line = Utils.pick(seeds);
      return `${line} (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()})`;
    },

    async generateQuestList(notoriety, day) {
      // Procedural quests by notoriety tiers
      const tier = notoriety < 10 ? 1 : notoriety < 25 ? 2 : notoriety < 50 ? 3 : 4;
      const base = [
        { name: 'Rat Problem', diff: 1, reward: 30, fame: 1 },
        { name: 'Lost Parcel', diff: 2, reward: 45, fame: 1 },
        { name: 'Herb Gathering', diff: 2, reward: 50, fame: 2 },
      ];
      const t2 = [
        { name: 'Bandit Ambush', diff: 4, reward: 120, fame: 4 },
        { name: 'Escort Caravan', diff: 5, reward: 150, fame: 5 },
        { name: 'Slime Extermination', diff: 4, reward: 110, fame: 3 },
      ];
      const t3 = [
        { name: 'Wyvern Hunt', diff: 8, reward: 340, fame: 10 },
        { name: 'Cursed Ruins', diff: 9, reward: 380, fame: 12 },
        { name: 'Royal Reconnaissance', diff: 7, reward: 300, fame: 9 },
      ];
      const t4 = [
        { name: 'Demon Lord Vanguard', diff: 12, reward: 800, fame: 25 },
        { name: 'Ancient Dragon', diff: 14, reward: 1100, fame: 30 },
        { name: 'Abyssal Rift', diff: 15, reward: 1300, fame: 40 },
      ];
      const pool = tier === 1 ? base : tier === 2 ? base.concat(t2) : tier === 3 ? t2.concat(t3) : t3.concat(t4);
      const count = Utils.clamp(3 + Math.floor(notoriety / 15), 3, 8);
      return Array.from({ length: count }, () => {
        const q = Utils.deepClone(Utils.pick(pool));
        q.id = Utils.uid('quest');
        q.day = day;
        q.desc = `Quest: ${q.name} | Difficulty ${q.diff} | Reward ${q.reward}g | Fame +${q.fame}`;
        return q;
      });
    },

    async generateCandidates(notoriety, week) {
      const femaleNames = ['Aria', 'Hana', 'Eira', 'Juno', 'Lyra', 'Mina', 'Nadia', 'Ophelia', 'Rin', 'Sera', 'Talia', 'Yuna'];
      const maleNames = ['Borin', 'Caius', 'Fynn', 'Garruk', 'Kai', 'Leon', 'Rook', 'Sylas'];
      const races = ['Human', 'Elf', 'Catfolk', 'Dragonkin'];
      const hairColors = ['black', 'brown', 'blonde', 'silver', 'red', 'white', 'blue'];
      const eyeColors = ['brown', 'green', 'blue', 'amber', 'violet', 'gold'];
      const styles = ['elegant', 'cute', 'athletic', 'mysterious', 'cheerful', 'stoic', 'noble', 'graceful'];
      const classes = [
        { k: 'Warrior', stat: 'str' },
        { k: 'Mage', stat: 'int' },
        { k: 'Rogue', stat: 'agi' },
        { k: 'Cleric', stat: 'spr' },
        { k: 'Ranger', stat: 'agi' },
      ];
      const baseCount = 3 + Math.floor(notoriety / 10);
      const count = Utils.clamp(baseCount, 3, 10);
      return Array.from({ length: count }, () => {
        const c = Utils.pick(classes);
        const talent = Utils.clamp(1 + Math.floor(notoriety / 10) + Utils.randInt(-1, 2), 1, 10);
        const isFemale = Math.random() < 0.95;
        const gender = isFemale ? 'female' : 'male';
        const genderIcon = isFemale ? '♀️' : '♂️';
        const race = Utils.pick(races);
        const hair = Utils.pick(hairColors);
        const eyes = Utils.pick(eyeColors);
        const style = Utils.pick(styles);
        const beauty = Utils.clamp(6 + Math.floor(notoriety / 25) + Utils.randInt(-1, 2), 6, 10);
        const appearance = `${genderIcon} ${style} ${race.toLowerCase()} with ${hair} hair and ${eyes} eyes; beauty ${beauty}/10`;
        const stats = {
          str: Utils.clamp(Utils.randInt(2, 6) + (c.stat === 'str' ? talent : 0), 1, 20),
          int: Utils.clamp(Utils.randInt(2, 6) + (c.stat === 'int' ? talent : 0), 1, 20),
          agi: Utils.clamp(Utils.randInt(2, 6) + (c.stat === 'agi' ? talent : 0), 1, 20),
          spr: Utils.clamp(Utils.randInt(2, 6) + (c.stat === 'spr' ? talent : 0), 1, 20),
          hp: 10 + Utils.randInt(0, 10) + talent * 2,
        };
        const speed = Utils.clamp(1 + Math.floor(stats.agi / 3), 1, 10);
        stats.speed = speed;
        const upkeep = 5 + Math.floor(Utils.sum([stats.str, stats.int, stats.agi, stats.spr]) / 6);
        const avatar = (typeof PortraitProvider !== 'undefined' && PortraitProvider.random) ? PortraitProvider.random() : null;
        return {
          id: Utils.uid('cand'),
          name: `${Utils.pick(isFemale ? femaleNames : maleNames)} ${Utils.randInt(1, 99)}`,
          class: c.k,
          personality: this.randomPersonality(),
          gender,
          appearance,
          avatar,
          stats,
          upkeep,
          skills: [],
          weekAppeared: week,
        };
      });
    },
  };

  global.AIProvider = AIProvider;
})(window);


