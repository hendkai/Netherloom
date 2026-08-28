/**
 * Central persistence layer for Netherloom's structured saves.
 *
 * All structured game-state reads/writes go through {@link loadVersioned} /
 * {@link saveVersioned} from `../lib/saveMigration`, which stamp every payload
 * with a schema version so future releases can migrate instead of dropping
 * progress. Simple string flags (lastSeen, guideSeen, activeBoss) stay plain —
 * they are not structured game state.
 *
 * Every loader sanitizes through its domain module's existing validator, so a
 * corrupt or half-written payload degrades to defaults, never to a crash.
 */

import {
  appendActivity,
  createActivityLog,
  sanitizeActivityLog,
  type ActivityLog,
} from "../lib/activityLog";
import {
  createBossSave,
  BOSSES,
  sanitizeBossSave,
  type BossSave,
} from "../lib/bosses";
import { sanitizeCareStats, type CareStats } from "../lib/care";
import {
  createEconomy,
  sanitizeEconomy,
  type EconomySave,
} from "../lib/economy";
import {
  createEepsiteSave,
  EEPSITES,
  eepsiteProgress,
  getEepsite,
  sanitizeEepsiteSave,
  type ActiveEepsite,
  type EepsiteSave,
} from "../lib/eepsites";
import {
  createExpeditionSave,
  sanitizeExpeditionSave,
  type ExpeditionSave,
} from "../lib/expeditions";
import { emoteSprites } from "../data";
import {
  displayCreatureName,
  EVOLUTION_PATHS,
  INITIAL_PROGRESS,
  type CreatureSave,
  type EvolutionPath,
  type ProgressSave,
} from "../lib/progression";
import { getPet } from "../lib/pets";
import {
  createQuestState,
  rolloverQuests,
  type QuestBaseline,
  type QuestState,
} from "../lib/quests";
import type { RouterEvent } from "../lib/routerEvents";
import {
  CURRENT_SAVE_VERSION,
  loadVersioned,
  saveVersioned,
} from "../lib/saveMigration";
import { slotKey } from "../lib/saves";

export { CURRENT_SAVE_VERSION };

// --- Storage keys -----------------------------------------------------------

export const SETTINGS_KEY = "netherloom.settings"; // device-level, shared across save slots
export const NAME_KEY = slotKey("creatureName");
export const CREATURE_KEY = slotKey("creature");
export const PROGRESS_KEY = slotKey("progress");
export const ROUTER_EVENTS_KEY = slotKey("routerEvents");
export const SKILLS_KEY = slotKey("skills");
export const ACHIEVEMENTS_KEY = slotKey("achievements");
export const ECONOMY_KEY = slotKey("economy");
export const QUESTS_KEY = slotKey("quests");
export const CARE_KEY = slotKey("care");
export const EXPED_KEY = slotKey("expeditions");
export const BOSS_KEY = slotKey("bosses");
export const ACTIVE_BOSS_KEY = slotKey("activeBoss");
export const EEPSITE_KEY = slotKey("eepsites");
export const ACTIVITY_KEY = slotKey("activity");
export const LAST_SEEN_KEY = slotKey("lastSeen");
export const AUTO_CARE_KEY = slotKey("autoCare");
export const GUIDE_SEEN_KEY = slotKey("guideSeen");

export const MAX_ROUTER_EVENTS = 50;
export const REACTION_SRC = new Map(emoteSprites.map((emote) => [emote.name, emote.src]));

// --- Settings (device-level) --------------------------------------------------

export type Mode = "Living" | "Technical";
export type Theme = "Dark" | "Light";

export interface Settings {
  password: string;
  pollSeconds: number;
  defaultMode: Mode;
  theme: Theme;
}

export const DEFAULT_SETTINGS: Settings = {
  password: "itoopie", // prefill only — set your real password at http://127.0.0.1:7657/jsonrpc/ (itoopie until changed)
  pollSeconds: 5,
  defaultMode: "Living",
  theme: "Dark",
};

function sanitizeSettings(parsed: unknown): Settings {
  const raw = (parsed ?? {}) as Partial<Settings>;
  return {
    password: typeof raw.password === "string" ? raw.password : DEFAULT_SETTINGS.password,
    pollSeconds:
      typeof raw.pollSeconds === "number" && raw.pollSeconds >= 1
        ? raw.pollSeconds
        : DEFAULT_SETTINGS.pollSeconds,
    defaultMode: raw.defaultMode === "Technical" ? "Technical" : "Living",
    theme: raw.theme === "Light" ? "Light" : "Dark",
  };
}

