export type Stats = { str: number; int: number; agi: number; spr: number; hp?: number; speed?: number };

export type Member = {
  id: string;
  name: string;
  class: string;
  personality: string;
  gender?: 'male' | 'female';
  appearance?: string;
  avatar?: string | null;
  upkeep: number;
  stats: Stats;
  hpMax: number;
  hp: number;
  speed: number;
  skills: string[];
  isPlayer?: boolean;
};

export type Candidate = {
  id: string;
  name: string;
  class: string;
  personality: string;
  gender?: 'male' | 'female';
  appearance?: string;
  avatar?: string | null;
  stats: Stats;
  upkeep: number;
  skills: string[];
  weekAppeared: number;
  expiresOnWeek: number;
};

export type Quest = {
  id: string;
  name: string;
  desc?: string;
  diff: number;
  reward: number;
  fame: number;
  day: number;
  expiresOnDay: number;
  assigned?: Member[];
};

export type ExpiredQuest = {
  id: string;
  name: string;
  expiredOnDay: number;
};

export type ExpiredCandidate = {
  id: string;
  name: string;
  class: string;
  expiredOnWeek: number;
  weekAppeared?: number;
  gender?: 'male' | 'female';
  appearance?: string;
  avatar?: string | null;
  stats?: Stats;
  upkeep?: number;
  personality?: string;
};

export type ShopItem = {
  id: string;
  name: string;
  price: number;
  apply(state: GameState): void;
};

export type GameState = {
  day: number;
  week: number;
  money: number;
  notoriety: number;
  members: Member[];
  candidates: Candidate[];
  quests: Quest[];
  inventory: ShopItem[];
  shop: ShopItem[];
  logs: { events: string[]; battle: string[] };
  modifiers: {
    upkeepDeltaPerMember: number;
    questSuccessBonus: number; // percentage points
    recruitStatBonus: number;
    shopDiscount?: number;
  };
  settings: { autoAssign: boolean };
  archives: {
    quests: ExpiredQuest[];
    candidates: ExpiredCandidate[];
  };
};


