/**
 * Pet care (Tamagotchi) system.
 *
 * Stats live per-pet and decay in real time. Higher values are always better:
 *   hunger      — 0 starving, 100 full
 *   cleanliness — 0 filthy,  100 spotless
 *   fun         — 0 bored,   100 entertained
 *   bond        — 0..100, persistent attachment that only grows through play
 *
 * Care stats feed back into the existing progression system: a well-cared-for
 * pet earns XP faster and shows a happier mood; a neglected pet slows XP and
 * looks unhappy.
 */

import { itemSprites } from "../data";

export interface CareStats {
  hunger: number; // 0..100
  cleanliness: number; // 0..100
  fun: number; // 0..100
  bond: number; // 0..100
  /** Epoch ms of the last decay tick. */
  lastTickAt: number;
  /** Epoch ms of the last free play action (cooldown). */
  lastFreePlayAt: number;
  /** Epoch ms of the last pet action (cooldown). */
  lastPetAt: number;
}

export function createCareStats(now = Date.now()): CareStats {
  return {
    hunger: 80,
    cleanliness: 80,
    fun: 70,
    bond: 10,
    lastTickAt: now,
    lastFreePlayAt: 0,
    lastPetAt: 0,
  };
}

export function sanitizeCareStats(value: Partial<CareStats> | undefined | null, now = Date.now()): CareStats {
  const base = createCareStats(now);
  if (!value) return base;
  const clamp01to100 = (n: unknown) => Math.max(0, Math.min(100, Math.max(0, Number(n) || 0)));
  return {
    hunger: clamp01to100(value.hunger),
    cleanliness: clamp01to100(value.cleanliness),
    fun: clamp01to100(value.fun),
    bond: clamp01to100(value.bond),
    lastTickAt: typeof value.lastTickAt === "number" ? value.lastTickAt : now,
    lastFreePlayAt: typeof value.lastFreePlayAt === "number" ? value.lastFreePlayAt : 0,
    lastPetAt: typeof value.lastPetAt === "number" ? value.lastPetAt : 0,
  };
}

// --- Decay rates (per real hour) -----------------------------------------

/** Per-hour decay. Decay is paused while the player has no active pet. */
export const DECAY_PER_HOUR = {
  hunger: 7, // gets hungry
  cleanliness: 5, // gets dirty
  fun: 6, // gets bored
} as const;

/** Baseline bond growth per hour while cared for (most bond comes from actions). */
export const BOND_IDLE_GROWTH_PER_HOUR = 0.15;

/** Apply real-time decay. Returns a fresh object; does not mutate input. */
export function decay(stats: CareStats, now = Date.now()): CareStats {
  const elapsedMs = Math.max(0, now - stats.lastTickAt);
  const hours = elapsedMs / 3_600_000;
  if (hours <= 0) return { ...stats, lastTickAt: now };
  return {
    ...stats,
    hunger: clampStat(stats.hunger - DECAY_PER_HOUR.hunger * hours),
    cleanliness: clampStat(stats.cleanliness - DECAY_PER_HOUR.cleanliness * hours),
    fun: clampStat(stats.fun - DECAY_PER_HOUR.fun * hours),
    bond: clampStat(stats.bond + BOND_IDLE_GROWTH_PER_HOUR * hours),
    lastTickAt: now,
  };
}

