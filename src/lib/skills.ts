import { itemSprites, skillSprites } from "../data";

export type SkillBranch =
  | "resonance"
  | "conduit"
  | "vitality"
  | "discovery"
  | "stewardship";

export type SkillNodeSize = "minor" | "notable" | "keystone";

export interface SkillEffects {
  skillPointsPerLevel?: number;
  skillPointMultiplier?: number;
  dataSharedBonus?: number;
  energyFloorBonus?: number;
  moodBiasBonus?: number;
  xpBonus?: number;
  achievementCoinBonus?: number;
  dataSharedGrantsXp?: boolean;
  moodFloor?: string;
}

export interface SkillNode {
  id: string;
  branch: SkillBranch;
  tier: number;
  name: string;
  description: string;
  icon: string;
  size: SkillNodeSize;
  x: number;
  y: number;
  prerequisites: string[];
  effects: SkillEffects;
  requiresAchievement?: string;
  requiresLevel?: number;
}

export interface SkillBonuses {
  skillPointsPerLevel: number;
  dataSharedMultiplier: number;
  energyFloorBonus: number;
  moodBiasBonus: number;
  xpMultiplier: number;
  achievementCoinBonus: number;
  dataSharedGrantsXp: boolean;
  moodFloor: string | null;
}

export const SKILL_CANVAS = {
  width: 2200,
  height: 1900,
  centerX: 1100,
  centerY: 950,
} as const;

export const BRANCH_META: Record<
  SkillBranch,
  { name: string; tagline: string; color: string; angle: number }
> = {
  resonance: {
    name: "Resonance",
    tagline: "Learning and skill-point growth",
    color: "#36b8ff",
    angle: -90,
  },
  conduit: {
    name: "Conduit",
    tagline: "Bandwidth and shared-data flow",
    color: "#a66cff",
    angle: -18,
  },
  vitality: {
    name: "Vitality",
    tagline: "Energy and emotional resilience",
    color: "#55dc72",
    angle: 54,
  },
  discovery: {
    name: "Discovery",
    tagline: "Peer exploration and contribution XP",
    color: "#f2c94c",
    angle: 126,
  },
  stewardship: {
    name: "Stewardship",
    tagline: "Achievements and long-term rewards",
    color: "#ff795f",
    angle: 198,
  },
};

export const EMPTY_BONUSES: SkillBonuses = {
  skillPointsPerLevel: 1,
  dataSharedMultiplier: 1,
  energyFloorBonus: 0,
  moodBiasBonus: 0,
  xpMultiplier: 1,
  achievementCoinBonus: 0,
  dataSharedGrantsXp: false,
  moodFloor: null,
};

type NodeSeed = {
  suffix: string;
  name: string;
  description: string;
  icon: string;
  effects: SkillEffects;
};

type SideSeed = NodeSeed & {
  parentTier: number;
  side: -1 | 1;
  spread?: number;
};

type BranchSeed = {
  core: NodeSeed[];
  sides: SideSeed[];
  keystone: Omit<NodeSeed, "suffix"> & {
    icon: string;
    requiresAchievement?: string;
    requiresLevel?: number;
  };
};

const CORE_DISTANCES = [145, 245, 350, 460, 575, 690];

function skillIcon(name: string): string {
  return (skillSprites.find((sprite) => sprite.name === name) ?? skillSprites[0]).src;
}

function itemIcon(name: string): string {
  return (itemSprites.find((sprite) => sprite.name === name) ?? itemSprites[0]).src;
}

function point(angle: number, distance: number, perpendicular = 0): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180;
  return {
    x: Math.round(
      SKILL_CANVAS.centerX + Math.cos(radians) * distance - Math.sin(radians) * perpendicular,
    ),
    y: Math.round(
      SKILL_CANVAS.centerY + Math.sin(radians) * distance + Math.cos(radians) * perpendicular,
    ),
  };
}

