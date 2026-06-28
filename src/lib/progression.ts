import { itemSprites } from "../data";
import { getPet, suggestPetIds } from "./pets";
import { healthScore, type DataSource, type RouterMetrics } from "./observatory";
import { EMPTY_BONUSES, type SkillBonuses } from "./skills";
import type { GearEffects } from "./economy";

export interface CreatureSave {
  id: string; // matches a creatureSprites name, lowercased
  name: string;
  createdAt: number;
  evolutionPath?: EvolutionPath | null;
}

export interface ProgressSave {
  totalXp: number;
  sharedBytes: number;
  lastTickAt: number;
}

export const INITIAL_PROGRESS: ProgressSave = { totalXp: 0, sharedBytes: 0, lastTickAt: Date.now() };

// --- Creatures ------------------------------------------------------------

export function creatureId(name: string): string {
  return name.toLowerCase();
}

export function spriteForCreature(id: string): string {
  return getPet(id).sprite;
}

export function displayCreatureName(id: string): string {
  return getPet(id).name;
}

export function personality(id: string): string {
  return getPet(id).trait;
}

export function affinity(id: string): string {
  return getPet(id).affinity;
}

export function filterForCreature(id: string): string {
  return getPet(id).filter;
}

/** Pick `count` random creature ids to suggest during onboarding. */
export function suggestCreatures(count = 3, exclude: string[] = []): string[] {
  return suggestPetIds(count, exclude);
}

// --- Level curve ----------------------------------------------------------

const XP_BASE = 100;
const XP_EXP = 2.5;

/** Cumulative XP required to *reach* a given level (level 0 = 0 XP). */
export function xpForLevel(level: number): number {
  if (level <= 0) return 0;
  return Math.round(XP_BASE * Math.pow(level, XP_EXP));
}

export function levelForXp(totalXp: number): number {
  if (totalXp <= 0) return 0;
  let level = Math.floor(Math.pow(totalXp / XP_BASE, 1 / XP_EXP));
  while (xpForLevel(level + 1) <= totalXp) level += 1;
  while (level > 0 && xpForLevel(level) > totalXp) level -= 1;
  return level;
}

// --- Evolution stages -----------------------------------------------------

export interface Stage {
  index: number;
  name: string;
  /** Visual scale of the hero sprite. */
  scale: number;
  /** Glow intensity 0..1. */
  glow: number;
  /** Optional cosmetic overlay sprite unlocked at this stage. */
  cosmetic?: string;
  minLevel: number;
}

function item(name: string): string {
  const match = itemSprites.find((i) => i.name === name);
  return (match ?? itemSprites[0]).src;
}

export type EvolutionPath = "guardian" | "sorcerer" | "ranger";

export interface EvolutionPathInfo {
  id: EvolutionPath;
  name: string;
  blurb: string;
  stageNames: [string, string, string, string, string];
  cosmetics: (string | undefined)[];
  bonus: {
    energyFloorBonus?: number;
    xpBonus?: number;
    coinBonus?: number;
  };
  bonusLabel: string;
  accent: string;
  icon: string;
}

export const EVOLUTION_PATHS: Record<EvolutionPath, EvolutionPathInfo> = {
  guardian: {
    id: "guardian",
    name: "Guardian",
    blurb: "Stalwart defender of the local relay. Sturdy, dependable.",
    stageNames: ["Hatchling", "Juvenile", "Adept", "Guardian", "Ancient"],
    cosmetics: [undefined, undefined, item("Orb"), item("Hat"), item("Crown")],
    bonus: { energyFloorBonus: 3 },
    bonusLabel: "+3 Energy Floor",
    accent: "#43dd85",
    icon: item("Shield"),
  },
  sorcerer: {
    id: "sorcerer",
    name: "Sorcerer",
    blurb: "Channeler of network resonance. Learns faster, glows brighter.",
    stageNames: ["Hatchling", "Juvenile", "Initiate", "Sorcerer", "Archmage"],
    cosmetics: [undefined, undefined, item("Shard"), item("Crystal"), item("Crown")],
    bonus: { xpBonus: 0.05 },
    bonusLabel: "+5% XP",
    accent: "#b280ff",
    icon: item("Portal"),
  },
  ranger: {
    id: "ranger",
    name: "Ranger",
    blurb: "Swift scout of distant peers. Lucky with coin and quick to find.",
    stageNames: ["Hatchling", "Juvenile", "Scout", "Ranger", "Pathfinder"],
    cosmetics: [undefined, undefined, item("Sprout"), item("Cap"), item("Lens")],
    bonus: { coinBonus: 0.1 },
    bonusLabel: "+10% Coins",
    accent: "#ffb24d",
    icon: item("Relay"),
  },
};

const EVOLUTION_CHOICE_LEVEL = 15;

const BASE_STAGE_DATA = [
  { index: 0, scale: 0.82, glow: 0.3, minLevel: 0 },
  { index: 1, scale: 0.92, glow: 0.5, minLevel: 5 },
  { index: 2, scale: 1.0, glow: 0.72, minLevel: EVOLUTION_CHOICE_LEVEL },
  { index: 3, scale: 1.08, glow: 0.86, minLevel: 30 },
  { index: 4, scale: 1.16, glow: 1, minLevel: 50 },
];

function stageForIndex(index: number, path: EvolutionPath | null | undefined): Stage {
  const base = BASE_STAGE_DATA[index];
  const resolvedPath = path ?? "guardian";
  const meta = EVOLUTION_PATHS[resolvedPath];
  return {
    ...base,
    name: meta.stageNames[index],
    cosmetic: meta.cosmetics[index],
  };
}