function clampStat(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

// --- Derived effects ------------------------------------------------------

export interface CareBonuses {
  /** Multiplier applied to XP gain (1 = neutral). */
  xpMultiplier: number;
  /** Mood bias added to the mood derivation (-2..+2). */
  moodBias: number;
  /** True if every stat is in the healthy band — used for UI flourishes. */
  allHappy: boolean;
  /** True if any stat is in the warning band. */
  neglected: boolean;
}

const NEUTRAL: CareBonuses = { xpMultiplier: 1, moodBias: 0, allHappy: false, neglected: false };

export function deriveCareBonuses(stats: CareStats | null): CareBonuses {
  if (!stats) return NEUTRAL;
  const low = (n: number) => n < 20;
  const high = (n: number) => n >= 60;
  const neglectedCount = (low(stats.hunger) ? 1 : 0) + (low(stats.cleanliness) ? 1 : 0) + (low(stats.fun) ? 1 : 0);
  const happyCount = (high(stats.hunger) ? 1 : 0) + (high(stats.cleanliness) ? 1 : 0) + (high(stats.fun) ? 1 : 0);

  let xp = 1;
  let mood = 0;

  if (neglectedCount > 0) {
    xp -= 0.18 * neglectedCount;
    mood -= 0.6 * neglectedCount;
  }
  if (happyCount === 3) {
    xp += 0.15;
    mood += 1.2;
  }

  // Bond grants up to +10% XP at 100 bond.
  xp += Math.min(0.1, stats.bond / 1000);
  if (stats.bond >= 80) mood += 0.4;

  return {
    xpMultiplier: Math.max(0.25, xp),
    moodBias: Math.max(-2, Math.min(2, mood)),
    allHappy: happyCount === 3 && stats.bond >= 50,
    neglected: neglectedCount > 0,
  };
}

// --- Care items (purchasable consumables) ---------------------------------

export type CareItemKind = "food" | "soap" | "toy";

export interface CareItem {
  id: string;
  name: string;
  kind: CareItemKind;
  icon: string;
  cost: number;
  /** Stat deltas applied when the item is used. */
  effects: {
    hunger?: number;
    cleanliness?: number;
    fun?: number;
    bond?: number;
  };
  description: string;
}

function sprite(name: string): string {
  const match = itemSprites.find((s) => s.name === name);
  return (match ?? itemSprites[0]).src;
}

export const CARE_ITEMS: CareItem[] = [
  // Food — fills hunger
  {
    id: "care-food-berry",
    name: "Forest Berry",
    kind: "food",
    icon: sprite("Sprout"),
    cost: 50,
    effects: { hunger: 30 },
    description: "+30 Hunger",
  },
  {
    id: "care-food-stew",
    name: "Tunnel Stew",
    kind: "food",
    icon: sprite("Mush"),
    cost: 200,
    effects: { hunger: 70, bond: 2 },
    description: "+70 Hunger, +2 Bond",
  },
  {
    id: "care-food-feast",
    name: "Royal Feast",
    kind: "food",
    icon: sprite("Portal"),
    cost: 800,
    effects: { hunger: 100, bond: 5, fun: 10 },
    description: "+100 Hunger, +5 Bond, +10 Fun",
  },
  // Soap — restores cleanliness
  {
    id: "care-soap-basic",
    name: "River Soap",
    kind: "soap",
    icon: sprite("Shard"),
    cost: 80,
    effects: { cleanliness: 60 },
    description: "+60 Cleanliness",
  },
  {
    id: "care-soap-bubble",
    name: "Bubble Bath",
    kind: "soap",
    icon: sprite("Crystal"),
    cost: 300,
    effects: { cleanliness: 100, bond: 2 },
    description: "+100 Cleanliness, +2 Bond",
  },
  // Toys — fill fun
  {
    id: "care-toy-ball",
    name: "Relay Ball",
    kind: "toy",
    icon: sprite("Orb"),
    cost: 150,
    effects: { fun: 30, bond: 1 },
    description: "+30 Fun, +1 Bond",
  },
  {
    id: "care-toy-plush",
    name: "Bandwidth Plush",
    kind: "toy",
    icon: sprite("Mush"),
    cost: 400,
    effects: { fun: 60, bond: 3 },
    description: "+60 Fun, +3 Bond",
  },
  {
    id: "care-toy-bell",
    name: "Golden Bell Toy",
    kind: "toy",
    icon: sprite("Bell"),
    cost: 1000,
    effects: { fun: 100, bond: 5 },
    description: "+100 Fun, +5 Bond",
  },
];

const CARE_ITEM_BY_ID = new Map(CARE_ITEMS.map((item) => [item.id, item] as const));

export function getCareItem(id: string | undefined): CareItem | undefined {
  return id ? CARE_ITEM_BY_ID.get(id) : undefined;
}

// --- Actions --------------------------------------------------------------

/** Cooldown for the free (no-toy) play action. */
export const FREE_PLAY_COOLDOWN_MS = 60_000;
/** Cooldown for the free pet action. */
export const PET_COOLDOWN_MS = 15_000;
/** Small bond granted when feeding without any food item (foraging). */
export const FORAGE_HUNGER = 12;

export type CareActionId = "feed" | "clean" | "play" | "pet";

export interface CareActionResult {
  stats: CareStats;
  /** Item consumed, if any. */
  consumedItemId?: string;
  /** True if the action actually did something. */
  applied: boolean;
  /** Reason the action was rejected, if any. */
  reason?: "cooldown" | "no_item" | "maxed";
}

/**
 * Apply a care action. Returns a new stats object; does not mutate input.
 * The caller is responsible for spending / consuming any item id passed in.
 */
export function applyCareAction(
  stats: CareStats,
  action: CareActionId,
  options: { itemId?: string; inventoryHasItem?: boolean; now?: number } = {},
): CareActionResult {
  const now = options.now ?? Date.now();
  const decayed = decay(stats, now);

  if (action === "feed") {
    const item = getCareItem(options.itemId);
    if (options.itemId) {
      if (!item || options.inventoryHasItem === false) {
        return { stats: decayed, applied: false, reason: "no_item" };
      }
      return {
        stats: withEffects(decayed, item.effects, now),
        consumedItemId: item.id,
        applied: true,
      };
    }
    // Forage fallback — no item, small free bite with a long cooldown.
    if (decayed.hunger >= 100) return { stats: decayed, applied: false, reason: "maxed" };
    return {
      stats: withEffects(decayed, { hunger: FORAGE_HUNGER }, now),
      applied: true,
    };
  }

  if (action === "clean") {
    const item = getCareItem(options.itemId);
    if (options.itemId) {
      if (!item || options.inventoryHasItem === false) {
        return { stats: decayed, applied: false, reason: "no_item" };
      }
      return {
        stats: withEffects(decayed, item.effects, now),
        consumedItemId: item.id,
        applied: true,
      };
    }
    // Free rinse — quick splash.
    if (decayed.cleanliness >= 100) return { stats: decayed, applied: false, reason: "maxed" };
    return {
      stats: withEffects(decayed, { cleanliness: 25 }, now),
      applied: true,
    };
  }

  if (action === "play") {
    const item = getCareItem(options.itemId);
    if (options.itemId && item) {
      if (options.inventoryHasItem === false) return { stats: decayed, applied: false, reason: "no_item" };
      return {
        stats: withEffects(decayed, item.effects, now),
        consumedItemId: item.id,
        applied: true,
      };
    }
    // Free play — small effect, cooldown-gated.
    if (now - decayed.lastFreePlayAt < FREE_PLAY_COOLDOWN_MS) {
      return { stats: decayed, applied: false, reason: "cooldown" };
    }
    return {
      stats: withEffects({ ...decayed, lastFreePlayAt: now }, { fun: 18, bond: 1 }, now),
      applied: true,
    };
  }

  // pet
  if (now - decayed.lastPetAt < PET_COOLDOWN_MS) {
    return { stats: decayed, applied: false, reason: "cooldown" };
  }
  return {
    stats: withEffects({ ...decayed, lastPetAt: now }, { bond: 1, fun: 2 }, now),
    applied: true,
  };
}

function withEffects(
  stats: CareStats,
  effects: CareItem["effects"],
  now: number,
): CareStats {
  return {
    ...stats,
    hunger: effects.hunger != null ? clampStat(stats.hunger + effects.hunger) : stats.hunger,
    cleanliness: effects.cleanliness != null ? clampStat(stats.cleanliness + effects.cleanliness) : stats.cleanliness,
    fun: effects.fun != null ? clampStat(stats.fun + effects.fun) : stats.fun,
    bond: effects.bond != null ? clampStat(stats.bond + effects.bond) : stats.bond,
    lastTickAt: now,
  };
}

// --- Status helpers for UI ------------------------------------------------

export interface CareStatStatus {
  /** 0..100 — current value. */
  value: number;
  /** UI tone: "good" | "ok" | "warn" | "critical". */
  tone: "good" | "ok" | "warn" | "critical";
  /** Human label like "Full", "Snacky", "Hungry", "Starving". */
  label: string;
}

const TONES: { tone: CareStatStatus["tone"]; min: number; label: string }[] = [
  { min: 80, tone: "good", label: "Full" },
  { min: 60, tone: "good", label: "Satisfied" },
  { min: 40, tone: "ok", label: "Peckish" },
  { min: 20, tone: "warn", label: "Hungry" },
  { min: 0, tone: "critical", label: "Starving" },
];

export function hungerStatus(value: number): CareStatStatus {
  return resolveStatus(value, [
    { min: 80, tone: "good", label: "Full" },
    { min: 60, tone: "good", label: "Satisfied" },
    { min: 40, tone: "ok", label: "Peckish" },
    { min: 20, tone: "warn", label: "Hungry" },
    { min: 0, tone: "critical", label: "Starving" },
  ]);
}

export function cleanlinessStatus(value: number): CareStatStatus {
  return resolveStatus(value, [
    { min: 80, tone: "good", label: "Spotless" },
    { min: 60, tone: "good", label: "Clean" },
    { min: 40, tone: "ok", label: "Dusty" },
    { min: 20, tone: "warn", label: "Dirty" },
    { min: 0, tone: "critical", label: "Filthy" },
  ]);
}

export function funStatus(value: number): CareStatStatus {
  return resolveStatus(value, [
    { min: 80, tone: "good", label: "Delighted" },
    { min: 60, tone: "good", label: "Playful" },
    { min: 40, tone: "ok", label: "Mellow" },
    { min: 20, tone: "warn", label: "Bored" },
    { min: 0, tone: "critical", label: "Miserable" },
  ]);
}

export function bondStatus(value: number): CareStatStatus {
  return resolveStatus(value, [
    { min: 80, tone: "good", label: "Devoted" },
    { min: 60, tone: "good", label: "Close" },
    { min: 40, tone: "ok", label: "Friendly" },
    { min: 20, tone: "warn", label: "Warming up" },
    { min: 0, tone: "critical", label: "Wary" },
  ]);
}

function resolveStatus(
  value: number,
  bands: { min: number; tone: CareStatStatus["tone"]; label: string }[],
): CareStatStatus {
  const v = clampStat(value);
  const band = bands.find((b) => v >= b.min) ?? bands[bands.length - 1];
  return { value: Math.round(v), tone: band.tone, label: band.label };
}

export function careStatusLabel(stats: CareStats | null): string {
  if (!stats) return "No active pet";
  const h = hungerStatus(stats.hunger);
  const c = cleanlinessStatus(stats.cleanliness);
  const f = funStatus(stats.fun);
  const worst = [h, c, f].sort((a, b) => priority(a.tone) - priority(b.tone))[0];
  if (worst.tone === "critical") return `${worst.label} — needs attention`;
  if (worst.tone === "warn") return `${worst.label} — check soon`;
  if (deriveCareBonuses(stats).allHappy) return "Thriving";
  return "Well cared for";
}

function priority(tone: CareStatStatus["tone"]): number {
  switch (tone) {
    case "critical": return 0;
    case "warn": return 1;
    case "ok": return 2;
    case "good": return 3;
  }
}

// Expose tones list for callers that want the reference table.
export const CARE_TONES = TONES;
