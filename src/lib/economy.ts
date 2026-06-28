import { itemSprites } from "../data";

export type GearSlot = "Head" | "Neck" | "Charm" | "Aura";
export type ItemRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export interface GearEffects {
  xpMultiplier: number;
  dataMultiplier: number;
  energyBonus: number;
  coinBonus: number;
}

export interface GearItem {
  id: string;
  name: string;
  slot: GearSlot;
  variantKey: string;
  rarity: ItemRarity;
  icon: string;
  itemLevel: number;
  cost: number;
  effects: GearEffects;
  effectLabel: string;
}

export interface EconomySave {
  version: 2;
  coins: number;
  totalEarned: number;
  totalSpent: number;
  inventory: string[];
  loadouts: Record<string, Partial<Record<GearSlot, string>>>;
  ownedPets: string[];
  /** itemId → upgrade level (0..UPGRADE_MAX). */
  upgrades: Record<string, number>;
  careInventory: string[];
}

export const GEAR_SLOTS: GearSlot[] = ["Head", "Neck", "Charm", "Aura"];
export const STARTER_COINS = 200;
export const UPGRADE_MAX = 5;
const UPGRADE_STEP = 0.15; // each upgrade level adds 15% of the item's base bonus

const RARITIES: ItemRarity[] = ["Common", "Uncommon", "Rare", "Epic"];
const ALL_RARITIES: ItemRarity[] = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];
const RARITY_POWER: Record<ItemRarity, number> = {
  Common: 1,
  Uncommon: 1.35,
  Rare: 1.8,
  Epic: 2.45,
  Legendary: 3.4,
};

const RARITY_PRICE_MULTIPLIER: Record<ItemRarity, number> = {
  Common: 1,
  Uncommon: 2.5,
  Rare: 6.5,
  Epic: 16,
  Legendary: 34,
};

const ITEM_PLACEMENT: Record<string, { slot: GearSlot; variantKey: string }> = {
  Hat: { slot: "Head", variantKey: "wizard-hat" },
  Cap: { slot: "Head", variantKey: "cap" },
  Specs: { slot: "Head", variantKey: "glasses" },
  Crown: { slot: "Head", variantKey: "crown" },
  Sprout: { slot: "Head", variantKey: "sprout" },
  Mush: { slot: "Head", variantKey: "mushroom" },
  Scarf: { slot: "Neck", variantKey: "scarf" },
  Bell: { slot: "Neck", variantKey: "golden-bell" },
  Shard: { slot: "Charm", variantKey: "cyan-crystal" },
  Crystal: { slot: "Charm", variantKey: "blue-crystal" },
  Orb: { slot: "Charm", variantKey: "purple-orb" },
  Lens: { slot: "Charm", variantKey: "lens-gem" },
  Portal: { slot: "Charm", variantKey: "portal-orb" },
  UFO: { slot: "Aura", variantKey: "ufo" },
  Relay: { slot: "Aura", variantKey: "relay-antenna" },
  Sleep: { slot: "Aura", variantKey: "sleep-z" },
};

function effectsFor(slot: GearSlot, power: number): GearEffects {
  return {
    xpMultiplier: slot === "Charm" ? 1 + power * 0.025 : 1,
    dataMultiplier: slot === "Neck" ? 1 + power * 0.03 : 1,
    energyBonus: slot === "Head" ? Math.round(power * 4) : 0,
    coinBonus: slot === "Aura" ? power * 0.04 : 0,
  };
}

function effectLabel(slot: GearSlot, power: number): string {
  if (slot === "Charm") return `+${Math.round(power * 2.5)}% contribution XP`;
  if (slot === "Neck") return `+${Math.round(power * 3)}% data sharing`;
  if (slot === "Head") return `+${Math.round(power * 4)} energy floor`;
  return `+${Math.round(power * 4)}% achievement coins`;
}

