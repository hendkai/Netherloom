import type { DataSource, RouterMetrics } from "./observatory";
import type { Progression } from "./progression";

export type AchievementCategory =
  | "general"
  | "tunnels"
  | "bandwidth"
  | "peers"
  | "uptime"
  | "evolution"
  | "skills"
  | "economy"
  | "gear"
  | "collection";

export interface AchievementContext {
  metrics: RouterMetrics;
  progression: Progression | null;
  totalSkillsUnlocked: number;
  source: DataSource;
  effectiveSharedBytes: number;
  coins: number;
  totalCoinsEarned: number;
  totalCoinsSpent: number;
  itemsOwned: number;
  equippedSlots: number;
  gearScore: number;
  petsOwned: number;
}

export interface AchievementProgress {
  current: number;
  target: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  tier?: number;
  rewardCoins: number;
  requiresLive?: boolean;
  check: (ctx: AchievementContext) => boolean;
  progress?: (ctx: AchievementContext) => AchievementProgress | null;
}

export const CATEGORY_META: Record<AchievementCategory, { label: string; order: number }> = {
  general: { label: "General", order: 0 },
  tunnels: { label: "Tunnels", order: 1 },
  bandwidth: { label: "Bandwidth", order: 2 },
  peers: { label: "Peers", order: 3 },
  uptime: { label: "Uptime", order: 4 },
  evolution: { label: "Evolution", order: 5 },
  skills: { label: "Skills", order: 6 },
  economy: { label: "Economy", order: 7 },
  gear: { label: "Gear", order: 8 },
  collection: { label: "Pet Collection", order: 9 },
};

const MB = 1024 * 1024;
const GB = MB * 1024;
const HOUR = 3_600_000;
const DAY = HOUR * 24;

function clamp(value: number, target: number): number {
  return Math.max(0, Math.min(target, value));
}

function tiered(options: {
  prefix: string;
  names: string[];
  category: AchievementCategory;
  thresholds: number[];
  unit: string;
  value: (ctx: AchievementContext) => number;
  rewardBase: number;
  requiresLive?: boolean;
}): Achievement[] {
  return options.thresholds.map((target, index) => ({
    id: `${options.prefix}_${index + 1}`,
    name: `${options.names[index] ?? options.names[options.names.length - 1]} ${index + 1}`,
    description: `Reach ${target.toLocaleString("en-US")} ${options.unit}.`,
    category: options.category,
    tier: index + 1,
    rewardCoins: Math.round(options.rewardBase * Math.pow(1.55, index)),
    requiresLive: options.requiresLive,
    check: (ctx) => options.value(ctx) >= target,
    progress: (ctx) => ({ current: clamp(options.value(ctx), target), target }),
  }));
}

const tunnelAchievements = tiered({
  prefix: "tunnel_builder",
  names: ["Pathfinder", "Tunnel Builder", "Relay Crafter", "Circuit Warden"],
  category: "tunnels",
  thresholds: [1, 10, 25, 50, 100, 200, 400, 750, 1_000, 1_500],
  unit: "participating tunnels",
  value: (ctx) => ctx.metrics.participatingTunnels,
  rewardBase: 30,
  requiresLive: true,
});

const bandwidthAchievements = tiered({
  prefix: "bandwidth",
  names: ["First Packet", "Bandwidth Buddy", "Flow Keeper", "Bandwidth Tycoon"],
  category: "bandwidth",
  thresholds: [25, 100, 512, 1_024, 5_120, 10_240, 51_200, 102_400, 512_000, 1_048_576],
  unit: "MB shared",
  value: (ctx) => ctx.effectiveSharedBytes / MB,
  rewardBase: 35,
  requiresLive: true,
});

const peerAchievements = tiered({
  prefix: "peers",
  names: ["Handshake", "Peer Scout", "Social Router", "NetDb Sage"],
  category: "peers",
  thresholds: [10, 25, 50, 100, 250, 500, 1_000, 1_500, 2_500, 5_000],
  unit: "known peers",
  value: (ctx) => ctx.metrics.knownPeers,
  rewardBase: 30,
  requiresLive: true,
});

const uptimeAchievements = tiered({
  prefix: "uptime",
  names: ["Warm Start", "Steady Signal", "Marathon", "Always On"],
  category: "uptime",
  thresholds: [1, 6, 12, 24, 72, 168, 336, 720, 2_160, 8_760],
  unit: "router hours",
  value: (ctx) => ctx.metrics.uptimeMs / HOUR,
  rewardBase: 40,
  requiresLive: true,
});

const evolutionAchievements = tiered({
  prefix: "evolution",
  names: ["Hatched", "Sprout Relay", "Tunnel Scout", "Relay Warden"],
  category: "evolution",
  thresholds: [1, 5, 10, 15, 20, 30, 40, 50, 75, 100],
  unit: "pet levels",
  value: (ctx) => ctx.progression?.level ?? 0,
  rewardBase: 50,
});

