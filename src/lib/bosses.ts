/**
 * World Bosses — huge HP-pool enemies that the active pet chips away at over
 * time. Damage comes from three sources:
 *   1. Click attacks (cooldown-gated)
 *   2. Care items used as ammo (consumed for burst damage)
 *   3. Router live activity (passive tick damage, scaled by Network Support)
 *
 * Network Support is the "co-op flavor": a damage multiplier that rises with
 * peer count and participating tunnels, simulating that the wider network is
 * helping the assault.
 */

import { skillSprites } from "../data";
import type { RouterMetrics } from "./observatory";
import type { CareItem } from "./care";
import type { EvolutionPath } from "./progression";

export interface BossRewards {
  coinsPerPhase: number;
  xpPerPhase: number;
  defeatCoins: number;
  defeatXp: number;
  /** care item ids dropped on defeat (in addition to coins/xp). */
  drops?: string[];
}

export interface Boss {
  id: string;
  name: string;
  title: string;
  description: string;
  baseHp: number;
  minLevel: number;
  phases: number;
  icon: string;
  accent: string;
  rewards: BossRewards;
}

function skill(name: string): string {
  const match = skillSprites.find((s) => s.name === name);
  return (match ?? skillSprites[0]).src;
}

export const BOSSES: Boss[] = [
  {
    id: "netdb-drifter",
    name: "NetDB Drifter",
    title: "Lurker of the Edges",
    description: "A wandering entity that feeds on stale leases in the NetDB fringes.",
    baseHp: 600,
    minLevel: 1,
    phases: 4,
    icon: skill("Radar"),
    accent: "#57c7ff",
    rewards: {
      coinsPerPhase: 80,
      xpPerPhase: 60,
      defeatCoins: 400,
      defeatXp: 300,
      drops: ["care-food-berry", "care-soap-basic"],
    },
  },
  {
    id: "tunnel-wraith",
    name: "Tunnel Wraith",
    title: "Ghost in the Relays",
    description: "Lost packets given form. It haunts idle tunnels and drains bandwidth.",
    baseHp: 2800,
    minLevel: 5,
    phases: 4,
    icon: skill("Tunnel"),
    accent: "#b280ff",
    rewards: {
      coinsPerPhase: 280,
      xpPerPhase: 220,
      defeatCoins: 1400,
      defeatXp: 1100,
      drops: ["care-food-stew", "care-toy-ball", "care-soap-basic"],
    },
  },
  {
    id: "bandwidth-leviathan",
    name: "Bandwidth Leviathan",
    title: "Devourer of Flows",
    description: "An immense presence that swallows packet rivers whole. Brings high-bandwidth peers.",
    baseHp: 12000,
    minLevel: 10,
    phases: 5,
    icon: skill("Lightning"),
    accent: "#ffb24d",
    rewards: {
      coinsPerPhase: 800,
      xpPerPhase: 700,
      defeatCoins: 4500,
      defeatXp: 3800,
      drops: ["care-toy-plush", "care-soap-bubble", "care-food-stew"],
    },
  },
  {
    id: "storm-of-static",
    name: "Storm of Static",
    title: "Born of Failed Handshakes",
    description: "A roiling tempest of corrupted NTCP2 negotiations. Grows with every dropped peer.",
    baseHp: 55000,
    minLevel: 15,
    phases: 5,
    icon: skill("Burst"),
    accent: "#ff6fae",
    rewards: {
      coinsPerPhase: 2200,
      xpPerPhase: 1900,
      defeatCoins: 12000,
      defeatXp: 10500,
      drops: ["care-toy-plush", "care-soap-bubble", "care-food-feast"],
    },
  },
  {
    id: "ancient-router",
    name: "Ancient Router",
    title: "Older Than The Network",
    description: "A relic node from before the Distributed NetDB. Routes through forgotten peers.",
    baseHp: 280000,
    minLevel: 25,
    phases: 6,
    icon: skill("Crown"),
    accent: "#f0df62",
    rewards: {
      coinsPerPhase: 6000,
      xpPerPhase: 5200,
      defeatCoins: 35000,
      defeatXp: 30000,
      drops: ["care-food-feast", "care-toy-bell", "care-soap-bubble"],
    },
  },
  {
    id: "null-route",
    name: "The Null Route",
    title: "Endgame Threat",
    description: "The abyss where unroutable packets go. Its existence threatens the entire network.",
    baseHp: 1_500_000,
    minLevel: 40,
    phases: 6,
    icon: skill("Portal"),
    accent: "#7a5aff",
    rewards: {
      coinsPerPhase: 25000,
      xpPerPhase: 22000,
      defeatCoins: 150000,
      defeatXp: 130000,
      drops: ["care-food-feast", "care-toy-bell", "care-soap-bubble"],
    },
  },
];

const BOSS_BY_ID = new Map(BOSSES.map((b) => [b.id, b] as const));

export function getBoss(id: string | undefined): Boss | undefined {
  return id ? BOSS_BY_ID.get(id) : undefined;
}

// --- Save state ------------------------------------------------------------

export interface BossProgress {
  currentHp: number;
  maxHp: number;
  lastAttackAt: number;
  /** Highest phase reached (0..phases). */
  phasesCleared: number;
  kills: number;
  unlocked: boolean;
}

export type BossSave = Record<string, BossProgress>;