export const SHOP_ITEMS: GearItem[] = itemSprites.flatMap((sprite, spriteIndex) =>
  RARITIES.map((rarity, rarityIndex) => {
    const placement = ITEM_PLACEMENT[sprite.name] ?? { slot: "Charm" as const, variantKey: "cyan-crystal" };
    const slot = placement.slot;
    const power = RARITY_POWER[rarity] + spriteIndex * 0.06;
    const itemLevel = Math.round(18 + spriteIndex * 9 + rarityIndex * 54);
    const priceMultiplier = RARITY_PRICE_MULTIPLIER[rarity];
    return {
      id: `${sprite.name.toLowerCase().replace(/\s+/g, "-")}-${rarity.toLowerCase()}`,
      name: `${rarity} ${sprite.name}`,
      slot,
      variantKey: placement.variantKey,
      rarity,
      icon: sprite.src,
      itemLevel,
      cost: Math.round(((650 + itemLevel * 28) * priceMultiplier) / 25) * 25,
      effects: effectsFor(slot, power),
      effectLabel: effectLabel(slot, power),
    };
  }),
);

const ITEM_BY_ID = new Map(SHOP_ITEMS.map((item) => [item.id, item] as const));

export function getGearItem(id: string | undefined): GearItem | undefined {
  return id ? ITEM_BY_ID.get(id) : undefined;
}

export function createEconomy(initialPetId?: string): EconomySave {
  return {
    version: 2,
    coins: STARTER_COINS,
    totalEarned: STARTER_COINS,
    totalSpent: 0,
    inventory: [],
    loadouts: initialPetId ? { [initialPetId]: {} } : {},
    ownedPets: initialPetId ? [initialPetId] : [],
    upgrades: {},
    careInventory: [],
  };
}

export function sanitizeEconomy(value: Partial<EconomySave>, initialPetId?: string): EconomySave {
  const inventory = Array.isArray(value.inventory)
    ? value.inventory.filter((id): id is string => typeof id === "string" && ITEM_BY_ID.has(id))
    : [];
  const inventorySet = new Set(inventory);
  const raw = value as Partial<EconomySave> & {
    equipped?: Partial<Record<GearSlot, string>>;
  };
  const loadouts: Record<string, Partial<Record<GearSlot, string>>> = {};
  const rawLoadouts = raw.loadouts && typeof raw.loadouts === "object" ? raw.loadouts : {};
  for (const [petId, candidate] of Object.entries(rawLoadouts)) {
    const loadout: Partial<Record<GearSlot, string>> = {};
    for (const slot of GEAR_SLOTS) {
      const id = candidate?.[slot];
      const item = getGearItem(id);
      if (item && item.slot === slot && inventorySet.has(item.id)) loadout[slot] = item.id;
    }
    loadouts[petId] = loadout;
  }
  if (initialPetId && raw.equipped && !loadouts[initialPetId]) {
    const migrated: Partial<Record<GearSlot, string>> = {};
    for (const slot of GEAR_SLOTS) {
      const id = raw.equipped[slot];
      const item = getGearItem(id);
      if (item && item.slot === slot && inventorySet.has(item.id)) migrated[slot] = item.id;
    }
    loadouts[initialPetId] = migrated;
  }
  const ownedPets = Array.isArray(value.ownedPets)
    ? value.ownedPets.filter((id): id is string => typeof id === "string")
    : [];
  if (initialPetId && !ownedPets.includes(initialPetId)) ownedPets.unshift(initialPetId);

  const upgrades: Record<string, number> = {};
  const rawUpgrades = value.upgrades && typeof value.upgrades === "object" ? value.upgrades : {};
  for (const [id, level] of Object.entries(rawUpgrades)) {
    if (inventorySet.has(id)) {
      const lvl = Math.max(0, Math.min(UPGRADE_MAX, Math.floor(Number(level) || 0)));
      if (lvl > 0) upgrades[id] = lvl;
    }
  }

  return {
    version: 2,
    coins: Math.max(0, Math.floor(Number(value.coins) || 0)),
    totalEarned: Math.max(STARTER_COINS, Math.floor(Number(value.totalEarned) || STARTER_COINS)),
    totalSpent: Math.max(0, Math.floor(Number(value.totalSpent) || 0)),
    inventory,
    loadouts,
    ownedPets,
    upgrades,
    careInventory: Array.isArray(value.careInventory)
      ? value.careInventory.filter((id): id is string => typeof id === "string")
      : [],
  };
}

export function loadoutFor(
  economy: Pick<EconomySave, "loadouts">,
  petId: string | undefined,
): Partial<Record<GearSlot, string>> {
  return petId ? economy.loadouts[petId] ?? {} : {};
}

// --- Upgrades (coin sink) -------------------------------------------------