export function loadSettings(): Settings {
  return loadVersioned(SETTINGS_KEY, sanitizeSettings, DEFAULT_SETTINGS);
}

export function saveSettings(settings: Settings) {
  saveVersioned(SETTINGS_KEY, settings);
}

// --- Creature ----------------------------------------------------------------

function sanitizeCreature(parsed: unknown): CreatureSave | null {
  const raw = parsed as Partial<CreatureSave> | null;
  if (!raw || typeof raw !== "object" || !raw.id) return null;
  return {
    id: raw.id,
    name: typeof raw.name === "string" && raw.name ? raw.name : displayCreatureName(raw.id),
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : Date.now(),
    // Fix while migrating saves here: the old inline loader silently dropped
    // the chosen evolution path, resetting the pet after every reload.
    evolutionPath:
      raw.evolutionPath != null && raw.evolutionPath in EVOLUTION_PATHS
        ? (raw.evolutionPath as EvolutionPath)
        : null,
  };
}

export function loadCreature(): CreatureSave | null {
  return loadVersioned<CreatureSave | null>(CREATURE_KEY, sanitizeCreature, null);
}

export function persistCreature(creature: CreatureSave) {
  saveVersioned(CREATURE_KEY, creature);
  try {
    localStorage.setItem(NAME_KEY, creature.name); // backward-compat
  } catch {
    /* ignore storage errors */
  }
}

// --- Progress ------------------------------------------------------------------

function sanitizeProgress(parsed: unknown): ProgressSave {
  const raw = (parsed ?? {}) as Partial<ProgressSave>;
  return {
    totalXp: Number(raw.totalXp) || 0,
    sharedBytes: Number(raw.sharedBytes) || 0,
    lastTickAt: Date.now(),
  };
}

export function loadProgress(): ProgressSave {
  return loadVersioned<ProgressSave>(PROGRESS_KEY, sanitizeProgress, {
    ...INITIAL_PROGRESS,
    lastTickAt: Date.now(),
  });
}

export function persistProgress(progress: ProgressSave) {
  saveVersioned(PROGRESS_KEY, progress);
}

// --- Skills / achievements -----------------------------------------------------

export interface SkillsSave {
  unlocked: string[];
  pointsEarned: number;
}

export const EMPTY_SKILLS: SkillsSave = { unlocked: [], pointsEarned: 0 };

function sanitizeSkills(parsed: unknown): SkillsSave {
  const raw = (parsed ?? {}) as Partial<SkillsSave>;
  return {
    unlocked: Array.isArray(raw.unlocked)
      ? raw.unlocked.filter((x): x is string => typeof x === "string")
      : [],
    pointsEarned: Number(raw.pointsEarned) || 0,
  };
}

export function loadSkills(): SkillsSave {
  return loadVersioned<SkillsSave>(SKILLS_KEY, sanitizeSkills, EMPTY_SKILLS);
}

export function persistSkills(skills: SkillsSave) {
  saveVersioned(SKILLS_KEY, skills);
}

function sanitizeAchievements(parsed: unknown): string[] {
  const raw = (parsed ?? {}) as { unlocked?: unknown };
  return Array.isArray(raw.unlocked)
    ? raw.unlocked.filter((x): x is string => typeof x === "string")
    : [];
}

export function loadAchievements(): string[] {
  return loadVersioned<string[]>(ACHIEVEMENTS_KEY, sanitizeAchievements, []);
}

export function persistAchievements(unlocked: string[]) {
  saveVersioned(ACHIEVEMENTS_KEY, { unlocked });
}

// --- Economy ---------------------------------------------------------------------

export function loadEconomy(): EconomySave {
  const currentPet = loadCreature()?.id;
  return loadVersioned<EconomySave>(
    ECONOMY_KEY,
    (parsed) => sanitizeEconomy((parsed ?? {}) as Partial<EconomySave>, currentPet),
    createEconomy(currentPet),
  );
}

export function persistEconomy(economy: EconomySave) {
  saveVersioned(ECONOMY_KEY, economy);
}

// --- Quests ------------------------------------------------------------------------

