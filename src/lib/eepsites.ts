/**
 * Eepsite exploration — visits to I2P hidden services. Functionally similar to
 * expeditions but with I2P-thematic flavor, higher risk/reward, and unique
 * loot tables. Some eepsites are "discovered" only via drops from specific
 * bosses, giving the player a reason to grind the atlas.
 */

import { itemSprites, skillSprites } from "../data";

export type EepsiteDiscoverySource =
  | "open"
  | "boss:netdb-drifter"
  | "boss:tunnel-wraith"
  | "boss:bandwidth-leviathan"
  | "boss:storm-of-static"
  | "boss:ancient-router";

export interface EepsiteRewards {
  coinsMin: number;
  coinsMax: number;
  xpMin: number;
  xpMax: number;
  /** 0..1 chance of returning a random care item from the pool. */
  careItemChance?: number;
  /** 0..1 chance of returning bonus coins (jackpot). */
  bonusCoinChance?: number;
  /** Care item ids that can drop here (unique per eepsite). */
  dropPool?: string[];
}

export interface Eepsite {
  id: string;
  /** Hostname-style name, e.g. "idk.i2p". */
  host: string;
  /** Friendly label, e.g. "I2P Registry". */
  name: string;
  description: string;
  durationMs: number;
  minLevel: number;
  icon: string;
  accent: string;
  /** Where the player learns this eepsite exists. "open" = always available. */
  discovery: EepsiteDiscoverySource;
  /** Discovery flavor shown for still-locked eepsites. */
  discoveryHint: string;
  rewards: EepsiteRewards;
}

function skill(name: string): string {
  const match = skillSprites.find((s) => s.name === name);
  return (match ?? skillSprites[0]).src;
}

function itemIcon(name: string): string {
  const match = itemSprites.find((s) => s.name === name);
  return (match ?? itemSprites[0]).src;
}