export function createBossSave(): BossSave {
  const save: BossSave = {};
  for (const boss of BOSSES) {
    save[boss.id] = {
      currentHp: boss.baseHp,
      maxHp: boss.baseHp,
      lastAttackAt: 0,
      phasesCleared: 0,
      kills: 0,
      unlocked: boss.id === BOSSES[0].id,
    };
  }
  return save;
}

export function sanitizeBossSave(value: Partial<BossSave> | undefined | null): BossSave {
  const base = createBossSave();
  if (!value) return base;
  for (const boss of BOSSES) {
    const incoming = value[boss.id];
    if (!incoming || typeof incoming !== "object") continue;
    const maxHp = boss.baseHp;
    const currentHp = Math.max(0, Math.min(maxHp, Number(incoming.currentHp) || maxHp));
    const phasesCleared = Math.max(0, Math.min(boss.phases, Math.floor(Number(incoming.phasesCleared) || 0)));
    const kills = Math.max(0, Math.floor(Number(incoming.kills) || 0));
    base[boss.id] = {
      currentHp,
      maxHp,
      lastAttackAt: typeof incoming.lastAttackAt === "number" ? incoming.lastAttackAt : 0,
      phasesCleared,
      kills,
      unlocked: Boolean(incoming.unlocked) || boss.id === BOSSES[0].id || kills > 0,
    };
  }
  return base;
}

/** After defeat, restore HP to max but keep kill count and unlocked state. */
export function reviveBoss(boss: Boss, prev: BossProgress, ngPlusKills: number): BossProgress {
  const ngFactor = 1 + Math.min(2, ngPlusKills * 0.15);
  return {
    ...prev,
    currentHp: Math.round(boss.baseHp * ngFactor),
    maxHp: Math.round(boss.baseHp * ngFactor),
    phasesCleared: 0,
    lastAttackAt: 0,
  };
}

// --- Damage ----------------------------------------------------------------

export const ATTACK_COOLDOWN_MS = 3000;

export interface DamageContext {
  level: number;
  gearScore: number;
  evolutionPath: EvolutionPath | null;
  metrics: RouterMetrics;
  source: "live" | "disconnected";
}

export function clickDamage(ctx: DamageContext): number {
  let dmg = 10 + ctx.level * 3 + Math.floor(ctx.gearScore * 0.5);
  if (ctx.evolutionPath === "ranger") dmg = Math.floor(dmg * 1.2);
  else if (ctx.evolutionPath === "guardian") dmg = Math.floor(dmg * 1.1);
  else if (ctx.evolutionPath === "sorcerer") dmg = Math.floor(dmg * 1.05);
  return Math.max(1, Math.floor(dmg * networkSupportMultiplier(ctx)));
}

export function itemDamage(item: CareItem, ctx: DamageContext): number {
  return Math.max(5, Math.floor((item.cost * 0.5) * networkSupportMultiplier(ctx)));
}

/** Per poll-tick damage while the router is live. */
export function routerTickDamage(ctx: DamageContext): number {
  if (ctx.source !== "live") return 0;
  const base = ctx.metrics.participatingTunnels * 0.4 + ctx.metrics.knownPeers * 0.05;
  return Math.max(0, Math.floor(base * networkSupportMultiplier(ctx)));
}

/** 1.0..1.5 — rises with peers and tunnels, capped at +50%. */
export function networkSupportMultiplier(ctx: Pick<DamageContext, "metrics" | "source">): number {
  if (ctx.source !== "live") return 1;
  const bonus = Math.min(0.5, ctx.metrics.knownPeers * 0.005 + ctx.metrics.participatingTunnels * 0.01);
  return 1 + bonus;
}

export function networkSupportPct(ctx: Pick<DamageContext, "metrics" | "source">): number {
  return Math.round((networkSupportMultiplier(ctx) - 1) * 100);
}

// --- Phases / rewards ------------------------------------------------------

export function phaseThreshold(boss: Boss, phase: number): number {
  if (phase >= boss.phases) return 0;
  const hpPerPhase = boss.baseHp / boss.phases;
  return Math.round(boss.baseHp - hpPerPhase * phase);
}

export function currentPhase(boss: Boss, progress: BossProgress): number {
  const fraction = progress.currentHp / progress.maxHp;
  const phasesDealt = Math.floor((1 - fraction) * boss.phases);
  return Math.min(boss.phases, Math.max(0, phasesDealt));
}

export interface BossRewardResult {
  coins: number;
  xp: number;
  drops: string[];
  phase: number;
  defeated: boolean;
}

/** Compute rewards for crossing into the given phase (or defeat at phase == boss.phases). */
export function rewardsForPhase(boss: Boss, phase: number, defeat: boolean): BossRewardResult {
  if (defeat) {
    return {
      coins: boss.rewards.defeatCoins,
      xp: boss.rewards.defeatXp,
      drops: boss.rewards.drops ?? [],
      phase,
      defeated: true,
    };
  }
  return {
    coins: boss.rewards.coinsPerPhase,
    xp: boss.rewards.xpPerPhase,
    drops: [],
    phase,
    defeated: false,
  };
}

export function formatHp(hp: number): string {
  if (hp >= 1_000_000) return `${(hp / 1_000_000).toFixed(2)}M`;
  if (hp >= 10_000) return `${(hp / 1000).toFixed(1)}k`;
  return Math.floor(hp).toLocaleString("en-US");
}