function sanitizeQuests(parsed: unknown): QuestState | null {
  const raw = parsed as Partial<QuestState> | null;
  if (!raw || !raw.dayKey || !raw.weekKey || !raw.dailyBaseline || !raw.weeklyBaseline) return null;
  return {
    dayKey: raw.dayKey,
    weekKey: raw.weekKey,
    dailyBaseline: raw.dailyBaseline,
    weeklyBaseline: raw.weeklyBaseline,
    claimed: Array.isArray(raw.claimed) ? raw.claimed.filter((x): x is string => typeof x === "string") : [],
  };
}

export function loadQuests(): QuestState | null {
  return loadVersioned<QuestState | null>(QUESTS_KEY, sanitizeQuests, null);
}

export function persistQuests(state: QuestState) {
  saveVersioned(QUESTS_KEY, state);
}

// --- Care -------------------------------------------------------------------------

function sanitizeCarePets(parsed: unknown): Record<string, CareStats> {
  const raw = (parsed ?? {}) as { pets?: Record<string, Partial<CareStats>> };
  const pets = raw.pets && typeof raw.pets === "object" ? raw.pets : {};
  const result: Record<string, CareStats> = {};
  for (const [petId, stats] of Object.entries(pets)) {
    if (typeof petId !== "string") continue;
    result[petId] = sanitizeCareStats(stats);
  }
  return result;
}

export function loadCare(): Record<string, CareStats> {
  return loadVersioned<Record<string, CareStats>>(CARE_KEY, sanitizeCarePets, {});
}

export function persistCare(careByPet: Record<string, CareStats>) {
  saveVersioned(CARE_KEY, { pets: careByPet });
}

// --- Expeditions ---------------------------------------------------------------------

function sanitizeExpeditionPets(parsed: unknown): Record<string, ExpeditionSave> {
  const raw = (parsed ?? {}) as { pets?: Record<string, Partial<ExpeditionSave>> };
  const pets = raw.pets && typeof raw.pets === "object" ? raw.pets : {};
  const result: Record<string, ExpeditionSave> = {};
  for (const [petId, save] of Object.entries(pets)) {
    if (typeof petId !== "string") continue;
    result[petId] = sanitizeExpeditionSave(save);
  }
  return result;
}

export function loadExpeditions(): Record<string, ExpeditionSave> {
  return loadVersioned<Record<string, ExpeditionSave>>(EXPED_KEY, sanitizeExpeditionPets, {});
}

export function persistExpeditions(byPet: Record<string, ExpeditionSave>) {
  saveVersioned(EXPED_KEY, { pets: byPet });
}

// --- Bosses ---------------------------------------------------------------------------

export function loadBossSave(): BossSave {
  return loadVersioned<BossSave>(
    BOSS_KEY,
    (parsed) => sanitizeBossSave((parsed ?? {}) as Partial<BossSave>),
    createBossSave(),
  );
}

export function persistBossSave(save: BossSave) {
  saveVersioned(BOSS_KEY, save);
}

export function loadActiveBossId(save: BossSave): string {
  try {
    const stored = localStorage.getItem(ACTIVE_BOSS_KEY);
    if (stored && save[stored]?.unlocked) return stored;
  } catch {
    /* ignore storage errors */
  }
  const firstUnlocked = BOSSES.find((b) => save[b.id]?.unlocked);
  return firstUnlocked?.id ?? BOSSES[0].id;
}

export function persistActiveBossId(bossId: string) {
  try {
    localStorage.setItem(ACTIVE_BOSS_KEY, bossId);
  } catch {
    /* ignore storage errors */
  }
}

// --- Eepsites -----------------------------------------------------------------------

function sanitizeEepsitePets(parsed: unknown): Record<string, EepsiteSave> {
  const raw = (parsed ?? {}) as { pets?: Record<string, Partial<EepsiteSave>> };
  const pets = raw.pets && typeof raw.pets === "object" ? raw.pets : {};
  const result: Record<string, EepsiteSave> = {};
  for (const [petId, save] of Object.entries(pets)) {
    if (typeof petId !== "string") continue;
    result[petId] = sanitizeEepsiteSave(save);
  }
  return result;
}

export function loadEepsites(): Record<string, EepsiteSave> {
  return loadVersioned<Record<string, EepsiteSave>>(EEPSITE_KEY, sanitizeEepsitePets, {});
}