const BRANCH_SEEDS: Record<SkillBranch, BranchSeed> = {
  resonance: {
    core: [
      { suffix: "t1", name: "Whisper", description: "+2% contribution XP", icon: "Radar", effects: { xpBonus: 0.02 } },
      { suffix: "t2", name: "Attunement", description: "+1 skill point per level", icon: "Tunnel", effects: { skillPointsPerLevel: 1 } },
      { suffix: "t3", name: "Harmonic Pulse", description: "+3% contribution XP", icon: "Orbit", effects: { xpBonus: 0.03 } },
      { suffix: "t4", name: "Overtone", description: "+1 skill point per level", icon: "Star", effects: { skillPointsPerLevel: 1 } },
      { suffix: "t5", name: "Deep Chorus", description: "+5% contribution XP", icon: "Burst", effects: { xpBonus: 0.05 } },
      { suffix: "t6", name: "Perfect Sync", description: "+1 skill point per level", icon: "Network", effects: { skillPointsPerLevel: 1 } },
    ],
    sides: [
      { suffix: "echo-loop", parentTier: 2, side: -1, name: "Echo Loop", description: "+2% contribution XP", icon: "Cyan Star", effects: { xpBonus: 0.02 } },
      { suffix: "quiet-study", parentTier: 2, side: 1, name: "Quiet Study", description: "+3% achievement coins", icon: "Gold Star", effects: { achievementCoinBonus: 0.03 } },
      { suffix: "signal-prism", parentTier: 3, side: -1, name: "Signal Prism", description: "+3% shared data", icon: "Diamond", effects: { dataSharedBonus: 0.03 } },
      { suffix: "memory-lattice", parentTier: 3, side: 1, name: "Memory Lattice", description: "Mood bias +0.25", icon: "Pink Gem", effects: { moodBiasBonus: 0.25 } },
      { suffix: "chorus-gate", parentTier: 4, side: -1, name: "Chorus Gate", description: "+4% contribution XP", icon: "Network", effects: { xpBonus: 0.04 } },
      { suffix: "patient-mind", parentTier: 4, side: 1, name: "Patient Mind", description: "Energy floor +2", icon: "Heart", effects: { energyFloorBonus: 2 } },
      { suffix: "luminous-thought", parentTier: 5, side: -1, name: "Luminous Thought", description: "+4% achievement coins", icon: "Badge", effects: { achievementCoinBonus: 0.04 } },
      { suffix: "second-voice", parentTier: 5, side: 1, name: "Second Voice", description: "+4% shared data", icon: "Emerald", effects: { dataSharedBonus: 0.04 } },
    ],
    keystone: {
      name: "Transcendence",
      description: "Doubles skill points gained on future level-ups",
      icon: "Crown",
      effects: { skillPointMultiplier: 2 },
      requiresAchievement: "evolution_6",
    },
  },
  conduit: {
    core: [
      { suffix: "t1", name: "Flow", description: "+4% shared data", icon: "Shield", effects: { dataSharedBonus: 0.04 } },
      { suffix: "t2", name: "Channel", description: "+5% shared data", icon: "Coin", effects: { dataSharedBonus: 0.05 } },
      { suffix: "t3", name: "Current", description: "+6% shared data", icon: "Leaf", effects: { dataSharedBonus: 0.06 } },
      { suffix: "t4", name: "Relay Vein", description: "+7% shared data", icon: "Alert", effects: { dataSharedBonus: 0.07 } },
      { suffix: "t5", name: "Open Conduit", description: "+8% shared data", icon: "Paw", effects: { dataSharedBonus: 0.08 } },
      { suffix: "t6", name: "Aperture", description: "+10% shared data", icon: "Emerald", effects: { dataSharedBonus: 0.1 } },
    ],
    sides: [
      { suffix: "packet-bloom", parentTier: 2, side: -1, name: "Packet Bloom", description: "+2% contribution XP", icon: "Burst", effects: { xpBonus: 0.02 } },
      { suffix: "steady-current", parentTier: 2, side: 1, name: "Steady Current", description: "Energy floor +2", icon: "Heart", effects: { energyFloorBonus: 2 } },
      { suffix: "relay-memory", parentTier: 3, side: -1, name: "Relay Memory", description: "+4% shared data", icon: "Orbit", effects: { dataSharedBonus: 0.04 } },
      { suffix: "soft-capacity", parentTier: 3, side: 1, name: "Soft Capacity", description: "Mood bias +0.25", icon: "Pink Gem", effects: { moodBiasBonus: 0.25 } },
      { suffix: "tunnel-rhythm", parentTier: 4, side: -1, name: "Tunnel Rhythm", description: "+3% contribution XP", icon: "Tunnel", effects: { xpBonus: 0.03 } },
      { suffix: "shared-purpose", parentTier: 4, side: 1, name: "Shared Purpose", description: "+4% achievement coins", icon: "Badge", effects: { achievementCoinBonus: 0.04 } },
      { suffix: "wide-channel", parentTier: 5, side: -1, name: "Wide Channel", description: "+5% shared data", icon: "Lightning", effects: { dataSharedBonus: 0.05 } },
      { suffix: "quiet-relay", parentTier: 5, side: 1, name: "Quiet Relay", description: "Energy floor +3", icon: "Shield", effects: { energyFloorBonus: 3 } },
    ],
    keystone: {
      name: "Bandwidth Heart",
      description: "Every megabyte shared also grants contribution XP",
      icon: "Relay",
      effects: { dataSharedGrantsXp: true },
      requiresAchievement: "bandwidth_6",
    },
  },
  vitality: {
    core: [
      { suffix: "t1", name: "Warmth", description: "Energy floor +3", icon: "Diamond", effects: { energyFloorBonus: 3 } },
      { suffix: "t2", name: "Steady", description: "Mood bias +0.25", icon: "Badge", effects: { moodBiasBonus: 0.25 } },
      { suffix: "t3", name: "Resilient", description: "Energy floor +4", icon: "Pink Gem", effects: { energyFloorBonus: 4 } },
      { suffix: "t4", name: "Bloom", description: "Mood bias +0.35", icon: "Heart", effects: { moodBiasBonus: 0.35 } },
      { suffix: "t5", name: "Vital", description: "Energy floor +5", icon: "Star", effects: { energyFloorBonus: 5 } },
      { suffix: "t6", name: "Eternal", description: "Mood bias +0.5", icon: "Portal", effects: { moodBiasBonus: 0.5 } },
    ],
    sides: [
      { suffix: "calm-breath", parentTier: 2, side: -1, name: "Calm Breath", description: "Mood bias +0.2", icon: "Heart", effects: { moodBiasBonus: 0.2 } },
      { suffix: "bright-shell", parentTier: 2, side: 1, name: "Bright Shell", description: "Energy floor +2", icon: "Shield", effects: { energyFloorBonus: 2 } },
      { suffix: "rooted-signal", parentTier: 3, side: -1, name: "Rooted Signal", description: "+3% shared data", icon: "Leaf", effects: { dataSharedBonus: 0.03 } },
      { suffix: "gentle-focus", parentTier: 3, side: 1, name: "Gentle Focus", description: "+2% contribution XP", icon: "Radar", effects: { xpBonus: 0.02 } },
      { suffix: "living-circuit", parentTier: 4, side: -1, name: "Living Circuit", description: "Energy floor +3", icon: "Network", effects: { energyFloorBonus: 3 } },
      { suffix: "contented-heart", parentTier: 4, side: 1, name: "Contented Heart", description: "Mood bias +0.3", icon: "Gold Star", effects: { moodBiasBonus: 0.3 } },
      { suffix: "deep-rest", parentTier: 5, side: -1, name: "Deep Rest", description: "Energy floor +4", icon: "Orbit", effects: { energyFloorBonus: 4 } },
      { suffix: "joyful-duty", parentTier: 5, side: 1, name: "Joyful Duty", description: "+4% achievement coins", icon: "Coin", effects: { achievementCoinBonus: 0.04 } },
    ],
    keystone: {
      name: "Ancient Bond",
      description: "Your companion's mood can never fall below Content",
      icon: "Sprout",
      effects: { moodFloor: "Content" },
      requiresAchievement: "evolution_8",
    },
  },
  discovery: {
    core: [
      { suffix: "t1", name: "First Contact", description: "+3% contribution XP", icon: "Radar", effects: { xpBonus: 0.03 } },
      { suffix: "t2", name: "NetDB Compass", description: "+4% contribution XP", icon: "Network", effects: { xpBonus: 0.04 } },
      { suffix: "t3", name: "Peer Trail", description: "+4% shared data", icon: "Paw", effects: { dataSharedBonus: 0.04 } },
      { suffix: "t4", name: "Far Signal", description: "+5% contribution XP", icon: "Orbit", effects: { xpBonus: 0.05 } },
      { suffix: "t5", name: "Open Horizon", description: "+5% shared data", icon: "Star", effects: { dataSharedBonus: 0.05 } },
      { suffix: "t6", name: "Cartographer", description: "+7% contribution XP", icon: "Diamond", effects: { xpBonus: 0.07 } },
    ],
    sides: [
      { suffix: "patient-scout", parentTier: 2, side: -1, name: "Patient Scout", description: "Mood bias +0.2", icon: "Leaf", effects: { moodBiasBonus: 0.2 } },
      { suffix: "new-handshake", parentTier: 2, side: 1, name: "New Handshake", description: "+3% achievement coins", icon: "Badge", effects: { achievementCoinBonus: 0.03 } },
      { suffix: "hidden-path", parentTier: 3, side: -1, name: "Hidden Path", description: "+3% contribution XP", icon: "Tunnel", effects: { xpBonus: 0.03 } },
      { suffix: "peer-memory", parentTier: 3, side: 1, name: "Peer Memory", description: "+3% shared data", icon: "Emerald", effects: { dataSharedBonus: 0.03 } },
      { suffix: "signal-cache", parentTier: 4, side: -1, name: "Signal Cache", description: "+4% achievement coins", icon: "Gold Star", effects: { achievementCoinBonus: 0.04 } },
      { suffix: "restless-map", parentTier: 4, side: 1, name: "Restless Map", description: "+4% contribution XP", icon: "Alert", effects: { xpBonus: 0.04 } },
      { suffix: "wide-netdb", parentTier: 5, side: -1, name: "Wide NetDB", description: "+5% shared data", icon: "Burst", effects: { dataSharedBonus: 0.05 } },
      { suffix: "trusted-route", parentTier: 5, side: 1, name: "Trusted Route", description: "Energy floor +3", icon: "Shield", effects: { energyFloorBonus: 3 } },
    ],
    keystone: {
      name: "Living Atlas",
      description: "+30% contribution XP while exploring the network",
      icon: "Lens",
      effects: { xpBonus: 0.3 },
      requiresAchievement: "peers_6",
    },
  },
  stewardship: {
    core: [
      { suffix: "t1", name: "First Offering", description: "+3% achievement coins", icon: "Coin", effects: { achievementCoinBonus: 0.03 } },
      { suffix: "t2", name: "Caretaker", description: "+4% achievement coins", icon: "Heart", effects: { achievementCoinBonus: 0.04 } },
      { suffix: "t3", name: "Shared Burden", description: "+3% shared data", icon: "Shield", effects: { dataSharedBonus: 0.03 } },
      { suffix: "t4", name: "Long Watch", description: "+5% achievement coins", icon: "Radar", effects: { achievementCoinBonus: 0.05 } },
      { suffix: "t5", name: "Network Patron", description: "+5% contribution XP", icon: "Gold Star", effects: { xpBonus: 0.05 } },
      { suffix: "t6", name: "Loom Warden", description: "+7% achievement coins", icon: "Badge", effects: { achievementCoinBonus: 0.07 } },
    ],
    sides: [
      { suffix: "careful-ledger", parentTier: 2, side: -1, name: "Careful Ledger", description: "+3% achievement coins", icon: "Coin", effects: { achievementCoinBonus: 0.03 } },
      { suffix: "warm-welcome", parentTier: 2, side: 1, name: "Warm Welcome", description: "Mood bias +0.2", icon: "Heart", effects: { moodBiasBonus: 0.2 } },
      { suffix: "relay-oath", parentTier: 3, side: -1, name: "Relay Oath", description: "+3% contribution XP", icon: "Network", effects: { xpBonus: 0.03 } },
      { suffix: "open-paw", parentTier: 3, side: 1, name: "Open Paw", description: "+3% shared data", icon: "Paw", effects: { dataSharedBonus: 0.03 } },
      { suffix: "patient-vault", parentTier: 4, side: -1, name: "Patient Vault", description: "+4% achievement coins", icon: "Diamond", effects: { achievementCoinBonus: 0.04 } },
      { suffix: "steady-duty", parentTier: 4, side: 1, name: "Steady Duty", description: "Energy floor +3", icon: "Shield", effects: { energyFloorBonus: 3 } },
      { suffix: "generous-current", parentTier: 5, side: -1, name: "Generous Current", description: "+4% shared data", icon: "Lightning", effects: { dataSharedBonus: 0.04 } },
      { suffix: "lasting-bond", parentTier: 5, side: 1, name: "Lasting Bond", description: "Mood bias +0.3", icon: "Pink Gem", effects: { moodBiasBonus: 0.3 } },
    ],
    keystone: {
      name: "Common Wealth",
      description: "+35% coins from future achievements",
      icon: "Bell",
      effects: { achievementCoinBonus: 0.35 },
      requiresAchievement: "tunnel_builder_6",
    },
  },
};