export const EEPSITES: Eepsite[] = [
  {
    id: "paste",
    host: "paste.i2p",
    name: "Anonymous Paste",
    description: "Quick dip into the public pastebin. Cheap intel, fast turnaround.",
    durationMs: 15 * 60_000,
    minLevel: 0,
    icon: skill("Leaf"),
    accent: "#5df5c4",
    discovery: "open",
    discoveryHint: "Open to everyone.",
    rewards: {
      coinsMin: 80,
      coinsMax: 160,
      xpMin: 60,
      xpMax: 120,
      careItemChance: 0.35,
      dropPool: ["care-food-berry", "care-soap-basic", "care-toy-ball"],
    },
  },
  {
    id: "idk",
    host: "idk.i2p",
    name: "I2P Registry",
    description: "The central addressbook. Solid coin and care item yields.",
    durationMs: 45 * 60_000,
    minLevel: 5,
    icon: skill("Network"),
    accent: "#57c7ff",
    discovery: "open",
    discoveryHint: "Open to everyone.",
    rewards: {
      coinsMin: 320,
      coinsMax: 540,
      xpMin: 240,
      xpMax: 420,
      careItemChance: 0.55,
      bonusCoinChance: 0.15,
      dropPool: ["care-food-stew", "care-soap-basic", "care-toy-ball", "care-toy-plush"],
    },
  },
  {
    id: "reg",
    host: "reg.i2p",
    name: "Domain Registration",
    description: "Where I2P hosts register their leases. Premium care item pool.",
    durationMs: 90 * 60_000,
    minLevel: 10,
    icon: skill("Shield"),
    accent: "#43dd85",
    discovery: "open",
    discoveryHint: "Open to everyone.",
    rewards: {
      coinsMin: 800,
      coinsMax: 1400,
      xpMin: 700,
      xpMax: 1100,
      careItemChance: 0.75,
      bonusCoinChance: 0.2,
      dropPool: ["care-soap-bubble", "care-toy-plush", "care-food-stew"],
    },
  },
  {
    id: "tracker",
    host: "tracker.i2p",
    name: "I2PSnark Tracker",
    description: "Swarm coordinator for anonymous torrents. Strong data-shared flavor.",
    durationMs: 2 * 60 * 60_000,
    minLevel: 12,
    icon: skill("Lightning"),
    accent: "#ffb24d",
    discovery: "boss:tunnel-wraith",
    discoveryHint: "Coordinates drop from the Tunnel Wraith.",
    rewards: {
      coinsMin: 1500,
      coinsMax: 2400,
      xpMin: 1300,
      xpMax: 2100,
      careItemChance: 0.9,
      bonusCoinChance: 0.3,
      dropPool: ["care-toy-plush", "care-food-stew", "care-soap-bubble"],
    },
  },
  {
    id: "stats",
    host: "stats.i2p",
    name: "Network Statistics",
    description: "Aggregate router telemetry. Insightful data, lens-shard drops.",
    durationMs: 3 * 60 * 60_000,
    minLevel: 15,
    icon: skill("Radar"),
    accent: "#7a5aff",
    discovery: "open",
    discoveryHint: "Open to everyone.",
    rewards: {
      coinsMin: 2400,
      coinsMax: 3800,
      xpMin: 2100,
      xpMax: 3300,
      careItemChance: 0.95,
      bonusCoinChance: 0.35,
      dropPool: ["care-food-stew", "care-soap-bubble", "care-toy-plush"],
    },
  },
  {
    id: "echo",
    host: "echo.i2p",
    name: "Anonymous Forum",
    description: "Where the network's loudest voices gather. High-yield, high-attention.",
    durationMs: 4 * 60 * 60_000,
    minLevel: 18,
    icon: skill("Burst"),
    accent: "#ff6fae",
    discovery: "boss:netdb-drifter",
    discoveryHint: "Whispers drop from the NetDB Drifter.",
    rewards: {
      coinsMin: 4000,
      coinsMax: 6400,
      xpMin: 3500,
      xpMax: 5500,
      careItemChance: 1,
      bonusCoinChance: 0.45,
      dropPool: ["care-food-feast", "care-toy-bell", "care-soap-bubble"],
    },
  },
  {
    id: "git",
    host: "git.idk.i2p",
    name: "Code Repository",
    description: "Mirror of the network's open-source tools. Heavy cache of premium items.",
    durationMs: 6 * 60 * 60_000,
    minLevel: 22,
    icon: skill("Tunnel"),
    accent: "#b280ff",
    discovery: "boss:storm-of-static",
    discoveryHint: "Manifest drops from the Storm of Static.",
    rewards: {
      coinsMin: 7500,
      coinsMax: 12000,
      xpMin: 6500,
      xpMax: 10000,
      careItemChance: 1,
      bonusCoinChance: 0.55,
      dropPool: ["care-food-feast", "care-toy-bell", "care-toy-plush", "care-soap-bubble"],
    },
  },
  {
    id: "mail",
    host: "mail.i2p",
    name: "Susimail Relay",
    description: "Endgame correspondence node. Longest visit, richest haul.",
    durationMs: 8 * 60 * 60_000,
    minLevel: 28,
    icon: skill("Crown"),
    accent: "#f0df62",
    discovery: "boss:bandwidth-leviathan",
    discoveryHint: "Invitation drops from the Bandwidth Leviathan.",
    rewards: {
      coinsMin: 14000,
      coinsMax: 22000,
      xpMin: 12000,
      xpMax: 19000,
      careItemChance: 1,
      bonusCoinChance: 0.7,
      dropPool: ["care-food-feast", "care-toy-bell", "care-soap-bubble", "care-toy-plush"],
    },
  },
];

const EEPSITE_BY_ID = new Map(EEPSITES.map((e) => [e.id, e] as const));

export function getEepsite(id: string | undefined): Eepsite | undefined {
  return id ? EEPSITE_BY_ID.get(id) : undefined;
}

