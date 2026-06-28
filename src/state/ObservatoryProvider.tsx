import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  EMPTY_METRICS,
  fetchMetrics,
  type DataSource,
  type RouterMetrics,
} from "../lib/observatory";
import { fetchPeers, type PeerCreature } from "../lib/peers";
import { slotKey } from "../lib/saves";
import {
  createQuestState,
  deriveQuests,
  rolloverQuests,
  type QuestBaseline,
  type QuestContext,
  type QuestInstance,
  type QuestState,
} from "../lib/quests";
import {
  accrue,
  derive,
  displayCreatureName,
  filterForCreature,
  INITIAL_PROGRESS,
  levelForXp,
  spriteForCreature,
  type CreatureSave,
  type Progression,
  type ProgressSave,
} from "../lib/progression";
import {
  canUnlock,
  computeSkillBonuses,
  SKILL_TREE,
  type SkillBonuses,
} from "../lib/skills";
import {
  achievementReward,
  getAchievement,
  newlyUnlocked,
  type Achievement,
} from "../lib/achievements";
import {
  createEconomy,
  equipmentBonuses,
  GEAR_SLOTS,
  gearScore,
  getGearItem,
  loadoutFor,
  sanitizeEconomy,
  sellValue,
  upgradeCost,
  upgradeLevelOf,
  UPGRADE_MAX,
  type EconomySave,
  type GearItem,
  type GearSlot,
} from "../lib/economy";
import { getPet, isCatalogPet } from "../lib/pets";
import {
  applyCareAction,
  CARE_ITEMS,
  createCareStats,
  decay as decayCareStats,
  deriveCareBonuses,
  getCareItem,
  sanitizeCareStats,
  type CareActionId,
  type CareItem,
  type CareStats,
} from "../lib/care";
import {
  createExpeditionSave,
  EXPEDITIONS,
  expeditionProgress,
  getExpedition,
  rushCost,
  rollExpeditionRewards,
  sanitizeExpeditionSave,
  type ActiveExpedition,
  type Expedition,
  type ExpeditionSave,
} from "../lib/expeditions";
import {
  createEepsiteSave,
  EEPSITES,
  eepsiteForDiscovery,
  eepsiteProgress,
  getEepsite,
  rushCostEepsite,
  rollEepsiteRewards,
  sanitizeEepsiteSave,
  type ActiveEepsite,
  type Eepsite,
  type EepsiteDiscoverySource,
  type EepsiteSave,
} from "../lib/eepsites";
import {
  appendActivity,
  createActivityLog,
  makeActivityId,
  sanitizeActivityLog,
  type ActivityEntry,
  type ActivityLog,
} from "../lib/activityLog";
import {
  ATTACK_COOLDOWN_MS,
  BOSSES,
  clickDamage,
  createBossSave,
  currentPhase,
  getBoss,
  itemDamage,
  rewardsForPhase,
  reviveBoss,
  routerTickDamage,
  sanitizeBossSave,
  type Boss,
  type BossProgress,
  type BossSave,
  type DamageContext,
} from "../lib/bosses";
import {
  EVOLUTION_PATHS,
  needsEvolutionChoice,
  type EvolutionPath,
} from "../lib/progression";
import { emoteSprites } from "../data";
import {
  connectionLostEvent,
  deriveRouterEvents,
  levelUpEvent,
  type RouterEvent,
  type RouterEventDraft,
} from "../lib/routerEvents";

export type ViewId =
  | "Observatory"
  | "Guide"
  | "Traffic"
  | "Peers"
  | "Tunnels"
  | "Health"
  | "Creature"
  | "Collection"
  | "Quests"
  | "Shop"
  | "Skills"
  | "Achievements"
  | "Timeline"
  | "Expeditions"
  | "Eepsites"
  | "Bosses"
  | "Activity"
  | "Settings";

export type Mode = "Living" | "Technical";
export type Theme = "Dark" | "Light";
export type TimeWindow = "1m" | "5m" | "1h";

export interface Settings {
  password: string;
  pollSeconds: number;
  defaultMode: Mode;
  theme: Theme;
}

export interface Series {
  inbound: number[]; // MB/s
  outbound: number[]; // MB/s
  tunnels: number[]; // count
  peers: number[]; // active peers
}

export interface Reaction {
  id: number;
  src: string;
  name: string;
}

export type ConnectionTest =
  | { state: "idle" }
  | { state: "testing" }
  | { state: "ok"; detail: string }
  | { state: "error"; detail: string };

interface ObservatoryContextValue {
  metrics: RouterMetrics;
  source: DataSource;
  pluginAvailable: boolean;
  peerCreatures: PeerCreature[];
  lastUpdated: number;
  history: Series;
  series: Series;
  values: { inbound: number; outbound: number; tunnels: number; peers: number };
  activeView: ViewId;
  mode: Mode;
  theme: Theme;
  timeWindow: TimeWindow;
  zoom: number;
  playback: "Live" | "Replay";
  replayPos: number;
  replayPlaying: boolean;
  creature: CreatureSave | null;
  creatureName: string;
  creatureSprite: string;
  creatureFilter: string;
  progression: Progression | null;
  onboardingNeeded: boolean;
  reactions: Reaction[];
  routerEvents: RouterEvent[];
  notificationsOpen: boolean;
  settings: Settings;
  connectionTest: ConnectionTest;
  setView: (view: ViewId) => void;
  setMode: (mode: Mode) => void;
  setTimeWindow: (window: TimeWindow) => void;
  setZoom: (updater: (z: number) => number) => void;
  setPlayback: (playback: "Live" | "Replay") => void;
  setReplayPos: (pos: number) => void;
  toggleReplayPlaying: () => void;
  renameCreature: (name: string) => void;
  chooseCreature: (id: string, name?: string) => void;
  toggleNotifications: () => void;
  closeNotifications: () => void;
  saveSettings: (settings: Settings) => void;
  testConnection: (password: string) => Promise<void>;
  exportSnapshot: () => void;
  skillBonuses: SkillBonuses;
  skillPointsAvailable: number;
  totalPointsEarned: number;
  unlockedSkills: string[];
  achievements: string[];
  coins: number;
  totalCoinsEarned: number;
  totalCoinsSpent: number;
  inventory: string[];
  upgrades: Record<string, number>;
  loadouts: Record<string, Partial<Record<GearSlot, string>>>;
  equipped: Partial<Record<GearSlot, string>>;
  equippedItems: GearItem[];
  quests: QuestInstance[];
  claimQuest: (instanceId: string) => void;
  gearScore: number;
  ownedPets: string[];
  recentAchievement: Achievement | null;
  unlockSkill: (nodeId: string) => void;
  respecSkills: () => void;
  dismissAchievement: () => void;
  purchaseItem: (itemId: string) => boolean;
  sellItem: (itemId: string) => boolean;
  upgradeItem: (itemId: string) => boolean;
  equipItem: (itemId: string) => boolean;
  unequipSlot: (slot: GearSlot) => void;
  adoptPet: (petId: string) => boolean;
  activatePet: (petId: string) => boolean;
  care: CareStats | null;
  careByPet: Record<string, CareStats>;
  careItems: CareItem[];
  careInventory: string[];
  careBonuses: ReturnType<typeof deriveCareBonuses>;
  performCareAction: (action: CareActionId, itemId?: string) => boolean;
  purchaseCareItem: (itemId: string) => boolean;
  expeditions: Expedition[];
  expeditionsByPet: Record<string, ExpeditionSave>;
  activeExpedition: { expedition: Expedition; active: ActiveExpedition } | null;
  expeditionsCompleted: number;
  startExpedition: (expeditionId: string) => boolean;
  rushExpedition: () => boolean;
  claimExpedition: () => { coins: number; xp: number; careItemId?: string; bonusCoins: number } | null;
  evolutionPath: EvolutionPath | null;
  needsEvolutionChoice: boolean;
  chooseEvolutionPath: (path: EvolutionPath) => boolean;
  eepsites: Eepsite[];
  eepsitesByPet: Record<string, EepsiteSave>;
  activeEepsite: { eepsite: Eepsite; active: ActiveEepsite } | null;
  eepsitesCompleted: number;
  startEepsiteVisit: (eepsiteId: string) => boolean;
  rushEepsiteVisit: () => boolean;
  claimEepsiteVisit: () => { coins: number; xp: number; careItemId?: string; bonusCoins: number } | null;
  bosses: Boss[];
  bossSave: BossSave;
  activeBossId: string;
  activeBoss: { boss: Boss; progress: BossProgress } | null;
  useCareItemOnBoss: (itemId: string) => { damage: number; defeated: boolean; phase: number } | null;
  setActiveBoss: (bossId: string) => void;
  bossAttackReadyAt: number;
  activityLog: ActivityLog;
  pushActivity: (entries: ActivityEntry | ActivityEntry[]) => void;
  clearActivity: () => void;
  offlineSummary: OfflineSummary | null;
  dismissOfflineSummary: () => void;
  autoCare: AutoCareSettings;
  setAutoCare: (next: AutoCareSettings) => void;
  guideSeen: boolean;
  markGuideSeen: () => void;
  guideOpen: boolean;
  setGuideOpen: (open: boolean) => void;
}

const ObservatoryContext = createContext<ObservatoryContextValue | null>(null);

const SETTINGS_KEY = "netherloom.settings"; // device-level, shared across save slots
const NAME_KEY = slotKey("creatureName");
const CREATURE_KEY = slotKey("creature");
const PROGRESS_KEY = slotKey("progress");
const HISTORY_LENGTH = 3600;
const ROUTER_EVENTS_KEY = slotKey("routerEvents");
const MAX_ROUTER_EVENTS = 50;
const REACTION_SRC = new Map(emoteSprites.map((emote) => [emote.name, emote.src]));

const DEFAULT_SETTINGS: Settings = {
  password: "itoopie", // prefill only — set your real password at http://127.0.0.1:7657/jsonrpc/ (itoopie until changed)
  pollSeconds: 5,
  defaultMode: "Living",
  theme: "Dark",
};

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      password: typeof parsed.password === "string" ? parsed.password : DEFAULT_SETTINGS.password,
      pollSeconds:
        typeof parsed.pollSeconds === "number" && parsed.pollSeconds >= 1
          ? parsed.pollSeconds
          : DEFAULT_SETTINGS.pollSeconds,
      defaultMode: parsed.defaultMode === "Technical" ? "Technical" : "Living",
      theme: parsed.theme === "Light" ? "Light" : "Dark",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function loadCreature(): CreatureSave | null {
  try {
    const raw = localStorage.getItem(CREATURE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CreatureSave>;
    if (!parsed.id) return null;
    return {
      id: parsed.id,
      name: typeof parsed.name === "string" && parsed.name ? parsed.name : displayCreatureName(parsed.id),
      createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : Date.now(),
    };
  } catch {
    return null;
  }
}

function loadProgress(): ProgressSave {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return { ...INITIAL_PROGRESS, lastTickAt: Date.now() };
    const parsed = JSON.parse(raw) as Partial<ProgressSave>;
    return {
      totalXp: Number(parsed.totalXp) || 0,
      sharedBytes: Number(parsed.sharedBytes) || 0,
      lastTickAt: Date.now(),
    };
  } catch {
    return { ...INITIAL_PROGRESS, lastTickAt: Date.now() };
  }
}