function buildBranch(branch: SkillBranch): SkillNode[] {
  const seed = BRANCH_SEEDS[branch];
  const meta = BRANCH_META[branch];
  const core = seed.core.map((node, index) => {
    const tier = index + 1;
    return {
      id: `${branch}.${node.suffix}`,
      branch,
      tier,
      name: node.name,
      description: node.description,
      icon: skillIcon(node.icon),
      size: tier === 3 || tier === 6 ? "notable" as const : "minor" as const,
      ...point(meta.angle, CORE_DISTANCES[index]),
      prerequisites: tier === 1 ? [] : [`${branch}.t${tier - 1}`],
      effects: node.effects,
    };
  });

  const sides = seed.sides.map((node, index) => {
    const parentDistance = CORE_DISTANCES[node.parentTier - 1];
    const spread = node.spread ?? 105 + (index % 2) * 18;
    return {
      id: `${branch}.${node.suffix}`,
      branch,
      tier: node.parentTier,
      name: node.name,
      description: node.description,
      icon: skillIcon(node.icon),
      size: "minor" as const,
      ...point(meta.angle, parentDistance + 34, node.side * spread),
      prerequisites: [`${branch}.t${node.parentTier}`],
      effects: node.effects,
    };
  });

  const keystone = {
    id: `${branch}.k`,
    branch,
    tier: 7,
    name: seed.keystone.name,
    description: seed.keystone.description,
    icon: itemIcon(seed.keystone.icon),
    size: "keystone" as const,
    ...point(meta.angle, 820),
    prerequisites: [`${branch}.t6`],
    effects: seed.keystone.effects,
    requiresAchievement: seed.keystone.requiresAchievement,
    requiresLevel: seed.keystone.requiresLevel,
  };

  return [...core, ...sides, keystone];
}