const skillAchievements = tiered({
  prefix: "skills",
  names: ["First Insight", "Skill Student", "Skill Sage", "Master Builder"],
  category: "skills",
  thresholds: [1, 5, 10, 20, 30, 45, 60, 75],
  unit: "skills unlocked",
  value: (ctx) => ctx.totalSkillsUnlocked,
  rewardBase: 45,
});

const earnedAchievements = tiered({
  prefix: "coin_earned",
  names: ["Pocket Change", "Coin Keeper", "Loom Treasurer", "Network Magnate"],
  category: "economy",
  thresholds: [1_000, 2_500, 5_000, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000, 1_000_000],
  unit: "coins earned",
  value: (ctx) => ctx.totalCoinsEarned,
  rewardBase: 40,
});

const spentAchievements = tiered({
  prefix: "coin_spent",
  names: ["Window Shopper", "Collector", "Patron", "Market Legend"],
  category: "economy",
  thresholds: [100, 500, 1_000, 2_500, 5_000, 10_000, 25_000, 50_000],
  unit: "coins spent",
  value: (ctx) => ctx.totalCoinsSpent,
  rewardBase: 35,
});

const gearScoreAchievements = tiered({
  prefix: "gear_score",
  names: ["Suited Up", "Well Equipped", "Relic Bearer", "Mythic Loadout"],
  category: "gear",
  thresholds: [25, 75, 150, 250, 400, 600, 800, 1_000, 1_250, 1_500],
  unit: "gear score",
  value: (ctx) => ctx.gearScore,
  rewardBase: 50,
});

const itemAchievements = tiered({
  prefix: "items_owned",
  names: ["First Find", "Full Pack", "Vault Keeper", "Armory Curator"],
  category: "gear",
  thresholds: [1, 4, 8, 16, 32, 48, 64],
  unit: "items owned",
  value: (ctx) => ctx.itemsOwned,
  rewardBase: 35,
});

const petAchievements = tiered({
  prefix: "pets_owned",
  names: ["New Friend", "Pet Keeper", "Menagerie", "Atlas Master"],
  category: "collection",
  thresholds: [1, 3, 10, 25, 50, 100, 250, 500, 750, 1_000, 1_500],
  unit: "pets adopted",
  value: (ctx) => ctx.petsOwned,
  rewardBase: 55,
});

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first_steps",
    name: "First Steps",
    description: "Connect to your live I2P router.",
    category: "general",
    rewardCoins: 60,
    requiresLive: true,
    check: (ctx) => ctx.source === "live",
  },
  {
    id: "first_companion",
    name: "A Companion Appears",
    description: "Hatch your first Netherloom pet.",
    category: "general",
    rewardCoins: 40,
    check: (ctx) => ctx.petsOwned >= 1,
  },
  {
    id: "balanced_loadout",
    name: "Four Corners",
    description: "Equip all four gear slots.",
    category: "general",
    rewardCoins: 150,
    check: (ctx) => ctx.equippedSlots === 4,
  },
  {
    id: "coin_reserve",
    name: "Emergency Reserve",
    description: "Hold 5,000 coins at once.",
    category: "general",
    rewardCoins: 150,
    check: (ctx) => ctx.coins >= 5_000,
    progress: (ctx) => ({ current: clamp(ctx.coins, 5_000), target: 5_000 }),
  },
  ...tunnelAchievements,
  ...bandwidthAchievements,
  ...peerAchievements,
  ...uptimeAchievements,
  ...evolutionAchievements,
  ...skillAchievements,
  ...earnedAchievements,
  ...spentAchievements,
  ...gearScoreAchievements,
  ...itemAchievements,
  ...petAchievements,
];

const BY_ID = new Map(ACHIEVEMENTS.map((achievement) => [achievement.id, achievement] as const));

export function getAchievement(id: string): Achievement | undefined {
  return BY_ID.get(id);
}

export function achievementReward(ids: readonly string[]): number {
  return ids.reduce((sum, id) => sum + (BY_ID.get(id)?.rewardCoins ?? 0), 0);
}

export function newlyUnlocked(
  ctx: AchievementContext,
  alreadyUnlocked: ReadonlySet<string>,
): string[] {
  const unlocked: string[] = [];
  for (const achievement of ACHIEVEMENTS) {
    if (alreadyUnlocked.has(achievement.id)) continue;
    if (achievement.requiresLive && ctx.source !== "live") continue;
    if (achievement.check(ctx)) unlocked.push(achievement.id);
  }
  return unlocked;
}

export const ACHIEVEMENT_COUNT = ACHIEVEMENTS.length;
export const MAX_TRACKED_UPTIME_DAYS = Math.round((8_760 * HOUR) / DAY);
export const MAX_TRACKED_BANDWIDTH_GB = Math.round(1_048_576 / 1024);