export function stageForLevel(level: number, path: EvolutionPath | null | undefined = null): Stage {
  let idx = 0;
  for (let i = 0; i < BASE_STAGE_DATA.length; i++) {
    if (level >= BASE_STAGE_DATA[i].minLevel) idx = i;
  }
  return stageForIndex(idx, path);
}

export function unlockedCosmetics(level: number, path: EvolutionPath | null | undefined = null): string[] {
  const reached = stageForLevel(level, path).index;
  const cosmetics = EVOLUTION_PATHS[path ?? "guardian"].cosmetics;
  return cosmetics.slice(0, reached + 1).filter((c): c is string => Boolean(c));
}

export function needsEvolutionChoice(level: number, path: EvolutionPath | null | undefined): boolean {
  return level >= EVOLUTION_CHOICE_LEVEL && path == null;
}

const TITLES: { minLevel: number; title: string }[] = [
  { minLevel: 50, title: "Ancient Relay" },
  { minLevel: 35, title: "Relay Warden" },
  { minLevel: 20, title: "Tunnel Keeper" },
  { minLevel: 10, title: "Tunnel Scout" },
  { minLevel: 5, title: "Sprout Relay" },
  { minLevel: 0, title: "Hatchling" },
];

export function titleForLevel(level: number): string {
  return (TITLES.find((t) => level >= t.minLevel) ?? TITLES[TITLES.length - 1]).title;
}

// --- Live, router-derived stats ------------------------------------------

export function energyFor(metrics: RouterMetrics, energyFloorBonus = 0): number {
  const sharedMBps = (metrics.inboundBps + metrics.outboundBps) / (1024 * 1024);
  return Math.max(5 + energyFloorBonus, Math.min(100, Math.round(25 + sharedMBps * 35)));
}

export function moodFor(metrics: RouterMetrics, source: DataSource, moodBiasBonus = 0, moodFloor: string | null = null): string {
  if (source !== "live") return "Resting";
  const score = healthScore(metrics).total + moodBiasBonus * 10;
  let result: string;
  if (score >= 80) result = "Happy";
  else if (score >= 60) result = "Content";
  else if (score >= 40) result = "Calm";
  else result = "Sleepy";
  if (moodFloor) {
    const order = ["Sleepy", "Calm", "Content", "Happy"];
    const floorIdx = order.indexOf(moodFloor);
    const resultIdx = order.indexOf(result);
    if (floorIdx >= 0 && resultIdx >= 0 && resultIdx < floorIdx) result = moodFloor;
  }
  return result;
}

// --- XP accrual -----------------------------------------------------------

/**
 * Accrue XP and shared-data from real contribution. Only meaningful for live
 * data — callers must skip this when `source !== "live"` so disconnected
 * sessions never inflate real progress. `deltaSeconds` is capped to avoid huge jumps after
 * the tab/router was asleep.
 *
 * `careXpMultiplier` is the pet-care XP multiplier from the Tamagotchi system
 * (see `src/lib/care.ts::deriveCareBonuses`) — a neglected pet earns less, a
 * thriving pet earns more.
 */
export function accrue(
  progress: ProgressSave,
  metrics: RouterMetrics,
  deltaSeconds: number,
  pollSeconds: number,
  skillBonuses?: SkillBonuses,
  gearEffects?: GearEffects,
  careXpMultiplier: number = 1,
): ProgressSave {
  const dt = Math.max(0, Math.min(deltaSeconds, pollSeconds * 2));
  const mult = (skillBonuses?.dataSharedMultiplier ?? 1) * (gearEffects?.dataMultiplier ?? 1);
  const sharedBps = (metrics.inboundBps + metrics.outboundBps) * mult;
  const sharedMBps = sharedBps / (1024 * 1024);
  const xpRate =
    (metrics.participatingTunnels * 0.2 + sharedMBps * 5 + 0.5)
    * (skillBonuses?.xpMultiplier ?? 1)
    * (gearEffects?.xpMultiplier ?? 1)
    * careXpMultiplier;
  let totalXp = progress.totalXp + xpRate * dt;
  if (skillBonuses?.dataSharedGrantsXp) totalXp += sharedMBps * dt; // conduit keystone: 1 XP per MB shared
  return {
    totalXp,
    sharedBytes: progress.sharedBytes + sharedBps * dt,
    lastTickAt: Date.now(),
  };
}

// --- Derived view model ---------------------------------------------------

export interface Progression {
  level: number;
  title: string;
  stage: Stage;
  totalXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  xpPct: number;
  energy: number;
  mood: string;
  personality: string;
  affinity: string;
  dataSharedGB: number;
}

export function derive(
  creature: CreatureSave,
  progress: ProgressSave,
  metrics: RouterMetrics,
  source: DataSource,
  skillBonuses?: SkillBonuses,
  gearEffects?: GearEffects,
  careMoodBias: number = 0,
): Progression {
  const bonuses = skillBonuses ?? EMPTY_BONUSES;
  const totalXp = Math.floor(progress.totalXp);
  const level = levelForXp(totalXp);
  const base = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const xpIntoLevel = totalXp - base;
  const xpForNextLevel = Math.max(1, next - base);
  return {
    level,
    title: titleForLevel(level),
    stage: stageForLevel(level, creature.evolutionPath),
    totalXp,
    xpIntoLevel,
    xpForNextLevel,
    xpPct: Math.max(0, Math.min(1, xpIntoLevel / xpForNextLevel)),
    energy: energyFor(metrics, bonuses.energyFloorBonus + (gearEffects?.energyBonus ?? 0)),
    mood: moodFor(metrics, source, bonuses.moodBiasBonus + careMoodBias, bonuses.moodFloor),
    personality: personality(creature.id),
    affinity: affinity(creature.id),
    dataSharedGB: progress.sharedBytes / (1024 * 1024 * 1024),
  };
}