export const SKILL_TREE: SkillNode[] = (
  Object.keys(BRANCH_META) as SkillBranch[]
).flatMap(buildBranch);

export const SKILL_BY_ID = new Map(SKILL_TREE.map((node) => [node.id, node] as const));

export function nodesByBranch(branch: SkillBranch): SkillNode[] {
  return SKILL_TREE.filter((node) => node.branch === branch);
}

export function maxTierUnlocked(unlocked: ReadonlySet<string>, branch: SkillBranch): number {
  let max = 0;
  for (const id of unlocked) {
    const node = SKILL_BY_ID.get(id);
    if (node?.branch === branch && node.tier > max) max = node.tier;
  }
  return max;
}

export type UnlockFailure =
  | "already_unlocked"
  | "requires_node"
  | "no_points"
  | "requires_level"
  | "requires_achievement";

export interface UnlockCheck {
  ok: boolean;
  reason?: UnlockFailure;
}

export function canUnlock(
  node: SkillNode,
  unlocked: ReadonlySet<string>,
  pointsAvailable: number,
  level: number,
  unlockedAchievements: ReadonlySet<string>,
): UnlockCheck {
  if (unlocked.has(node.id)) return { ok: false, reason: "already_unlocked" };
  if (node.prerequisites.some((id) => !unlocked.has(id))) {
    return { ok: false, reason: "requires_node" };
  }
  if (pointsAvailable < 1) return { ok: false, reason: "no_points" };
  if (node.requiresLevel != null && level < node.requiresLevel) {
    return { ok: false, reason: "requires_level" };
  }
  if (node.requiresAchievement != null && !unlockedAchievements.has(node.requiresAchievement)) {
    return { ok: false, reason: "requires_achievement" };
  }
  return { ok: true };
}