export function persistEepsites(byPet: Record<string, EepsiteSave>) {
  saveVersioned(EEPSITE_KEY, { pets: byPet });
}

export {
  createEepsiteSave,
  EEPSITES,
  eepsiteProgress,
  getEepsite,
  type ActiveEepsite,
  type EepsiteSave,
};

// --- Activity log ----------------------------------------------------------------------

export function loadActivityLog(): ActivityLog {
  return loadVersioned<ActivityLog>(
    ACTIVITY_KEY,
    (parsed) => sanitizeActivityLog(parsed),
    createActivityLog(),
  );
}

export function persistActivityLog(log: ActivityLog) {
  saveVersioned(ACTIVITY_KEY, log);
}

export { appendActivity };

// --- Auto care ---------------------------------------------------------------------------

export interface AutoCareSettings {
  enabled: boolean;
  feedThreshold: number;
  cleanThreshold: number;
  playThreshold: number;
}

export const DEFAULT_AUTO_CARE: AutoCareSettings = {
  enabled: false,
  feedThreshold: 25,
  cleanThreshold: 25,
  playThreshold: 25,
};

function sanitizeAutoCare(parsed: unknown): AutoCareSettings {
  const raw = (parsed ?? {}) as Partial<AutoCareSettings>;
  return {
    enabled: raw.enabled === true,
    feedThreshold: Math.max(0, Math.min(80, Number(raw.feedThreshold) || DEFAULT_AUTO_CARE.feedThreshold)),
    cleanThreshold: Math.max(0, Math.min(80, Number(raw.cleanThreshold) || DEFAULT_AUTO_CARE.cleanThreshold)),
    playThreshold: Math.max(0, Math.min(80, Number(raw.playThreshold) || DEFAULT_AUTO_CARE.playThreshold)),
  };
}

export function loadAutoCare(): AutoCareSettings {
  return loadVersioned<AutoCareSettings>(AUTO_CARE_KEY, sanitizeAutoCare, DEFAULT_AUTO_CARE);
}

export function persistAutoCare(settings: AutoCareSettings) {
  saveVersioned(AUTO_CARE_KEY, settings);
}

// --- Router events -------------------------------------------------------------------------

function sanitizeRouterEvents(parsed: unknown): RouterEvent[] {
  const list = Array.isArray(parsed) ? (parsed as Partial<RouterEvent>[]) : [];
  return list.flatMap((event) => {
    if (
      typeof event?.id !== "string"
      || typeof event.timestamp !== "number"
      || typeof event.kind !== "string"
      || typeof event.severity !== "string"
      || typeof event.title !== "string"
      || typeof event.detail !== "string"
      || typeof event.reaction !== "string"
    ) {
      return [];
    }
    const reactionSrc = REACTION_SRC.get(event.reaction);
    return reactionSrc ? [{ ...event, reactionSrc } as RouterEvent] : [];
  }).slice(0, MAX_ROUTER_EVENTS);
}

export function loadRouterEvents(): RouterEvent[] {
  return loadVersioned<RouterEvent[]>(ROUTER_EVENTS_KEY, sanitizeRouterEvents, []);
}

export function persistRouterEvents(events: RouterEvent[]) {
  const stored = events.map(({ reactionSrc: _reactionSrc, ...event }) => event);
  saveVersioned(ROUTER_EVENTS_KEY, stored);
}

// --- Simple flags (not structured saves) -----------------------------------------------------

export function readLastSeen(): number {
  try {
    const raw = localStorage.getItem(LAST_SEEN_KEY);
    return raw ? Number(raw) || Date.now() : Date.now();
  } catch {
    return Date.now();
  }
}

export function writeLastSeen(at: number = Date.now()) {
  try {
    localStorage.setItem(LAST_SEEN_KEY, String(at));
  } catch {
    /* ignore storage errors */
  }
}

export function readGuideSeen(): boolean {
  try {
    return localStorage.getItem(GUIDE_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeGuideSeen() {
  try {
    localStorage.setItem(GUIDE_SEEN_KEY, "1");
  } catch {
    /* ignore storage errors */
  }
}

// re-exported quest helpers so the provider has a single persistence import
export {
  createQuestState,
  rolloverQuests,
  type QuestBaseline,
  type QuestState,
};