function persistProgress(progress: ProgressSave) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* ignore storage errors */
  }
}

const SKILLS_KEY = slotKey("skills");
const ACHIEVEMENTS_KEY = slotKey("achievements");
const ECONOMY_KEY = slotKey("economy");
const QUESTS_KEY = slotKey("quests");
const CARE_KEY = slotKey("care");

function loadQuests(): QuestState | null {
  try {
    const raw = localStorage.getItem(QUESTS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuestState>;
    if (!parsed.dayKey || !parsed.weekKey || !parsed.dailyBaseline || !parsed.weeklyBaseline) return null;
    return {
      dayKey: parsed.dayKey,
      weekKey: parsed.weekKey,
      dailyBaseline: parsed.dailyBaseline,
      weeklyBaseline: parsed.weeklyBaseline,
      claimed: Array.isArray(parsed.claimed) ? parsed.claimed.filter((x): x is string => typeof x === "string") : [],
    };
  } catch {
    return null;
  }
}

function persistQuests(state: QuestState) {
  try {
    localStorage.setItem(QUESTS_KEY, JSON.stringify(state));
  } catch {
    /* ignore storage errors */
  }
}

function loadCare(): Record<string, CareStats> {
  try {
    const raw = localStorage.getItem(CARE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { pets?: Record<string, Partial<CareStats>> };
    const pets = parsed.pets && typeof parsed.pets === "object" ? parsed.pets : {};
    const result: Record<string, CareStats> = {};
    for (const [petId, stats] of Object.entries(pets)) {
      if (typeof petId !== "string") continue;
      result[petId] = sanitizeCareStats(stats);
    }
    return result;
  } catch {
    return {};
  }
}

function persistCare(careByPet: Record<string, CareStats>) {
  try {
    localStorage.setItem(CARE_KEY, JSON.stringify({ pets: careByPet }));
  } catch {
    /* ignore storage errors */
  }
}

const EXPED_KEY = slotKey("expeditions");

function loadExpeditions(): Record<string, ExpeditionSave> {
  try {
    const raw = localStorage.getItem(EXPED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { pets?: Record<string, Partial<ExpeditionSave>> };
    const pets = parsed.pets && typeof parsed.pets === "object" ? parsed.pets : {};
    const result: Record<string, ExpeditionSave> = {};
    for (const [petId, save] of Object.entries(pets)) {
      if (typeof petId !== "string") continue;
      result[petId] = sanitizeExpeditionSave(save);
    }
    return result;
  } catch {
    return {};
  }
}

function persistExpeditions(byPet: Record<string, ExpeditionSave>) {
  try {
    localStorage.setItem(EXPED_KEY, JSON.stringify({ pets: byPet }));
  } catch {
    /* ignore storage errors */
  }
}

const BOSS_KEY = slotKey("bosses");
const ACTIVE_BOSS_KEY = slotKey("activeBoss");

function loadBossSave(): BossSave {
  try {
    const raw = localStorage.getItem(BOSS_KEY);
    if (!raw) return createBossSave();
    return sanitizeBossSave(JSON.parse(raw) as Partial<BossSave>);
  } catch {
    return createBossSave();
  }
}

function persistBossSave(save: BossSave) {
  try {
    localStorage.setItem(BOSS_KEY, JSON.stringify(save));
  } catch {
    /* ignore storage errors */
  }
}

function loadActiveBossId(save: BossSave): string {
  try {
    const stored = localStorage.getItem(ACTIVE_BOSS_KEY);
    if (stored && save[stored]?.unlocked) return stored;
  } catch {
    /* ignore storage errors */
  }
  const firstUnlocked = BOSSES.find((b) => save[b.id]?.unlocked);
  return firstUnlocked?.id ?? BOSSES[0].id;
}

const EEPSITE_KEY = slotKey("eepsites");

function loadEepsites(): Record<string, EepsiteSave> {
  try {
    const raw = localStorage.getItem(EEPSITE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { pets?: Record<string, Partial<EepsiteSave>> };
    const pets = parsed.pets && typeof parsed.pets === "object" ? parsed.pets : {};
    const result: Record<string, EepsiteSave> = {};
    for (const [petId, save] of Object.entries(pets)) {
      if (typeof petId !== "string") continue;
      result[petId] = sanitizeEepsiteSave(save);
    }
    return result;
  } catch {
    return {};
  }
}

function persistEepsites(byPet: Record<string, EepsiteSave>) {
  try {
    localStorage.setItem(EEPSITE_KEY, JSON.stringify({ pets: byPet }));
  } catch {
    /* ignore storage errors */
  }
}

const ACTIVITY_KEY = slotKey("activity");

function loadActivityLog(): ActivityLog {
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    if (!raw) return createActivityLog();
    return sanitizeActivityLog(JSON.parse(raw));
  } catch {
    return createActivityLog();
  }
}

function persistActivityLog(log: ActivityLog) {
  try {
    localStorage.setItem(ACTIVITY_KEY, JSON.stringify(log));
  } catch {
    /* ignore storage errors */
  }
}

const LAST_SEEN_KEY = slotKey("lastSeen");
const AUTO_CARE_KEY = slotKey("autoCare");
const GUIDE_SEEN_KEY = slotKey("guideSeen");

export interface AutoCareSettings {
  enabled: boolean;
  feedThreshold: number;
  cleanThreshold: number;
  playThreshold: number;
}

const DEFAULT_AUTO_CARE: AutoCareSettings = {
  enabled: false,
  feedThreshold: 25,
  cleanThreshold: 25,
  playThreshold: 25,
};

function loadAutoCare(): AutoCareSettings {
  try {
    const raw = localStorage.getItem(AUTO_CARE_KEY);
    if (!raw) return DEFAULT_AUTO_CARE;
    const parsed = JSON.parse(raw) as Partial<AutoCareSettings>;
    return {
      enabled: parsed.enabled === true,
      feedThreshold: Math.max(0, Math.min(80, Number(parsed.feedThreshold) || DEFAULT_AUTO_CARE.feedThreshold)),
      cleanThreshold: Math.max(0, Math.min(80, Number(parsed.cleanThreshold) || DEFAULT_AUTO_CARE.cleanThreshold)),
      playThreshold: Math.max(0, Math.min(80, Number(parsed.playThreshold) || DEFAULT_AUTO_CARE.playThreshold)),
    };
  } catch {
    return DEFAULT_AUTO_CARE;
  }
}

function persistAutoCare(settings: AutoCareSettings) {
  try {
    localStorage.setItem(AUTO_CARE_KEY, JSON.stringify(settings));
  } catch {
    /* ignore storage errors */
  }
}

export interface OfflineSummary {
  awayMs: number;
  expeditionsClaimed: number;
  eepsitesClaimed: number;
  bossDamage: number;
  bossDefeats: number;
  rewardsGained: { coins: number; xp: number; items: number };
}

const OFFLINE_BOSS_CAP_HOURS = 1;

export interface SkillsSave {
  unlocked: string[];
  pointsEarned: number;
}

const EMPTY_SKILLS: SkillsSave = { unlocked: [], pointsEarned: 0 };

function loadSkills(): SkillsSave {
  try {
    const raw = localStorage.getItem(SKILLS_KEY);
    if (!raw) return EMPTY_SKILLS;
    const parsed = JSON.parse(raw) as Partial<SkillsSave>;
    return {
      unlocked: Array.isArray(parsed.unlocked)
        ? parsed.unlocked.filter((x): x is string => typeof x === "string")
        : [],
      pointsEarned: Number(parsed.pointsEarned) || 0,
    };
  } catch {
    return EMPTY_SKILLS;
  }
}

function persistSkills(skills: SkillsSave) {
  try { localStorage.setItem(SKILLS_KEY, JSON.stringify(skills)); } catch { /* ignore storage errors */ }
}

function loadAchievements(): string[] {
  try {
    const raw = localStorage.getItem(ACHIEVEMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { unlocked?: unknown };
    return Array.isArray(parsed.unlocked)
      ? parsed.unlocked.filter((x): x is string => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}

function persistAchievements(unlocked: string[]) {
  try { localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify({ unlocked })); } catch { /* ignore storage errors */ }
}

function loadEconomy(): EconomySave {
  const currentPet = loadCreature()?.id;
  try {
    const raw = localStorage.getItem(ECONOMY_KEY);
    if (!raw) return createEconomy(currentPet);
    return sanitizeEconomy(JSON.parse(raw) as Partial<EconomySave>, currentPet);
  } catch {
    return createEconomy(currentPet);
  }
}

function persistEconomy(economy: EconomySave) {
  try { localStorage.setItem(ECONOMY_KEY, JSON.stringify(economy)); } catch { /* ignore storage errors */ }
}

function loadRouterEvents(): RouterEvent[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(ROUTER_EVENTS_KEY) ?? "[]") as Partial<RouterEvent>[];
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((event) => {
      if (
        typeof event.id !== "string"
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
  } catch {
    return [];
  }
}

function persistRouterEvents(events: RouterEvent[]) {
  try {
    const stored = events.map(({ reactionSrc: _reactionSrc, ...event }) => event);
    localStorage.setItem(ROUTER_EVENTS_KEY, JSON.stringify(stored));
  } catch {
    /* ignore storage errors */
  }
}

export function ObservatoryProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [metrics, setMetrics] = useState<RouterMetrics>(EMPTY_METRICS);
  const [source, setSource] = useState<DataSource>("disconnected");
  const [pluginAvailable, setPluginAvailable] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(0);
  const [history, setHistory] = useState<Series>({ inbound: [], outbound: [], tunnels: [], peers: [] });
  const [peerCreatures, setPeerCreatures] = useState<PeerCreature[]>([]);

  const [activeView, setActiveView] = useState<ViewId>("Observatory");
  const [mode, setModeState] = useState<Mode>(() => loadSettings().defaultMode);
  const [timeWindow, setTimeWindowState] = useState<TimeWindow>("5m");
  const [zoom, setZoomState] = useState(1);
  const [playback, setPlaybackState] = useState<"Live" | "Replay">("Live");
  const [replayPos, setReplayPosState] = useState(1);
  const [replayPlaying, setReplayPlaying] = useState(false);
  const [creature, setCreature] = useState<CreatureSave | null>(loadCreature);
  const [progress, setProgress] = useState<ProgressSave>(loadProgress);
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [routerEvents, setRouterEvents] = useState<RouterEvent[]>(loadRouterEvents);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [connectionTest, setConnectionTest] = useState<ConnectionTest>({ state: "idle" });

  const [skills, setSkills] = useState<SkillsSave>(loadSkills);
  const skillsRef = useRef(skills);
  skillsRef.current = skills;
  const creatureRef = useRef(creature);
  creatureRef.current = creature;
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>(loadAchievements);
  const unlockedAchievementsRef = useRef(unlockedAchievements);
  unlockedAchievementsRef.current = unlockedAchievements;
  const [recentAchievementId, setRecentAchievementId] = useState<string | null>(null);
  const [economy, setEconomy] = useState<EconomySave>(loadEconomy);
  const economyRef = useRef(economy);
  economyRef.current = economy;

  const [questState, setQuestState] = useState<QuestState | null>(loadQuests);
  const questStateRef = useRef(questState);
  questStateRef.current = questState;
  const questsRef = useRef<QuestInstance[]>([]);

  const [careByPet, setCareByPet] = useState<Record<string, CareStats>>(loadCare);
  const careByPetRef = useRef(careByPet);
  careByPetRef.current = careByPet;

  const [expeditionsByPet, setExpeditionsByPet] = useState<Record<string, ExpeditionSave>>(loadExpeditions);
  const expeditionsByPetRef = useRef(expeditionsByPet);
  expeditionsByPetRef.current = expeditionsByPet;

  const [bossSave, setBossSave] = useState<BossSave>(() => {
    const loaded = loadBossSave();
    return loaded;
  });
  const bossSaveRef = useRef(bossSave);
  bossSaveRef.current = bossSave;
  const [activeBossId, setActiveBossIdState] = useState<string>(() => loadActiveBossId(bossSaveRef.current));
  const activeBossIdRef = useRef(activeBossId);
  activeBossIdRef.current = activeBossId;
  const applyBossDamageRef = useRef<((dmg: number) => { damage: number; defeated: boolean; phase: number } | null) | null>(null);

  const [eepsitesByPet, setEepsitesByPet] = useState<Record<string, EepsiteSave>>(loadEepsites);
  const eepsitesByPetRef = useRef(eepsitesByPet);
  eepsitesByPetRef.current = eepsitesByPet;

  const [activityLog, setActivityLog] = useState<ActivityLog>(loadActivityLog);
  const activityLogRef = useRef(activityLog);
  activityLogRef.current = activityLog;

  const [autoCare, setAutoCareState] = useState<AutoCareSettings>(loadAutoCare);
  const autoCareRef = useRef(autoCare);
  autoCareRef.current = autoCare;

  const [offlineSummary, setOfflineSummary] = useState<OfflineSummary | null>(null);
  const offlineProcessedRef = useRef(false);

  const [guideSeen, setGuideSeenState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(GUIDE_SEEN_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [guideOpen, setGuideOpenState] = useState(false);

  const markGuideSeen = useCallback(() => {
    setGuideSeenState(true);
    try {
      localStorage.setItem(GUIDE_SEEN_KEY, "1");
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const setGuideOpen = useCallback((open: boolean) => {
    setGuideOpenState(open);
    if (open) {
      setGuideSeenState(true);
      try {
        localStorage.setItem(GUIDE_SEEN_KEY, "1");
      } catch {
        /* ignore storage errors */
      }
    }
  }, []);

  useEffect(() => {
    if (!creature) return;
    if (guideSeen) return;
    const startedAt = creature.createdAt;
    if (Date.now() - startedAt > 5000) return;
    setGuideOpenState(true);
    try {
      localStorage.setItem(GUIDE_SEEN_KEY, "1");
    } catch {
      /* ignore storage errors */
    }
  }, [creature, guideSeen]);

  const pushActivity = useCallback((entries: ActivityEntry | ActivityEntry[]) => {
    const incoming = Array.isArray(entries) ? entries : [entries];
    if (incoming.length === 0) return;
    const stamped = incoming.map((e) => ({ ...e, at: e.at || Date.now(), id: e.id || makeActivityId(e.at || Date.now()) }));
    const next = appendActivity(activityLogRef.current, stamped);
    activityLogRef.current = next;
    setActivityLog(next);
    persistActivityLog(next);
  }, []);

  const clearActivity = useCallback(() => {
    const empty = createActivityLog();
    activityLogRef.current = empty;
    setActivityLog(empty);
    persistActivityLog(empty);
  }, []);

  const awardSkillPointsForDelta = useCallback((beforeXp: number, afterXp: number) => {
    const oldLevel = levelForXp(Math.floor(beforeXp));
    const newLevel = levelForXp(Math.floor(afterXp));
    if (newLevel <= oldLevel) return;
    const bonuses = computeSkillBonuses(skillsRef.current.unlocked);
    const pointsAwarded = (newLevel - oldLevel) * bonuses.skillPointsPerLevel;
    if (pointsAwarded <= 0) return;
    const nextSkills: SkillsSave = {
      unlocked: skillsRef.current.unlocked,
      pointsEarned: skillsRef.current.pointsEarned + pointsAwarded,
    };
    skillsRef.current = nextSkills;
    setSkills(nextSkills);
    persistSkills(nextSkills);
    pushActivity([{
      id: makeActivityId(Date.now()),
      at: Date.now(),
      category: "level",
      title: `Level ${newLevel} reached`,
      detail: `+${pointsAwarded} skill point${pointsAwarded === 1 ? "" : "s"}`,
    }]);
  }, [pushActivity]);

  const setAutoCare = useCallback((next: AutoCareSettings) => {
    const clean: AutoCareSettings = {
      enabled: next.enabled,
      feedThreshold: Math.max(0, Math.min(80, Math.round(next.feedThreshold))),
      cleanThreshold: Math.max(0, Math.min(80, Math.round(next.cleanThreshold))),
      playThreshold: Math.max(0, Math.min(80, Math.round(next.playThreshold))),
    };
    autoCareRef.current = clean;
    setAutoCareState(clean);
    persistAutoCare(clean);
  }, []);

  const dismissOfflineSummary = useCallback(() => setOfflineSummary(null), []);

  const reactionId = useRef(0);
  const routerEventId = useRef(0);
  const sourceRef = useRef<DataSource>("disconnected");
  const liveMetricsRef = useRef<RouterMetrics | null>(null);
  const recentEventKeysRef = useRef(new Map<string, number>());

  const recordRouterEvents = useCallback((drafts: RouterEventDraft[]) => {
    if (drafts.length === 0) return;
    const now = Date.now();
    const created: RouterEvent[] = [];

    for (const draft of drafts) {
      const eventKey = `${draft.kind}:${draft.title}`;
      const previousAt = recentEventKeysRef.current.get(eventKey) ?? 0;
      if (now - previousAt < 20_000) continue;
      const reactionSrc = REACTION_SRC.get(draft.reaction);
      if (!reactionSrc) continue;
      recentEventKeysRef.current.set(eventKey, now);
      created.push({
        ...draft,
        id: `${now}-${routerEventId.current += 1}`,
        timestamp: now,
        reactionSrc,
      });
    }

    if (created.length === 0) return;
    setRouterEvents((previous) => {
      const next = [...created.reverse(), ...previous].slice(0, MAX_ROUTER_EVENTS);
      persistRouterEvents(next);
      return next;
    });

    for (const event of created) {
      const id = (reactionId.current += 1);
      setReactions((previous) => [...previous, {
        id,
        src: event.reactionSrc,
        name: event.reaction,
      }]);
      window.setTimeout(() => {
        setReactions((previous) => previous.filter((reaction) => reaction.id !== id));
      }, 2600);
    }
  }, []);

  // Plugin health: only "ready" when we get a genuine JSON {ok:true} response.
  useEffect(() => {
    let cancelled = false;
    fetch("./api/health", { cache: "no-store" })
      .then(async (response) => {
        const type = response.headers.get("content-type") ?? "";
        if (!response.ok || !type.includes("application/json")) return false;
        const body = (await response.json()) as { ok?: boolean };
        return body.ok === true;
      })
      .then((ok) => {
        if (!cancelled) setPluginAvailable(ok);
      })
      .catch(() => {
        if (!cancelled) setPluginAvailable(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Live polling loop (paused during Replay).
  useEffect(() => {
    if (playback === "Replay") return;
    let cancelled = false;

    const tick = async () => {
      try {
        const next = await fetchMetrics(settings.password);
        if (cancelled) return;
        const previousMetrics = liveMetricsRef.current;
        liveMetricsRef.current = next;
        sourceRef.current = "live";
        setMetrics(next);
        setSource("live");
        setLastUpdated(Date.now());
        setHistory((prev) => appendSample(prev, next));
        recordRouterEvents(deriveRouterEvents(previousMetrics, next));

        // Best-effort: map real connected peers to creatures (never blocks metrics).
        fetchPeers()
          .then((list) => { if (!cancelled) setPeerCreatures(list); })
          .catch(() => { if (!cancelled) setPeerCreatures([]); });

        const deltaSeconds = (Date.now() - progressRef.current.lastTickAt) / 1000;
        const currentBonuses = computeSkillBonuses(skillsRef.current.unlocked);

        const currentGear = equipmentBonuses(
          loadoutFor(economyRef.current, creatureRef.current?.id),
          economyRef.current.upgrades,
        );
        const activePetId = creatureRef.current?.id;
        const activeCare = activePetId ? careByPetRef.current[activePetId] : null;
        const evolutionPath = creatureRef.current?.evolutionPath ?? null;
        const evolutionXpBonus = evolutionPath ? EVOLUTION_PATHS[evolutionPath].bonus.xpBonus ?? 0 : 0;
        const careXpMultiplier = deriveCareBonuses(activeCare).xpMultiplier * (1 + evolutionXpBonus);
        const grown = accrue(progressRef.current, next, deltaSeconds, settings.pollSeconds, currentBonuses, currentGear, careXpMultiplier);
        const beforeXp = progressRef.current.totalXp;
        progressRef.current = grown;
        setProgress(grown);
        persistProgress(grown);
        awardSkillPointsForDelta(beforeXp, grown.totalXp);

      } catch (error) {
        if (cancelled) return;
        if (sourceRef.current === "live") {
          const detail = error instanceof Error ? error.message : "I2PControl did not respond.";
          recordRouterEvents([connectionLostEvent(detail)]);
        }
        sourceRef.current = "disconnected";
        liveMetricsRef.current = null;
        setSource("disconnected");
        setMetrics(EMPTY_METRICS);
        setPeerCreatures([]);
        progressRef.current = { ...progressRef.current, lastTickAt: Date.now() };
      }
    };

    tick();
    const id = window.setInterval(tick, Math.max(1, settings.pollSeconds) * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [settings.password, settings.pollSeconds, playback, recordRouterEvents, awardSkillPointsForDelta]);

  // Replay auto-advance.
  useEffect(() => {
    if (playback !== "Replay" || !replayPlaying) return;
    const id = window.setInterval(() => {
      setReplayPosState((pos) => {
        const next = pos + 0.02;
        if (next >= 1) {
          setReplayPlaying(false);
          return 1;
        }
        return next;
      });
    }, 120);
    return () => window.clearInterval(id);
  }, [playback, replayPlaying]);

  // Care ticker — decays hunger/cleanliness/fun in real time, even with no router.
  // Care ticker — decays hunger/cleanliness/fun in real time, even with no router.
  useEffect(() => {
    const id = window.setInterval(() => {
      const petId = creatureRef.current?.id;
      if (petId) {
        const current = careByPetRef.current[petId];
        if (current) {
          const decayed = decayCareStats(current);
          if (decayed !== current) {
            let nextStats = decayed;
            if (autoCareRef.current.enabled) {
              const acc = autoCareRef.current;
              const inv = economyRef.current.careInventory;
              const useBest = (kind: "food" | "soap" | "toy", stat: "hunger" | "cleanliness" | "fun", threshold: number, action: "feed" | "clean" | "play") => {
                if (nextStats[stat] >= threshold) return;
                const items = CARE_ITEMS.filter((it) => it.kind === kind && inv.includes(it.id));
                if (items.length === 0) return;
                const best = items.sort((a, b) => b.cost - a.cost)[0];
                const result = applyCareAction(nextStats, action, { itemId: best.id, inventoryHasItem: true });
                if (result.applied && result.consumedItemId) {
                  const nextEcon = {
                    ...economyRef.current,
                    careInventory: economyRef.current.careInventory.filter((id) => id !== result.consumedItemId),
                  };
                  economyRef.current = nextEcon;
                  setEconomy(nextEcon);
                  persistEconomy(nextEcon);
                  nextStats = result.stats;
                }
              };
              useBest("food", "hunger", acc.feedThreshold, "feed");
              useBest("soap", "cleanliness", acc.cleanThreshold, "clean");
              useBest("toy", "fun", acc.playThreshold, "play");
            }
            const next = { ...careByPetRef.current, [petId]: nextStats };
            careByPetRef.current = next;
            setCareByPet(next);
            persistCare(next);
          }
        }
      }
      if (sourceRef.current === "live") {
        const ctx: DamageContext = {
          level: levelForXp(Math.floor(progressRef.current.totalXp)),
          gearScore: gearScore(
            loadoutFor(economyRef.current, creatureRef.current?.id),
            economyRef.current.upgrades,
          ),
          evolutionPath: creatureRef.current?.evolutionPath ?? null,
          metrics: liveMetricsRef.current ?? EMPTY_METRICS,
          source: "live",
        };
        const dmg = routerTickDamage(ctx);
        if (dmg > 0 && applyBossDamageRef.current) {
          applyBossDamageRef.current(dmg * 3);
        }
      }
    }, 15_000);
    return () => window.clearInterval(id);
  }, []);

  // Offline progress — runs once on mount, processes anything that completed while away.
  useEffect(() => {
    if (offlineProcessedRef.current) return;
    offlineProcessedRef.current = true;

    let lastSeen = Date.now();
    try {
      const raw = localStorage.getItem(LAST_SEEN_KEY);
      if (raw) lastSeen = Number(raw) || Date.now();
    } catch {
      /* ignore storage errors */
    }
    localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));

    const now = Date.now();
    const awayMs = Math.max(0, now - lastSeen);
    if (awayMs < 60_000) return;

    const summary: OfflineSummary = {
      awayMs,
      expeditionsClaimed: 0,
      eepsitesClaimed: 0,
      bossDamage: 0,
      bossDefeats: 0,
      rewardsGained: { coins: 0, xp: 0, items: 0 },
    };

    const petId = creatureRef.current?.id;
    if (petId) {
      const expSave = expeditionsByPetRef.current[petId];
      if (expSave?.active) {
        const prog = expeditionProgress(expSave.active, now);
        if (prog.complete) {
          const def = getExpedition(expSave.active.expeditionId);
          if (def) {
            const level = levelForXp(Math.floor(progressRef.current.totalXp));
            const path = creatureRef.current?.evolutionPath ?? null;
            const coinMult = 1 + (path ? EVOLUTION_PATHS[path].bonus.coinBonus ?? 0 : 0);
            const result = rollExpeditionRewards(def, level, coinMult);
            const nextEcon: EconomySave = {
              ...economyRef.current,
              coins: economyRef.current.coins + result.coins + result.bonusCoins,
              totalEarned: economyRef.current.totalEarned + result.coins + result.bonusCoins,
              careInventory: result.careItemId
                ? [...economyRef.current.careInventory, result.careItemId]
                : economyRef.current.careInventory,
            };
            economyRef.current = nextEcon;
            setEconomy(nextEcon);
            persistEconomy(nextEcon);
            const progressed: ProgressSave = {
              ...progressRef.current,
              totalXp: progressRef.current.totalXp + result.xp,
              lastTickAt: now,
            };
            progressRef.current = progressed;
            setProgress(progressed);
            persistProgress(progressed);
            const nextExpSave: ExpeditionSave = { active: null, completedCount: expSave.completedCount + 1 };
            const nextByPet = { ...expeditionsByPetRef.current, [petId]: nextExpSave };
            expeditionsByPetRef.current = nextByPet;
            setExpeditionsByPet(nextByPet);
            persistExpeditions(nextByPet);
            summary.expeditionsClaimed = 1;
            summary.rewardsGained.coins += result.coins + result.bonusCoins;
            summary.rewardsGained.xp += result.xp;
            if (result.careItemId) summary.rewardsGained.items += 1;
          }
        }
      }

      const eepSave = eepsitesByPetRef.current[petId];
      if (eepSave?.active) {
        const prog = eepsiteProgress(eepSave.active, now);
        if (prog.complete) {
          const def = getEepsite(eepSave.active.eepsiteId);
          if (def) {
            const level = levelForXp(Math.floor(progressRef.current.totalXp));
            const path = creatureRef.current?.evolutionPath ?? null;
            const coinMult = 1 + (path ? EVOLUTION_PATHS[path].bonus.coinBonus ?? 0 : 0);
            const result = rollEepsiteRewards(def, level, coinMult);
            const nextEcon: EconomySave = {
              ...economyRef.current,
              coins: economyRef.current.coins + result.coins + result.bonusCoins,
              totalEarned: economyRef.current.totalEarned + result.coins + result.bonusCoins,
              careInventory: result.careItemId
                ? [...economyRef.current.careInventory, result.careItemId]
                : economyRef.current.careInventory,
            };
            economyRef.current = nextEcon;
            setEconomy(nextEcon);
            persistEconomy(nextEcon);
            const progressed: ProgressSave = {
              ...progressRef.current,
              totalXp: progressRef.current.totalXp + result.xp,
              lastTickAt: now,
            };
            progressRef.current = progressed;
            setProgress(progressed);
            persistProgress(progressed);
            const nextEepSave: EepsiteSave = { ...eepSave, active: null, completedCount: eepSave.completedCount + 1 };
            const nextByPet = { ...eepsitesByPetRef.current, [petId]: nextEepSave };
            eepsitesByPetRef.current = nextByPet;
            setEepsitesByPet(nextByPet);
            persistEepsites(nextByPet);
            summary.eepsitesClaimed = 1;
            summary.rewardsGained.coins += result.coins + result.bonusCoins;
            summary.rewardsGained.xp += result.xp;
            if (result.careItemId) summary.rewardsGained.items += 1;
          }
        }
      }
    }

    const bossId = activeBossIdRef.current;
    const bossDef = getBoss(bossId);
    const bossState = bossSaveRef.current[bossId];
    if (bossDef && bossState?.unlocked && bossState.currentHp > 0) {
      const cappedMs = Math.min(awayMs, OFFLINE_BOSS_CAP_HOURS * 60 * 60_000);
      const attacks = Math.floor(cappedMs / ATTACK_COOLDOWN_MS);
      if (attacks > 0) {
        const ctx: DamageContext = {
          level: levelForXp(Math.floor(progressRef.current.totalXp)),
          gearScore: gearScore(
            loadoutFor(economyRef.current, creatureRef.current?.id),
            economyRef.current.upgrades,
          ),
          evolutionPath: creatureRef.current?.evolutionPath ?? null,
          metrics: EMPTY_METRICS,
          source: "disconnected",
        };
        const perHit = clickDamage(ctx);
        const totalDmg = perHit * attacks;
        summary.bossDamage = totalDmg;
        if (applyBossDamageRef.current) {
          const before = bossState.kills;
          applyBossDamageRef.current(totalDmg);
          const after = bossSaveRef.current[bossId]?.kills ?? before;
          summary.bossDefeats = Math.max(0, after - before);
        }
      }
    }

    if (summary.expeditionsClaimed || summary.eepsitesClaimed || summary.bossDamage > 0) {
      setOfflineSummary(summary);
      pushActivity([{
        id: makeActivityId(now),
        at: now,
        category: "system",
        title: `Welcome back — away ${Math.round(awayMs / 60_000)}m`,
        detail: `Offline progress processed`,
      }]);
    }
  }, [pushActivity]);

  // Persist lastSeen periodically so the next session can compute away-time.
  useEffect(() => {
    const id = window.setInterval(() => {
      try {
        localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
      } catch {
        /* ignore storage errors */
      }
    }, 30_000);
    return () => {
      window.clearInterval(id);
      try {
        localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
      } catch {
        /* ignore storage errors */
      }
    };
  }, []);

  const setView = useCallback((view: ViewId) => {
    setActiveView(view);
    setNotificationsOpen(false);
  }, []);

  const setMode = useCallback((next: Mode) => setModeState(next), []);
  const setZoom = useCallback((updater: (z: number) => number) => {
    setZoomState((z) => Math.max(0.6, Math.min(2.2, +updater(z).toFixed(2))));
  }, []);

  const setPlayback = useCallback((next: "Live" | "Replay") => {
    setPlaybackState(next);
    if (next === "Replay") {
      setReplayPosState(0);
      setReplayPlaying(true);
    } else {
      setReplayPlaying(false);
      setReplayPosState(1);
    }
  }, []);

  const setReplayPos = useCallback((pos: number) => {
    setReplayPosState(Math.max(0, Math.min(1, pos)));
  }, []);

  const toggleReplayPlaying = useCallback(() => {
    setReplayPlaying((playing) => {
      if (!playing && replayPos >= 1) setReplayPosState(0);
      return !playing;
    });
  }, [replayPos]);

  const renameCreature = useCallback((name: string) => {
    setCreature((current) => {
      if (!current) return current;
      const trimmed = name.trim().slice(0, 24) || displayCreatureName(current.id);
      const next = { ...current, name: trimmed };
      try {
        localStorage.setItem(CREATURE_KEY, JSON.stringify(next));
        localStorage.setItem(NAME_KEY, trimmed); // backward-compat
      } catch {
        /* ignore storage errors */
      }
      return next;
    });
  }, []);

  const chooseCreature = useCallback((id: string, name?: string) => {
    const chosenName = name && name.trim() ? name.trim().slice(0, 24) : displayCreatureName(id);
    const next: CreatureSave = { id, name: chosenName, createdAt: Date.now() };
    const fresh: ProgressSave = { totalXp: 0, sharedBytes: 0, lastTickAt: Date.now() };
    setCreature(next);
    setProgress(fresh);
    progressRef.current = fresh;
    try {
      localStorage.setItem(CREATURE_KEY, JSON.stringify(next));
      localStorage.setItem(NAME_KEY, next.name);
      persistProgress(fresh);
    } catch {
      /* ignore storage errors */
    }
    const nextEconomy = {
      ...economyRef.current,
      ownedPets: economyRef.current.ownedPets.includes(id)
        ? economyRef.current.ownedPets
        : [...economyRef.current.ownedPets, id],
    };
    economyRef.current = nextEconomy;
    setEconomy(nextEconomy);
    persistEconomy(nextEconomy);
    if (!careByPetRef.current[id]) {
      const freshCare = createCareStats();
      const nextCare = { ...careByPetRef.current, [id]: freshCare };
      careByPetRef.current = nextCare;
      setCareByPet(nextCare);
      persistCare(nextCare);
    }
  }, []);

  const toggleNotifications = useCallback(() => setNotificationsOpen((open) => !open), []);
  const closeNotifications = useCallback(() => setNotificationsOpen(false), []);

  const saveSettings = useCallback((next: Settings) => {
    const clean: Settings = {
      password: next.password,
      pollSeconds: Math.max(1, Math.min(120, Math.round(next.pollSeconds) || 5)),
      defaultMode: next.defaultMode,
      theme: next.theme,
    };
    setSettings(clean);
    setModeState(clean.defaultMode);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(clean));
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const testConnection = useCallback(async (password: string) => {
    setConnectionTest({ state: "testing" });
    try {
      const next = await fetchMetrics(password);
      setConnectionTest({
        state: "ok",
        detail: `Verbunden — Status ${next.status}, ${next.participatingTunnels} Tunnel, ${next.knownPeers} Peers.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unbekannter Fehler";
      setConnectionTest({
        state: "error",
        detail: `Nicht erreichbar. ${message}. Läuft das I2P-Plugin und ist I2PControl aktiv?`,
      });
    }
  }, []);

  const unlockSkill = useCallback((nodeId: string) => {
    const node = SKILL_TREE.find((n) => n.id === nodeId);
    if (!node) return;
    const current = skillsRef.current;
    const set = new Set(current.unlocked);
    const pointsAvailable = current.pointsEarned - current.unlocked.length;
    const level = levelForXp(Math.floor(progressRef.current.totalXp));
    const achSet = new Set(unlockedAchievementsRef.current);
    const check = canUnlock(node, set, pointsAvailable, level, achSet);
    if (!check.ok) return;
    const nextSkills: SkillsSave = {
      unlocked: [...current.unlocked, nodeId],
      pointsEarned: current.pointsEarned,
    };
    skillsRef.current = nextSkills;
    setSkills(nextSkills);
    persistSkills(nextSkills);
  }, []);

  const respecSkills = useCallback(() => {
    const nextSkills: SkillsSave = { unlocked: [], pointsEarned: skillsRef.current.pointsEarned };
    skillsRef.current = nextSkills;
    setSkills(nextSkills);
    persistSkills(nextSkills);
  }, []);

  const dismissAchievement = useCallback(() => setRecentAchievementId(null), []);

  const purchaseItem = useCallback((itemId: string): boolean => {
    const item = getGearItem(itemId);
    const current = economyRef.current;
    if (!item || current.inventory.includes(itemId) || current.coins < item.cost) return false;
    const next: EconomySave = {
      ...current,
      coins: current.coins - item.cost,
      totalSpent: current.totalSpent + item.cost,
      inventory: [...current.inventory, itemId],
    };
    economyRef.current = next;
    setEconomy(next);
    persistEconomy(next);
    return true;
  }, []);

  const equipItem = useCallback((itemId: string): boolean => {
    const item = getGearItem(itemId);
    const current = economyRef.current;
    const petId = creatureRef.current?.id;
    if (!item || !petId || !current.inventory.includes(itemId)) return false;
    const loadouts = Object.fromEntries(
      Object.entries(current.loadouts).map(([id, loadout]) => {
        const cleaned = { ...loadout };
        for (const slot of GEAR_SLOTS) {
          if (cleaned[slot] === itemId) delete cleaned[slot];
        }
        return [id, cleaned];
      }),
    );
    const next: EconomySave = {
      ...current,
      loadouts: {
        ...loadouts,
        [petId]: { ...(loadouts[petId] ?? {}), [item.slot]: item.id },
      },
    };
    economyRef.current = next;
    setEconomy(next);
    persistEconomy(next);
    return true;
  }, []);

  const unequipSlot = useCallback((slot: GearSlot) => {
    const current = economyRef.current;
    const petId = creatureRef.current?.id;
    if (!petId) return;
    const nextEquipped = { ...loadoutFor(current, petId) };
    delete nextEquipped[slot];
    const next: EconomySave = {
      ...current,
      loadouts: { ...current.loadouts, [petId]: nextEquipped },
    };
    economyRef.current = next;
    setEconomy(next);
    persistEconomy(next);
  }, []);

  const sellItem = useCallback((itemId: string): boolean => {
    const item = getGearItem(itemId);
    const current = economyRef.current;
    if (!item || !current.inventory.includes(itemId)) return false;
    const refund = sellValue(item);
    const loadouts = Object.fromEntries(
      Object.entries(current.loadouts).map(([id, loadout]) => {
        const cleaned = { ...loadout };
        for (const slot of GEAR_SLOTS) {
          if (cleaned[slot] === itemId) delete cleaned[slot];
        }
        return [id, cleaned];
      }),
    );
    const upgrades = { ...current.upgrades };
    delete upgrades[itemId];
    const next: EconomySave = {
      ...current,
      coins: current.coins + refund,
      totalEarned: current.totalEarned + refund,
      inventory: current.inventory.filter((id) => id !== itemId),
      loadouts,
      upgrades,
    };
    economyRef.current = next;
    setEconomy(next);
    persistEconomy(next);
    return true;
  }, []);

  const upgradeItem = useCallback((itemId: string): boolean => {
    const item = getGearItem(itemId);
    const current = economyRef.current;
    if (!item || !current.inventory.includes(itemId)) return false;
    const level = upgradeLevelOf(current.upgrades, itemId);
    if (level >= UPGRADE_MAX) return false;
    const cost = upgradeCost(item, level);
    if (current.coins < cost) return false;
    const next: EconomySave = {
      ...current,
      coins: current.coins - cost,
      totalSpent: current.totalSpent + cost,
      upgrades: { ...current.upgrades, [itemId]: level + 1 },
    };
    economyRef.current = next;
    setEconomy(next);
    persistEconomy(next);
    return true;
  }, []);

  const adoptPet = useCallback((petId: string): boolean => {
    const current = economyRef.current;
    if (!isCatalogPet(petId) || current.ownedPets.includes(petId)) return false;
    const pet = getPet(petId);
    if (current.coins < pet.adoptionCost) return false;
    const next: EconomySave = {
      ...current,
      coins: current.coins - pet.adoptionCost,
      totalSpent: current.totalSpent + pet.adoptionCost,
      ownedPets: [...current.ownedPets, petId],
    };
    economyRef.current = next;
    setEconomy(next);
    persistEconomy(next);
    return true;
  }, []);

  const activatePet = useCallback((petId: string): boolean => {
    if (!economyRef.current.ownedPets.includes(petId)) return false;
    const next: CreatureSave = {
      id: petId,
      name: displayCreatureName(petId),
      createdAt: creatureRef.current?.createdAt ?? Date.now(),
    };
    creatureRef.current = next;
    setCreature(next);
    try {
      localStorage.setItem(CREATURE_KEY, JSON.stringify(next));
      localStorage.setItem(NAME_KEY, next.name);
    } catch {
      /* ignore storage errors */
    }
    if (!careByPetRef.current[petId]) {
      const freshCare = createCareStats();
      const nextCare = { ...careByPetRef.current, [petId]: freshCare };
      careByPetRef.current = nextCare;
      setCareByPet(nextCare);
      persistCare(nextCare);
    }
    return true;
  }, []);

  const windowedHistory = useMemo<Series>(() => {
    const seconds = timeWindow === "1m" ? 60 : timeWindow === "5m" ? 300 : 3600;
    const count = Math.max(2, Math.ceil(seconds / Math.max(1, settings.pollSeconds)));
    return {
      inbound: history.inbound.slice(-count),
      outbound: history.outbound.slice(-count),
      tunnels: history.tunnels.slice(-count),
      peers: history.peers.slice(-count),
    };
  }, [history, settings.pollSeconds, timeWindow]);

  const series = useMemo<Series>(() => {
    if (playback !== "Replay") return windowedHistory;
    const len = windowedHistory.inbound.length;
    const upto = Math.max(2, Math.round((len - 1) * replayPos) + 1);
    return {
      inbound: windowedHistory.inbound.slice(0, upto),
      outbound: windowedHistory.outbound.slice(0, upto),
      tunnels: windowedHistory.tunnels.slice(0, upto),
      peers: windowedHistory.peers.slice(0, upto),
    };
  }, [windowedHistory, playback, replayPos]);

  const values = useMemo(() => {
    if (playback === "Replay") {
      const len = windowedHistory.inbound.length;
      const idx = Math.max(0, Math.min(len - 1, Math.round((len - 1) * replayPos)));
      return {
        inbound: windowedHistory.inbound[idx] ?? 0,
        outbound: windowedHistory.outbound[idx] ?? 0,
        tunnels: windowedHistory.tunnels[idx] ?? 0,
        peers: windowedHistory.peers[idx] ?? 0,
      };
    }
    return {
      inbound: metrics.inboundBps / (1024 * 1024),
      outbound: metrics.outboundBps / (1024 * 1024),
      tunnels: metrics.participatingTunnels,
      peers: metrics.activePeers,
    };
  }, [playback, replayPos, windowedHistory, metrics]);

  const activeEquipped = useMemo(
    () => loadoutFor(economy, creature?.id),
    [economy, creature?.id],
  );
  const currentGearEffects = useMemo(
    () => equipmentBonuses(activeEquipped, economy.upgrades),
    [activeEquipped, economy.upgrades],
  );
  const currentGearScore = useMemo(
    () => gearScore(activeEquipped, economy.upgrades),
    [activeEquipped, economy.upgrades],
  );
  const equippedItems = useMemo(
    () => Object.values(activeEquipped).flatMap((id) => {
      const item = getGearItem(id);
      return item ? [item] : [];
    }),
    [activeEquipped],
  );

  const progression = useMemo<Progression | null>(() => {
    if (!creature) return null;
    const bonuses = computeSkillBonuses(skills.unlocked);
    const activeCare = careByPet[creature.id] ?? null;
    const careMoodBias = deriveCareBonuses(activeCare).moodBias;
    return derive(creature, progress, metrics, source, bonuses, currentGearEffects, careMoodBias);
  }, [creature, progress, metrics, source, skills.unlocked, currentGearEffects, careByPet]);

  const questContext = useMemo<QuestContext>(
    () => ({
      totalXp: Math.floor(progress.totalXp),
      sharedBytes: progress.sharedBytes,
      totalEarned: economy.totalEarned,
      participatingTunnels: metrics.participatingTunnels,
      uptimeMs: metrics.uptimeMs,
      level: progression?.level ?? 0,
      connected: source === "live",
    }),
    [
      progress.totalXp,
      progress.sharedBytes,
      economy.totalEarned,
      metrics.participatingTunnels,
      metrics.uptimeMs,
      progression?.level,
      source,
    ],
  );

  // Initialise quests on first run and roll the day/week over as time passes.
  useEffect(() => {
    const baselineNow: QuestBaseline = {
      totalXp: questContext.totalXp,
      sharedBytes: questContext.sharedBytes,
      totalEarned: questContext.totalEarned,
    };
    const current = questStateRef.current;
    const next = current ? rolloverQuests(current, baselineNow) : createQuestState(baselineNow);
    if (next !== current) {
      questStateRef.current = next;
      setQuestState(next);
      persistQuests(next);
    }
  }, [questContext]);

  const quests = useMemo<QuestInstance[]>(
    () => (questState ? deriveQuests(questState, questContext) : []),
    [questState, questContext],
  );
  questsRef.current = quests;

  const claimQuest = useCallback((id: string) => {
    const inst = questsRef.current.find((q) => q.instanceId === id);
    if (!inst || inst.claimed || !inst.completable) return;
    const nextEconomy: EconomySave = {
      ...economyRef.current,
      coins: economyRef.current.coins + inst.def.reward,
      totalEarned: economyRef.current.totalEarned + inst.def.reward,
    };
    economyRef.current = nextEconomy;
    setEconomy(nextEconomy);
    persistEconomy(nextEconomy);
    const st = questStateRef.current;
    if (!st) return;
    const nextState: QuestState = { ...st, claimed: [...st.claimed, id] };
    questStateRef.current = nextState;
    setQuestState(nextState);
    persistQuests(nextState);
  }, []);

  const purchaseCareItem = useCallback((itemId: string): boolean => {
    const item = getCareItem(itemId);
    const current = economyRef.current;
    if (!item || current.coins < item.cost) return false;
    const next: EconomySave = {
      ...current,
      coins: current.coins - item.cost,
      totalSpent: current.totalSpent + item.cost,
      careInventory: [...current.careInventory, itemId],
    };
    economyRef.current = next;
    setEconomy(next);
    persistEconomy(next);
    return true;
  }, []);

  const performCareAction = useCallback((action: CareActionId, itemId?: string): boolean => {
    const petId = creatureRef.current?.id;
    if (!petId) return false;
    const currentStats = careByPetRef.current[petId] ?? createCareStats();
    const inventoryHasItem = itemId ? economyRef.current.careInventory.includes(itemId) : undefined;

    const result = applyCareAction(currentStats, action, {
      itemId,
      inventoryHasItem,
    });
    if (!result.applied) return false;

    let nextEconomy = economyRef.current;
    if (result.consumedItemId) {
      nextEconomy = {
        ...economyRef.current,
        careInventory: economyRef.current.careInventory.filter((id) => id !== result.consumedItemId),
      };
      economyRef.current = nextEconomy;
      setEconomy(nextEconomy);
      persistEconomy(nextEconomy);
    }

    const nextCare = { ...careByPetRef.current, [petId]: result.stats };
    careByPetRef.current = nextCare;
    setCareByPet(nextCare);
    persistCare(nextCare);
    return true;
  }, []);

  const startExpedition = useCallback((expeditionId: string): boolean => {
    const petId = creatureRef.current?.id;
    if (!petId) return false;
    const def = getExpedition(expeditionId);
    if (!def) return false;
    const level = levelForXp(Math.floor(progressRef.current.totalXp));
    if (level < def.minLevel) return false;
    const currentForPet = expeditionsByPetRef.current[petId] ?? createExpeditionSave();
    if (currentForPet.active) return false;
    const next: ExpeditionSave = {
      ...currentForPet,
      active: {
        expeditionId,
        startedAt: Date.now(),
        durationMs: def.durationMs,
        rushed: false,
      },
    };
    const nextByPet = { ...expeditionsByPetRef.current, [petId]: next };
    expeditionsByPetRef.current = nextByPet;
    setExpeditionsByPet(nextByPet);
    persistExpeditions(nextByPet);
    return true;
  }, []);

  const rushExpedition = useCallback((): boolean => {
    const petId = creatureRef.current?.id;
    if (!petId) return false;
    const current = expeditionsByPetRef.current[petId]?.active;
    if (!current) return false;
    const prog = expeditionProgress(current);
    if (prog.complete) return false;
    const cost = rushCost(prog.remaining);
    if (economyRef.current.coins < cost) return false;
    const nextEconomy: EconomySave = {
      ...economyRef.current,
      coins: economyRef.current.coins - cost,
      totalSpent: economyRef.current.totalSpent + cost,
    };
    economyRef.current = nextEconomy;
    setEconomy(nextEconomy);
    persistEconomy(nextEconomy);
    const rushed: ActiveExpedition = { ...current, startedAt: Date.now() - current.durationMs, rushed: true };
    const nextSave: ExpeditionSave = { ...(expeditionsByPetRef.current[petId] ?? createExpeditionSave()), active: rushed };
    const nextByPet = { ...expeditionsByPetRef.current, [petId]: nextSave };
    expeditionsByPetRef.current = nextByPet;
    setExpeditionsByPet(nextByPet);
    persistExpeditions(nextByPet);
    return true;
  }, []);

  const claimExpedition = useCallback((): { coins: number; xp: number; careItemId?: string; bonusCoins: number } | null => {
    const petId = creatureRef.current?.id;
    if (!petId) return null;
    const currentSave = expeditionsByPetRef.current[petId];
    const active = currentSave?.active;
    if (!active || !currentSave) return null;
    const prog = expeditionProgress(active);
    if (!prog.complete) return null;
    const def = getExpedition(active.expeditionId);
    if (!def) return null;
    const level = levelForXp(Math.floor(progressRef.current.totalXp));
    const path = creatureRef.current?.evolutionPath ?? null;
    const coinMult = 1 + (path ? EVOLUTION_PATHS[path].bonus.coinBonus ?? 0 : 0);
    const result = rollExpeditionRewards(def, level, coinMult);

    const nextEconomy: EconomySave = {
      ...economyRef.current,
      coins: economyRef.current.coins + result.coins + result.bonusCoins,
      totalEarned: economyRef.current.totalEarned + result.coins + result.bonusCoins,
      careInventory: result.careItemId
        ? [...economyRef.current.careInventory, result.careItemId]
        : economyRef.current.careInventory,
    };
    economyRef.current = nextEconomy;
    setEconomy(nextEconomy);
    persistEconomy(nextEconomy);

    const progressed: ProgressSave = {
      ...progressRef.current,
      totalXp: progressRef.current.totalXp + result.xp,
      lastTickAt: Date.now(),
    };
    const beforeXp = progressRef.current.totalXp;
    progressRef.current = progressed;
    setProgress(progressed);
    persistProgress(progressed);
    awardSkillPointsForDelta(beforeXp, progressed.totalXp);

    const nextSave: ExpeditionSave = { active: null, completedCount: currentSave.completedCount + 1 };
    const nextByPet = { ...expeditionsByPetRef.current, [petId]: nextSave };
    expeditionsByPetRef.current = nextByPet;
    setExpeditionsByPet(nextByPet);
    persistExpeditions(nextByPet);

    pushActivity([{
      id: makeActivityId(Date.now()),
      at: Date.now(),
      category: "expedition",
      title: `Expedition complete: ${def.name}`,
      detail: `+${result.coins + result.bonusCoins} coins, +${result.xp} XP${result.careItemId ? `, ${result.careItemId}` : ""}`,
      accent: "#7a5aff",
    }]);

    return result;
  }, [awardSkillPointsForDelta, pushActivity]);

  const chooseEvolutionPath = useCallback((path: EvolutionPath): boolean => {
    const current = creatureRef.current;
    if (!current) return false;
    if (current.evolutionPath) return false;
    const level = levelForXp(Math.floor(progressRef.current.totalXp));
    if (!needsEvolutionChoice(level, current.evolutionPath)) return false;
    const next: CreatureSave = { ...current, evolutionPath: path };
    creatureRef.current = next;
    setCreature(next);
    try {
      localStorage.setItem(CREATURE_KEY, JSON.stringify(next));
    } catch {
      /* ignore storage errors */
    }
    pushActivity([{
      id: makeActivityId(Date.now()),
      at: Date.now(),
      category: "evolution",
      title: `Evolution committed: ${EVOLUTION_PATHS[path].name}`,
      detail: EVOLUTION_PATHS[path].bonusLabel,
      accent: EVOLUTION_PATHS[path].accent,
    }]);
    return true;
  }, [pushActivity]);

  const damageContextRef = useCallback((): DamageContext => {
    const level = levelForXp(Math.floor(progressRef.current.totalXp));
    const gs = gearScore(
      loadoutFor(economyRef.current, creatureRef.current?.id),
      economyRef.current.upgrades,
    );
    return {
      level,
      gearScore: gs,
      evolutionPath: creatureRef.current?.evolutionPath ?? null,
      metrics: liveMetricsRef.current ?? EMPTY_METRICS,
      source: sourceRef.current === "live" ? "live" : "disconnected",
    };
  }, []);

  const applyBossDamage = useCallback((rawDamage: number): { damage: number; defeated: boolean; phase: number } | null => {
    const bossId = activeBossIdRef.current;
    const boss = getBoss(bossId);
    const save = bossSaveRef.current[bossId];
    if (!boss || !save || !save.unlocked || save.currentHp <= 0) return null;
    const phaseBefore = currentPhase(boss, save);
    const nextHp = Math.max(0, save.currentHp - rawDamage);
    const updatedProgress: BossProgress = {
      ...save,
      currentHp: nextHp,
      lastAttackAt: Date.now(),
    };
    let defeated = false;
    let phaseAfter = currentPhase(boss, updatedProgress);

    if (nextHp === 0) {
      defeated = true;
      const reward = rewardsForPhase(boss, boss.phases, true);
      const nextBossIndex = BOSSES.findIndex((b) => b.id === boss.id) + 1;
      const nextBoss = BOSSES[nextBossIndex];
      const newKills = save.kills + 1;
      const revived = reviveBoss(boss, save, newKills);
      updatedProgress.currentHp = revived.currentHp;
      updatedProgress.maxHp = revived.maxHp;
      updatedProgress.phasesCleared = 0;
      updatedProgress.kills = newKills;
      updatedProgress.unlocked = true;
      if (nextBoss) {
        const nextProgress = bossSaveRef.current[nextBoss.id];
        if (nextProgress && !nextProgress.unlocked) {
          bossSaveRef.current = {
            ...bossSaveRef.current,
            [nextBoss.id]: { ...nextProgress, unlocked: true },
          };
        }
      }
      const petId = creatureRef.current?.id;
      const discoveryEntries: ActivityEntry[] = [];
      if (petId) {
        const discoverySource: EepsiteDiscoverySource = `boss:${boss.id}` as EepsiteDiscoverySource;
        const discovered = eepsiteForDiscovery(discoverySource);
        if (discovered) {
          const currentEep = eepsitesByPetRef.current[petId] ?? createEepsiteSave();
          if (!currentEep.discovered.includes(discovered.id)) {
            const nextEepSave: EepsiteSave = {
              ...currentEep,
              discovered: [...currentEep.discovered, discovered.id],
            };
            const nextEepByPet = { ...eepsitesByPetRef.current, [petId]: nextEepSave };
            eepsitesByPetRef.current = nextEepByPet;
            setEepsitesByPet(nextEepByPet);
            persistEepsites(nextEepByPet);
            recordRouterEvents([{
              kind: "level" as const,
              severity: "info" as const,
              title: `Eepsite discovered: ${discovered.host}`,
              detail: `${discovered.name} unlocked for exploration.`,
              reaction: "Spark" as const,
            }]);
            discoveryEntries.push({
              id: makeActivityId(Date.now()),
              at: Date.now(),
              category: "discovery",
              title: `Eepsite discovered: ${discovered.host}`,
              detail: `${discovered.name} unlocked for exploration.`,
              accent: discovered.accent,
            });
          }
        }
      }
      pushActivity([
        {
          id: makeActivityId(Date.now()),
          at: Date.now(),
          category: "boss",
          title: `Boss defeated: ${boss.name}`,
          detail: `+${reward.coins} coins, +${reward.xp} XP · Kill ${newKills}`,
          accent: boss.accent,
        },
        ...discoveryEntries,
      ]);
      const nextEconomy: EconomySave = {
        ...economyRef.current,
        coins: economyRef.current.coins + reward.coins,
        totalEarned: economyRef.current.totalEarned + reward.coins,
        careInventory: reward.drops.length > 0
          ? [...economyRef.current.careInventory, ...reward.drops]
          : economyRef.current.careInventory,
      };
      economyRef.current = nextEconomy;
      setEconomy(nextEconomy);
      persistEconomy(nextEconomy);
      const beforeXp = progressRef.current.totalXp;
      const progressed: ProgressSave = {
        ...progressRef.current,
        totalXp: progressRef.current.totalXp + reward.xp,
        lastTickAt: Date.now(),
      };
      progressRef.current = progressed;
      setProgress(progressed);
      persistProgress(progressed);
      awardSkillPointsForDelta(beforeXp, progressed.totalXp);
      recordRouterEvents([{
        kind: "level" as const,
        severity: "info" as const,
        title: `Boss defeated: ${boss.name}`,
        detail: `+${reward.coins} coins, +${reward.xp} XP`,
        reaction: "Starry" as const,
      }]);
    } else {
      const phasesAdvanced = phaseAfter - phaseBefore;
      if (phasesAdvanced > 0) {
        updatedProgress.phasesCleared = Math.max(save.phasesCleared, phaseAfter);
        const reward = rewardsForPhase(boss, phaseAfter, false);
        const nextEconomy: EconomySave = {
          ...economyRef.current,
          coins: economyRef.current.coins + reward.coins,
          totalEarned: economyRef.current.totalEarned + reward.coins,
        };
        economyRef.current = nextEconomy;
        setEconomy(nextEconomy);
        persistEconomy(nextEconomy);
        const beforeXp = progressRef.current.totalXp;
        const progressed: ProgressSave = {
          ...progressRef.current,
          totalXp: progressRef.current.totalXp + reward.xp,
          lastTickAt: Date.now(),
        };
        progressRef.current = progressed;
        setProgress(progressed);
        persistProgress(progressed);
        awardSkillPointsForDelta(beforeXp, progressed.totalXp);
      }
    }

    const nextSave = { ...bossSaveRef.current, [bossId]: updatedProgress };
    bossSaveRef.current = nextSave;
    setBossSave(nextSave);
    persistBossSave(nextSave);
    return { damage: rawDamage, defeated, phase: defeated ? boss.phases : phaseAfter };
  }, [awardSkillPointsForDelta, pushActivity, recordRouterEvents]);

  applyBossDamageRef.current = applyBossDamage;

  // Auto-attack ticker — pet attacks the active boss automatically every cooldown cycle.
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!applyBossDamageRef.current) return;
      const bossId = activeBossIdRef.current;
      const save = bossSaveRef.current[bossId];
      if (!save || !save.unlocked || save.currentHp <= 0) return;
      const now = Date.now();
      if (now - save.lastAttackAt < ATTACK_COOLDOWN_MS) return;
      const ctx: DamageContext = {
        level: levelForXp(Math.floor(progressRef.current.totalXp)),
        gearScore: gearScore(
          loadoutFor(economyRef.current, creatureRef.current?.id),
          economyRef.current.upgrades,
        ),
        evolutionPath: creatureRef.current?.evolutionPath ?? null,
        metrics: liveMetricsRef.current ?? EMPTY_METRICS,
        source: sourceRef.current === "live" ? "live" : "disconnected",
      };
      const dmg = clickDamage(ctx);
      applyBossDamageRef.current(dmg);
    }, 250);
    return () => window.clearInterval(id);
  }, []);

  const useCareItemOnBoss = useCallback((itemId: string): { damage: number; defeated: boolean; phase: number } | null => {
    const item = getCareItem(itemId);
    if (!item) return null;
    if (!economyRef.current.careInventory.includes(itemId)) return null;
    const damage = itemDamage(item, damageContextRef());
    const result = applyBossDamage(damage);
    if (!result) return null;
    const nextEconomy: EconomySave = {
      ...economyRef.current,
      careInventory: economyRef.current.careInventory.filter((id) => id !== itemId),
    };
    economyRef.current = nextEconomy;
    setEconomy(nextEconomy);
    persistEconomy(nextEconomy);
    return result;
  }, [applyBossDamage, damageContextRef]);

  const setActiveBoss = useCallback((bossId: string) => {
    if (!bossSaveRef.current[bossId]?.unlocked) return;
    activeBossIdRef.current = bossId;
    setActiveBossIdState(bossId);
    try {
      localStorage.setItem(ACTIVE_BOSS_KEY, bossId);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const startEepsiteVisit = useCallback((eepsiteId: string): boolean => {
    const petId = creatureRef.current?.id;
    if (!petId) return false;
    const def = getEepsite(eepsiteId);
    if (!def) return false;
    const level = levelForXp(Math.floor(progressRef.current.totalXp));
    if (level < def.minLevel) return false;
    const currentForPet = eepsitesByPetRef.current[petId] ?? createEepsiteSave();
    if (currentForPet.active) return false;
    if (!currentForPet.discovered.includes(eepsiteId)) return false;
    const next: EepsiteSave = {
      ...currentForPet,
      active: {
        eepsiteId,
        startedAt: Date.now(),
        durationMs: def.durationMs,
        rushed: false,
      },
    };
    const nextByPet = { ...eepsitesByPetRef.current, [petId]: next };
    eepsitesByPetRef.current = nextByPet;
    setEepsitesByPet(nextByPet);
    persistEepsites(nextByPet);
    return true;
  }, []);

  const rushEepsiteVisit = useCallback((): boolean => {
    const petId = creatureRef.current?.id;
    if (!petId) return false;
    const current = eepsitesByPetRef.current[petId]?.active;
    if (!current) return false;
    const prog = eepsiteProgress(current);
    if (prog.complete) return false;
    const cost = rushCostEepsite(prog.remaining);
    if (economyRef.current.coins < cost) return false;
    const nextEconomy: EconomySave = {
      ...economyRef.current,
      coins: economyRef.current.coins - cost,
      totalSpent: economyRef.current.totalSpent + cost,
    };
    economyRef.current = nextEconomy;
    setEconomy(nextEconomy);
    persistEconomy(nextEconomy);
    const rushed: ActiveEepsite = { ...current, startedAt: Date.now() - current.durationMs, rushed: true };
    const nextSave: EepsiteSave = { ...(eepsitesByPetRef.current[petId] ?? createEepsiteSave()), active: rushed };
    const nextByPet = { ...eepsitesByPetRef.current, [petId]: nextSave };
    eepsitesByPetRef.current = nextByPet;
    setEepsitesByPet(nextByPet);
    persistEepsites(nextByPet);
    return true;
  }, []);

  const claimEepsiteVisit = useCallback((): { coins: number; xp: number; careItemId?: string; bonusCoins: number } | null => {
    const petId = creatureRef.current?.id;
    if (!petId) return null;
    const currentSave = eepsitesByPetRef.current[petId];
    const active = currentSave?.active;
    if (!active || !currentSave) return null;
    const prog = eepsiteProgress(active);
    if (!prog.complete) return null;
    const def = getEepsite(active.eepsiteId);
    if (!def) return null;
    const level = levelForXp(Math.floor(progressRef.current.totalXp));
    const path = creatureRef.current?.evolutionPath ?? null;
    const coinMult = 1 + (path ? EVOLUTION_PATHS[path].bonus.coinBonus ?? 0 : 0);
    const result = rollEepsiteRewards(def, level, coinMult);

    const nextEconomy: EconomySave = {
      ...economyRef.current,
      coins: economyRef.current.coins + result.coins + result.bonusCoins,
      totalEarned: economyRef.current.totalEarned + result.coins + result.bonusCoins,
      careInventory: result.careItemId
        ? [...economyRef.current.careInventory, result.careItemId]
        : economyRef.current.careInventory,
    };
    economyRef.current = nextEconomy;
    setEconomy(nextEconomy);
    persistEconomy(nextEconomy);

    const progressed: ProgressSave = {
      ...progressRef.current,
      totalXp: progressRef.current.totalXp + result.xp,
      lastTickAt: Date.now(),
    };
    const beforeXp = progressRef.current.totalXp;
    progressRef.current = progressed;
    setProgress(progressed);
    persistProgress(progressed);
    awardSkillPointsForDelta(beforeXp, progressed.totalXp);

    const nextSave: EepsiteSave = { ...currentSave, active: null, completedCount: currentSave.completedCount + 1 };
    const nextByPet = { ...eepsitesByPetRef.current, [petId]: nextSave };
    eepsitesByPetRef.current = nextByPet;
    setEepsitesByPet(nextByPet);
    persistEepsites(nextByPet);

    pushActivity([{
      id: makeActivityId(Date.now()),
      at: Date.now(),
      category: "eepsite",
      title: `Eepsite visit complete: ${def.host}`,
      detail: `+${result.coins + result.bonusCoins} coins, +${result.xp} XP${result.careItemId ? `, ${result.careItemId}` : ""}`,
      accent: def.accent,
    }]);

    return result;
  }, [awardSkillPointsForDelta, pushActivity]);

  useEffect(() => {
    if (!creature) return;
    const context = {
      metrics,
      progression,
      totalSkillsUnlocked: skills.unlocked.length,
      source,
      effectiveSharedBytes: progress.sharedBytes * currentGearEffects.dataMultiplier,
      coins: economy.coins,
      totalCoinsEarned: economy.totalEarned,
      totalCoinsSpent: economy.totalSpent,
      itemsOwned: economy.inventory.length,
      equippedSlots: Object.keys(activeEquipped).length,
      gearScore: currentGearScore,
      petsOwned: economy.ownedPets.length,
    };
    const newly = newlyUnlocked(context, new Set(unlockedAchievementsRef.current));
    if (newly.length === 0) return;

    const updated = [...unlockedAchievementsRef.current, ...newly];
    unlockedAchievementsRef.current = updated;
    setUnlockedAchievements(updated);
    persistAchievements(updated);
    setRecentAchievementId(newly[0]);

    const baseReward = achievementReward(newly);
    const reward = Math.round(
      baseReward * (1 + currentGearEffects.coinBonus + computeSkillBonuses(skills.unlocked).achievementCoinBonus),
    );
    if (reward > 0) {
      const nextEconomy: EconomySave = {
        ...economyRef.current,
        coins: economyRef.current.coins + reward,
        totalEarned: economyRef.current.totalEarned + reward,
      };
      economyRef.current = nextEconomy;
      setEconomy(nextEconomy);
      persistEconomy(nextEconomy);
    }
  }, [
    creature,
    metrics,
    progression,
    skills.unlocked.length,
    source,
    progress.sharedBytes,
    currentGearEffects,
    currentGearScore,
    economy.coins,
    economy.totalEarned,
    economy.totalSpent,
    economy.inventory.length,
    economy.ownedPets.length,
    activeEquipped,
  ]);

  const exportSnapshot = useCallback(() => {
    const snapshot = {
      schema: "netherloom-session-v1",
      exportedAt: new Date().toISOString(),
      source,
      metrics,
      history,
      preferences: {
        pollSeconds: settings.pollSeconds,
        mode,
        theme: settings.theme,
        timeWindow,
      },
      creature: creature
        ? {
            id: creature.id,
            name: creature.name,
            progression,
            unlockedSkills: skills.unlocked,
            achievements: unlockedAchievements,
            economy,
          }
        : null,
      privacy: "Abstract local router metrics only. No peer identities, routes, credentials or packet data.",
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `netherloom-session-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, [
    source,
    metrics,
    history,
    settings.pollSeconds,
    settings.theme,
    mode,
    timeWindow,
    creature,
    progression,
    skills.unlocked,
    unlockedAchievements,
    economy,
  ]);

  const creatureName = creature?.name ?? "";
  const creatureSprite = creature ? spriteForCreature(creature.id) : spriteForCreature("snail");
  const creatureFilter = creature ? filterForCreature(creature.id) : "none";

  const activeCareStats = creature ? careByPet[creature.id] ?? null : null;
  const activeCareBonuses = useMemo(() => deriveCareBonuses(activeCareStats), [activeCareStats]);

  const activeExpeditionSave = creature ? expeditionsByPet[creature.id] : undefined;
  const activeExpeditionEntry = useMemo(() => {
    const active = activeExpeditionSave?.active;
    if (!active) return null;
    const def = getExpedition(active.expeditionId);
    return def ? { expedition: def, active } : null;
  }, [activeExpeditionSave]);

  const activeEepsiteSave = creature ? eepsitesByPet[creature.id] : undefined;
  const activeEepsiteEntry = useMemo(() => {
    const active = activeEepsiteSave?.active;
    if (!active) return null;
    const def = getEepsite(active.eepsiteId);
    return def ? { eepsite: def, active } : null;
  }, [activeEepsiteSave]);

  const activeBossEntry = useMemo(() => {
    const id = activeBossId;
    const progress = bossSave[id];
    const boss = getBoss(id);
    return boss && progress ? { boss, progress } : null;
  }, [activeBossId, bossSave]);

  const bossAttackReadyAtValue = bossSave[activeBossId]?.lastAttackAt
    ? bossSave[activeBossId].lastAttackAt + ATTACK_COOLDOWN_MS
    : 0;

  const value: ObservatoryContextValue = {
    metrics,
    source,
    pluginAvailable,
    lastUpdated,
    history,
    peerCreatures,
    series,
    values,
    activeView,
    mode,
    theme: settings.theme,
    timeWindow,
    zoom,
    playback,
    replayPos,
    replayPlaying,
    creature,
    creatureName,
    creatureSprite,
    creatureFilter,
    progression,
    onboardingNeeded: creature === null,
    reactions,
    routerEvents,
    notificationsOpen,
    settings,
    connectionTest,
    setView,
    setMode,
    setTimeWindow: setTimeWindowState,
    setZoom,
    setPlayback,
    setReplayPos,
    toggleReplayPlaying,
    renameCreature,
    chooseCreature,
    toggleNotifications,
    closeNotifications,
    saveSettings,
    testConnection,
    exportSnapshot,
    skillBonuses: computeSkillBonuses(skills.unlocked),
    skillPointsAvailable: skills.pointsEarned - skills.unlocked.length,
    totalPointsEarned: skills.pointsEarned,
    unlockedSkills: skills.unlocked,
    achievements: unlockedAchievements,
    coins: economy.coins,
    totalCoinsEarned: economy.totalEarned,
    totalCoinsSpent: economy.totalSpent,
    inventory: economy.inventory,
    upgrades: economy.upgrades,
    loadouts: economy.loadouts,
    equipped: activeEquipped,
    equippedItems,
    quests,
    claimQuest,
    gearScore: currentGearScore,
    ownedPets: economy.ownedPets,
    recentAchievement: recentAchievementId ? getAchievement(recentAchievementId) ?? null : null,
    unlockSkill,
    respecSkills,
    dismissAchievement,
    purchaseItem,
    sellItem,
    upgradeItem,
    equipItem,
    unequipSlot,
    adoptPet,
    activatePet,
    care: activeCareStats,
    careByPet,
    careItems: CARE_ITEMS,
    careInventory: economy.careInventory,
    careBonuses: activeCareBonuses,
    performCareAction,
    purchaseCareItem,
    expeditions: EXPEDITIONS,
    expeditionsByPet,
    activeExpedition: activeExpeditionEntry,
    expeditionsCompleted: activeExpeditionSave?.completedCount ?? 0,
    startExpedition,
    rushExpedition,
    claimExpedition,
    evolutionPath: creature?.evolutionPath ?? null,
    needsEvolutionChoice: creature
      ? needsEvolutionChoice(levelForXp(Math.floor(progress.totalXp)), creature.evolutionPath ?? null)
      : false,
    chooseEvolutionPath,
    eepsites: EEPSITES,
    eepsitesByPet,
    activeEepsite: activeEepsiteEntry,
    eepsitesCompleted: activeEepsiteSave?.completedCount ?? 0,
    startEepsiteVisit,
    rushEepsiteVisit,
    claimEepsiteVisit,
    bosses: BOSSES,
    bossSave,
    activeBossId,
    activeBoss: activeBossEntry,
    useCareItemOnBoss,
    setActiveBoss,
    bossAttackReadyAt: bossAttackReadyAtValue,
    activityLog,
    pushActivity,
    clearActivity,
    offlineSummary,
    dismissOfflineSummary,
    autoCare,
    setAutoCare,
    guideSeen,
    markGuideSeen,
    guideOpen,
    setGuideOpen,
  };

  return <ObservatoryContext.Provider value={value}>{children}</ObservatoryContext.Provider>;
}

function appendSample(prev: Series, m: RouterMetrics): Series {
  const trim = (arr: number[], v: number) => [...arr, v].slice(-HISTORY_LENGTH);
  return {
    inbound: trim(prev.inbound, +(m.inboundBps / (1024 * 1024)).toFixed(2)),
    outbound: trim(prev.outbound, +(m.outboundBps / (1024 * 1024)).toFixed(2)),
    tunnels: trim(prev.tunnels, m.participatingTunnels),
    peers: trim(prev.peers, m.activePeers),
  };
}

export function useObservatory(): ObservatoryContextValue {
  const ctx = useContext(ObservatoryContext);
  if (!ctx) throw new Error("useObservatory must be used within ObservatoryProvider");
  return ctx;
}