export function computeSkillBonuses(unlocked: ReadonlyArray<string>): SkillBonuses {
  let skillPointsPerLevel = 1;
  let skillPointMultiplier = 1;
  let dataSharedBonus = 0;
  let energyFloorBonus = 0;
  let moodBiasBonus = 0;
  let xpBonus = 0;
  let achievementCoinBonus = 0;
  let dataSharedGrantsXp = false;
  let moodFloor: string | null = null;

  for (const id of unlocked) {
    const effects = SKILL_BY_ID.get(id)?.effects;
    if (!effects) continue;
    skillPointsPerLevel += effects.skillPointsPerLevel ?? 0;
    skillPointMultiplier *= effects.skillPointMultiplier ?? 1;
    dataSharedBonus += effects.dataSharedBonus ?? 0;
    energyFloorBonus += effects.energyFloorBonus ?? 0;
    moodBiasBonus += effects.moodBiasBonus ?? 0;
    xpBonus += effects.xpBonus ?? 0;
    achievementCoinBonus += effects.achievementCoinBonus ?? 0;
    dataSharedGrantsXp ||= effects.dataSharedGrantsXp === true;
    moodFloor = effects.moodFloor ?? moodFloor;
  }

  return {
    skillPointsPerLevel: Math.max(1, Math.round(skillPointsPerLevel * skillPointMultiplier)),
    dataSharedMultiplier: 1 + dataSharedBonus,
    energyFloorBonus,
    moodBiasBonus,
    xpMultiplier: 1 + xpBonus,
    achievementCoinBonus,
    dataSharedGrantsXp,
    moodFloor,
  };
}
