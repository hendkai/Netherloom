/**
 * Expeditions — idle content where the active pet goes on a timed mission and
 * returns with coins, XP, and occasional items. Only one expedition runs at a
 * time per pet; completion is gated by real wall-clock time.
 */

import { itemSprites, skillSprites } from "../data";

export interface ExpeditionRewards {
  coinsMin: number;
  coinsMax: number;
  xpMin: number;
  xpMax: number;
  /** 0..1 chance of returning a random care item. */
  careItemChance?: number;
  /** 0..1 chance of returning bonus coins (jackpot). */
  bonusCoinChance?: number;
}

export interface Expedition {
  id: string;
  name: string;
  location: string;
  description: string;
  durationMs: number;
  minLevel: number;
  icon: string;
  accent: string;
  rewards: ExpeditionRewards;
}

function skill(name: string): string {
  const match = skillSprites.find((s) => s.name === name);
  return (match ?? skillSprites[0]).src;
}

function itemIcon(name: string): string {
  const match = itemSprites.find((s) => s.name === name);
  return (match ?? itemSprites[0]).src;
}

export const EXPEDITIONS: Expedition[] = [
  {
    id: "tunnel-sweep",
    name: "Tunnel Sweep",
    location: "Local Relay",
    description: "A quick scan of nearby tunnels. Cheap, fast, reliable.",
    durationMs: 5 * 60_000,
    minLevel: 0,
    icon: skill("Tunnel"),
    accent: "#7a5aff",
    rewards: { coinsMin: 40, coinsMax: 80, xpMin: 30, xpMax: 60, careItemChance: 0.1 },
  },
  {
    id: "peer-hunt",
    name: "Peer Hunt",
    location: "Outer NetDB",
    description: "Track down new peers. Decent coin and a small chance of food.",
    durationMs: 30 * 60_000,
    minLevel: 5,
    icon: skill("Network"),
    accent: "#57c7ff",
    rewards: { coinsMin: 180, coinsMax: 320, xpMin: 140, xpMax: 240, careItemChance: 0.35 },
  },
  {
    id: "bandwidth-run",
    name: "Bandwidth Run",
    location: "Backbone Relays",
    description: "Carry a load across the network. Strong rewards, 2 hours.",
    durationMs: 2 * 60 * 60_000,
    minLevel: 10,
    icon: skill("Lightning"),
    accent: "#ffb24d",
    rewards: {
      coinsMin: 600,
      coinsMax: 1100,
      xpMin: 500,
      xpMax: 900,
      careItemChance: 0.6,
      bonusCoinChance: 0.15,
    },
  },
  {
    id: "netdb-survey",
    name: "NetDB Survey",
    location: "Distributed NetDB",
    description: "Map the living atlas. Boosts bond and rare care items.",
    durationMs: 4 * 60 * 60_000,
    minLevel: 15,
    icon: skill("Radar"),
    accent: "#43dd85",
    rewards: {
      coinsMin: 1200,
      coinsMax: 2000,
      xpMin: 1000,
      xpMax: 1600,
      careItemChance: 0.8,
      bonusCoinChance: 0.25,
    },
  },
  {
    id: "deep-dive",
    name: "Deep Dive",
    location: "Hidden Services",
    description: "Long mission into the deeper network. High yield, 8 hours.",
    durationMs: 8 * 60 * 60_000,
    minLevel: 20,
    icon: skill("Orbit"),
    accent: "#b280ff",
    rewards: {
      coinsMin: 2400,
      coinsMax: 4000,
      xpMin: 2200,
      xpMax: 3400,
      careItemChance: 1,
      bonusCoinChance: 0.4,
    },
  },
  {
    id: "pilgrimage",
    name: "Router Pilgrimage",
    location: "Ancient Routing Nodes",
    description: "A 12-hour trek to the oldest relays. Best yield in the game.",
    durationMs: 12 * 60 * 60_000,
    minLevel: 30,
    icon: skill("Crown"),
    accent: "#f0df62",
    rewards: {
      coinsMin: 5000,
      coinsMax: 9000,
      xpMin: 5000,
      xpMax: 8000,
      careItemChance: 1,
      bonusCoinChance: 0.6,
    },
  },
];