export function upgradeLevelOf(upgrades: Record<string, number> | undefined, itemId: string): number {
  return Math.max(0, Math.min(UPGRADE_MAX, upgrades?.[itemId] ?? 0));
}

/** Coins to go from `currentLevel` → `currentLevel + 1`. Rises per level. */
export function upgradeCost(item: GearItem, currentLevel: number): number {
  return Math.round((item.cost * (0.6 + currentLevel * 0.45)) / 25) * 25;
}

/** Coins returned when selling/salvaging an item. */
export function sellValue(item: GearItem): number {
  return Math.round((item.cost * 0.4) / 25) * 25;
}

/** An item's effects after applying its upgrade level. */
export function effectiveEffects(item: GearItem, level: number): GearEffects {
  const f = 1 + level * UPGRADE_STEP;
  return {
    xpMultiplier: 1 + (item.effects.xpMultiplier - 1) * f,
    dataMultiplier: 1 + (item.effects.dataMultiplier - 1) * f,
    energyBonus: item.effects.energyBonus * f,
    coinBonus: item.effects.coinBonus * f,
  };
}

// --- Set bonus (matched rarities) ----------------------------------------

export interface SetBonusInfo {
  rarity: ItemRarity | null;
  count: number;
  effects: GearEffects;
  label: string;
}

const NO_SET_EFFECTS: GearEffects = { xpMultiplier: 1, dataMultiplier: 1, energyBonus: 0, coinBonus: 0 };
const SET_TIER: Record<number, { xp: number; coin: number }> = {
  2: { xp: 0.04, coin: 0 },
  3: { xp: 0.09, coin: 0.03 },
  4: { xp: 0.18, coin: 0.08 },
};

export function setBonus(equipped: Partial<Record<GearSlot, string>>): SetBonusInfo {
  const counts: Partial<Record<ItemRarity, number>> = {};
  for (const slot of GEAR_SLOTS) {
    const item = getGearItem(equipped[slot]);
    if (item) counts[item.rarity] = (counts[item.rarity] ?? 0) + 1;
  }
  let best: { rarity: ItemRarity; count: number } | null = null;
  for (const rarity of ALL_RARITIES) {
    const count = counts[rarity] ?? 0;
    if (count >= 2 && (!best || count > best.count)) best = { rarity, count };
  }
  if (!best) return { rarity: null, count: 0, effects: NO_SET_EFFECTS, label: "No set bonus (match 2+ rarities)" };

  const rarityFactor = 1 + (RARITY_POWER[best.rarity] - 1) * 0.5;
  const tier = SET_TIER[best.count] ?? { xp: 0, coin: 0 };
  const xp = tier.xp * rarityFactor;
  const coin = tier.coin * rarityFactor;
  const label =
    `${best.count}× ${best.rarity}: +${Math.round(xp * 100)}% XP` + (coin ? `, +${Math.round(coin * 100)}% coins` : "");
  return {
    rarity: best.rarity,
    count: best.count,
    effects: { xpMultiplier: 1 + xp, dataMultiplier: 1, energyBonus: 0, coinBonus: coin },
    label,
  };
}

export function equipmentBonuses(
  equipped: Partial<Record<GearSlot, string>>,
  upgrades: Record<string, number> = {},
): GearEffects {
  const result: GearEffects = { xpMultiplier: 1, dataMultiplier: 1, energyBonus: 0, coinBonus: 0 };
  for (const slot of GEAR_SLOTS) {
    const item = getGearItem(equipped[slot]);
    if (!item) continue;
    const eff = effectiveEffects(item, upgradeLevelOf(upgrades, item.id));
    result.xpMultiplier *= eff.xpMultiplier;
    result.dataMultiplier *= eff.dataMultiplier;
    result.energyBonus += eff.energyBonus;
    result.coinBonus += eff.coinBonus;
  }
  const sb = setBonus(equipped);
  result.xpMultiplier *= sb.effects.xpMultiplier;
  result.coinBonus += sb.effects.coinBonus;
  return result;
}

export function gearScore(
  equipped: Partial<Record<GearSlot, string>>,
  upgrades: Record<string, number> = {},
): number {
  return GEAR_SLOTS.reduce((sum, slot) => {
    const item = getGearItem(equipped[slot]);
    if (!item) return sum;
    return sum + item.itemLevel + upgradeLevelOf(upgrades, item.id) * 8;
  }, 0);
}
