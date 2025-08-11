export type ItemCategory = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  sortOrder: number;
}

let categoriesCache: ItemCategory[] | null = null;

/**
 * Load item categories from the JSON file
 */
export async function loadItemCategories(): Promise<ItemCategory[]> {
  if (categoriesCache) {
    return categoriesCache;
  }

  try {
    const base = (import.meta as any).env?.BASE_URL || '/';
    const url = new URL(`${base}${base.endsWith('/') ? '' : '/'}items/item_categories.json`, window.location.href);
    console.log('[CategoriesLoader] loading from:', url.href);
    
    const res = await fetch(url.href, { cache: 'no-cache' });
    if (!res.ok) {
      throw new Error(`Failed to load item_categories.json: ${res.status} ${res.statusText}`);
    }
    
    const categories = await res.json() as ItemCategory[];
    categoriesCache = categories.sort((a, b) => a.sortOrder - b.sortOrder);
    console.log('[CategoriesLoader] loaded categories:', categoriesCache.length);
    return categoriesCache;
  } catch (error) {
    console.error('[CategoriesLoader] failed to load categories:', error);
    // Fallback to basic categories
    categoriesCache = [
      { id: 'food', name: 'Food', emoji: '🍖', description: 'Consumable food items', sortOrder: 1 },
      { id: 'potion', name: 'Potions', emoji: '🧪', description: 'Magical potions', sortOrder: 2 },
      { id: 'weapon', name: 'Weapons', emoji: '⚔️', description: 'Combat weapons', sortOrder: 3 },
      { id: 'armor', name: 'Armor', emoji: '🛡️', description: 'Protective armor', sortOrder: 4 },
      { id: 'accessory', name: 'Accessories', emoji: '💍', description: 'Special accessories', sortOrder: 5 },
      { id: 'skill', name: 'Skill Items', emoji: '📜', description: 'Skill items', sortOrder: 6 }
    ];
    return categoriesCache;
  }
}

/**
 * Get a category by ID
 */
export function getCategoryById(id: string): ItemCategory | undefined {
  if (!categoriesCache) {
    console.warn('[Categories] Categories not loaded yet, call loadItemCategories() first');
    return undefined;
  }
  return categoriesCache.find(cat => cat.id === id);
}

/**
 * Get category emoji by ID
 */
export function getCategoryEmoji(id: string): string {
  const category = getCategoryById(id);
  return category?.emoji || '📦';
}

/**
 * Get category name by ID
 */
export function getCategoryName(id: string): string {
  const category = getCategoryById(id);
  return category?.name || id;
}

/**
 * Get all categories (returns cached version if available)
 */
export function getCategories(): ItemCategory[] {
  return categoriesCache || [];
}

/**
 * Get valid category IDs for type checking
 */
export function getCategoryIds(): string[] {
  return getCategories().map(cat => cat.id);
}