const EXPEDITION_BY_ID = new Map(EXPEDITIONS.map((e) => [e.id, e] as const));

export function getExpedition(id: string | undefined): Expedition | undefined {
  return id ? EXPEDITION_BY_ID.get(id) : undefined;
}

/** Cost (in coins) to rush the remaining time and complete instantly. */
export function rushCost(remainingMs: number): number {
  const minutes = Math.max(0, remainingMs / 60_000);
  return Math.max(10, Math.round(minutes * 2));
}

// --- Save state ------------------------------------------------------------

export interface ActiveExpedition {
  expeditionId: string;
  startedAt: number;
  durationMs: number;
  rushed: boolean;
}

export interface ExpeditionSave {
  active: ActiveExpedition | null;
  completedCount: number;
}

export function createExpeditionSave(): ExpeditionSave {
  return { active: null, completedCount: 0 };
}

export function sanitizeExpeditionSave(value: Partial<ExpeditionSave> | undefined | null): ExpeditionSave {
  const base = createExpeditionSave();
  if (!value) return base;
  const active = value.active;
  let sanitizedActive: ActiveExpedition | null = null;
  if (active && typeof active.expeditionId === "string" && typeof active.startedAt === "number") {
    const def = getExpedition(active.expeditionId);
    if (def) {
      sanitizedActive = {
        expeditionId: active.expeditionId,
        startedAt: active.startedAt,
        durationMs: def.durationMs,
        rushed: active.rushed === true,
      };
    }
  }
  return {
    active: sanitizedActive,
    completedCount: Math.max(0, Math.floor(Number(value.completedCount) || 0)),
  };
}

// --- Live state ------------------------------------------------------------

export interface ExpeditionProgress {
  total: number;
  remaining: number;
  pct: number;
  complete: boolean;
}

export function expeditionProgress(active: ActiveExpedition, now = Date.now()): ExpeditionProgress {
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

export interface ExpeditionRewardResult {
  coins: number;
  xp: number;
  careItemId?: string;
  bonusCoins: number;
}

const POSSIBLE_CARE_ITEM_IDS = [
  "care-food-berry",
  "care-food-stew",
  "care-soap-basic",
  "care-toy-ball",
  "care-toy-plush",
  "care-soap-bubble",
];

function rollInRange(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

export function rollExpeditionRewards(
  expedition: Expedition,
  level: number,
  bonusCoinMultiplier: number = 1,
): ExpeditionRewardResult {
  const levelFactor = 1 + Math.min(0.5, level * 0.01);
  const baseCoins = Math.round(rollInRange(expedition.rewards.coinsMin, expedition.rewards.coinsMax) * levelFactor);
  const xp = Math.round(rollInRange(expedition.rewards.xpMin, expedition.rewards.xpMax) * levelFactor);

  let careItemId: string | undefined;
  if (expedition.rewards.careItemChance && Math.random() < expedition.rewards.careItemChance) {
    careItemId = POSSIBLE_CARE_ITEM_IDS[Math.floor(Math.random() * POSSIBLE_CARE_ITEM_IDS.length)];
  }

  let bonusCoins = 0;
  if (expedition.rewards.bonusCoinChance && Math.random() < expedition.rewards.bonusCoinChance) {
    bonusCoins = Math.round(baseCoins * 0.5 * bonusCoinMultiplier);
  }

  return {
    coins: baseCoins,
    xp,
    careItemId,
    bonusCoins,
  };
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

// Care item icon helper for result display — re-exports so the view layer can
// resolve without reaching into the care module's catalog directly.
export { itemIcon as careItemIconFor };