export function eepsiteForDiscovery(source: EepsiteDiscoverySource): Eepsite | undefined {
  if (source === "open") return undefined;
  return EEPSITES.find((e) => e.discovery === source);
}

export function rushCostEepsite(remainingMs: number): number {
  const minutes = Math.max(0, remainingMs / 60_000);
  return Math.max(20, Math.round(minutes * 3));
}

// --- Save state ------------------------------------------------------------

export interface ActiveEepsite {
  eepsiteId: string;
  startedAt: number;
  durationMs: number;
  rushed: boolean;
}

export interface EepsiteSave {
  active: ActiveEepsite | null;
  completedCount: number;
  /** Discovered eepsite ids (always includes "open" ones). */
  discovered: string[];
}

export function createEepsiteSave(): EepsiteSave {
  return {
    active: null,
    completedCount: 0,
    discovered: EEPSITES.filter((e) => e.discovery === "open").map((e) => e.id),
  };
}

export function sanitizeEepsiteSave(value: Partial<EepsiteSave> | undefined | null): EepsiteSave {
  const base = createEepsiteSave();
  if (!value) return base;

  const active = value.active;
  let sanitizedActive: ActiveEepsite | null = null;
  if (active && typeof active.eepsiteId === "string" && typeof active.startedAt === "number") {
    const def = getEepsite(active.eepsiteId);
    if (def) {
      sanitizedActive = {
        eepsiteId: active.eepsiteId,
        startedAt: active.startedAt,
        durationMs: def.durationMs,
        rushed: active.rushed === true,
      };
    }
  }

  const baseDiscovered = new Set(base.discovered);
  const discovered = Array.isArray(value.discovered)
    ? Array.from(new Set([...baseDiscovered, ...value.discovered.filter((id): id is string => typeof id === "string")]))
    : Array.from(baseDiscovered);

  return {
    active: sanitizedActive,
    completedCount: Math.max(0, Math.floor(Number(value.completedCount) || 0)),
    discovered,
  };
}

// --- Live state ------------------------------------------------------------

export interface EepsiteProgress {
  total: number;
  remaining: number;
  pct: number;
  complete: boolean;
}

export function eepsiteProgress(active: ActiveEepsite, now = Date.now()): EepsiteProgress {
  const elapsed = Math.max(0, now - active.startedAt);
  const total = active.durationMs;
  const pct = Math.max(0, Math.min(1, elapsed / total));
  return {
    total,
    remaining: Math.max(0, total - elapsed),
    pct,
    complete: elapsed >= total,
  };
}

// --- Reward rolls ----------------------------------------------------------

export interface EepsiteRewardResult {
  coins: number;
  xp: number;
  careItemId?: string;
  bonusCoins: number;
}

function rollInRange(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

export function rollEepsiteRewards(
  eepsite: Eepsite,
  level: number,
  bonusCoinMultiplier: number = 1,
): EepsiteRewardResult {
  const levelFactor = 1 + Math.min(0.6, level * 0.012);
  const baseCoins = Math.round(rollInRange(eepsite.rewards.coinsMin, eepsite.rewards.coinsMax) * levelFactor);
  const xp = Math.round(rollInRange(eepsite.rewards.xpMin, eepsite.rewards.xpMax) * levelFactor);

  let careItemId: string | undefined;
  if (eepsite.rewards.careItemChance && eepsite.rewards.dropPool && eepsite.rewards.dropPool.length > 0) {
    if (Math.random() < eepsite.rewards.careItemChance) {
      const pool = eepsite.rewards.dropPool;
      careItemId = pool[Math.floor(Math.random() * pool.length)];
    }
  }

  let bonusCoins = 0;
  if (eepsite.rewards.bonusCoinChance && Math.random() < eepsite.rewards.bonusCoinChance) {
    bonusCoins = Math.round(baseCoins * 0.5 * bonusCoinMultiplier);
  }

  return { coins: baseCoins, xp, careItemId, bonusCoins };
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

void itemIcon;
