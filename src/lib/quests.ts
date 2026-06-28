export type QuestPeriod = "daily" | "weekly";
export type QuestMetric =
  | "xpEarned"
  | "dataSharedGB"
  | "coinsEarned"
  | "peakTunnels"
  | "uptimeHours"
  | "level"
  | "connect";

export interface QuestDef {
  id: string;
  period: QuestPeriod;
  title: string;
  description: string;
  metric: QuestMetric;
  target: number;
  reward: number;
}

export interface QuestBaseline {
  totalXp: number;
  sharedBytes: number;
  totalEarned: number;
}

export interface QuestState {
  dayKey: string;
  weekKey: string;
  dailyBaseline: QuestBaseline;
  weeklyBaseline: QuestBaseline;
  claimed: string[]; // instance ids
}

export interface QuestContext {
  totalXp: number;
  sharedBytes: number;
  totalEarned: number;
  participatingTunnels: number;
  uptimeMs: number;
  level: number;
  connected: boolean;
}

export interface QuestInstance {
  instanceId: string;
  def: QuestDef;
  current: number;
  target: number;
  pct: number;
  claimed: boolean;
  completable: boolean;
}

const GB = 1024 * 1024 * 1024;

const DAILY_POOL: QuestDef[] = [
  { id: "d_xp", period: "daily", metric: "xpEarned", target: 600, reward: 250, title: "Daily Grind", description: "Earn 600 XP today." },
  { id: "d_data", period: "daily", metric: "dataSharedGB", target: 2, reward: 300, title: "Bandwidth Donor", description: "Share 2 GB of data today." },
  { id: "d_tunnels", period: "daily", metric: "peakTunnels", target: 40, reward: 220, title: "Tunnel Hauler", description: "Carry 40 participating tunnels at once." },
  { id: "d_connect", period: "daily", metric: "connect", target: 1, reward: 120, title: "Check In", description: "Connect to your router today." },
  { id: "d_uptime", period: "daily", metric: "uptimeHours", target: 6, reward: 200, title: "Steady Relay", description: "Reach 6 hours of router uptime." },
];

const WEEKLY_POOL: QuestDef[] = [
  { id: "w_xp", period: "weekly", metric: "xpEarned", target: 6000, reward: 1200, title: "Weekly Devotion", description: "Earn 6,000 XP this week." },
  { id: "w_data", period: "weekly", metric: "dataSharedGB", target: 20, reward: 1500, title: "Relay Marathon", description: "Share 20 GB this week." },
  { id: "w_coins", period: "weekly", metric: "coinsEarned", target: 2000, reward: 900, title: "Treasure Hunter", description: "Earn 2,000 coins this week." },
];

function hashNum(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic distinct pick of `count` from a pool, seeded by `key`. */
function pick(pool: QuestDef[], count: number, key: string): QuestDef[] {
  const start = hashNum(key) % pool.length;
  const out: QuestDef[] = [];
  for (let i = 0; i < pool.length && out.length < count; i += 1) {
    out.push(pool[(start + i * 2 + 1) % pool.length]);
    // ensure distinctness
    if (out.length > 1 && out.includes(out[out.length - 1]) && out.indexOf(out[out.length - 1]) !== out.length - 1) {
      out.pop();
    }
  }
  // de-dupe safety
  return [...new Map(out.map((d) => [d.id, d])).values()].slice(0, count);
}

export function currentDayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function currentWeekKey(now = new Date()): string {
  const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function activeQuestDefs(dayKey: string, weekKey: string): QuestDef[] {
  return [...pick(DAILY_POOL, 3, dayKey), ...pick(WEEKLY_POOL, 1, weekKey)];
}

export function createQuestState(baseline: QuestBaseline, now = new Date()): QuestState {
  return {
    dayKey: currentDayKey(now),
    weekKey: currentWeekKey(now),
    dailyBaseline: { ...baseline },
    weeklyBaseline: { ...baseline },
    claimed: [],
  };
}

/** Roll the day/week over if the period changed, rebasing that period's
 *  baseline to "now" and dropping that period's claimed instances. */
export function rolloverQuests(state: QuestState, baselineNow: QuestBaseline, now = new Date()): QuestState {
  let next = state;
  const day = currentDayKey(now);
  const week = currentWeekKey(now);

  if (state.dayKey !== day) {
    next = {
      ...next,
      dayKey: day,
      dailyBaseline: { ...baselineNow },
      claimed: next.claimed.filter((id) => !id.startsWith(`daily:${state.dayKey}:`)),
    };
  }
  if (state.weekKey !== week) {
    next = {
      ...next,
      weekKey: week,
      weeklyBaseline: { ...baselineNow },
      claimed: next.claimed.filter((id) => !id.startsWith(`weekly:${state.weekKey}:`)),
    };
  }
  return next;
}

export function instanceId(def: QuestDef, state: QuestState): string {
  const periodKey = def.period === "daily" ? state.dayKey : state.weekKey;
  return `${def.period}:${periodKey}:${def.id}`;
}

function metricValue(def: QuestDef, ctx: QuestContext, state: QuestState): number {
  const baseline = def.period === "daily" ? state.dailyBaseline : state.weeklyBaseline;
  switch (def.metric) {
    case "xpEarned":
      return Math.max(0, ctx.totalXp - baseline.totalXp);
    case "dataSharedGB":
      return Math.max(0, (ctx.sharedBytes - baseline.sharedBytes) / GB);
    case "coinsEarned":
      return Math.max(0, ctx.totalEarned - baseline.totalEarned);
    case "peakTunnels":
      return ctx.participatingTunnels;
    case "uptimeHours":
      return ctx.uptimeMs / 3600000;
    case "level":
      return ctx.level;
    case "connect":
      return ctx.connected ? 1 : 0;
    default:
      return 0;
  }
}

export function deriveQuests(state: QuestState, ctx: QuestContext): QuestInstance[] {
  return activeQuestDefs(state.dayKey, state.weekKey).map((def) => {
    const id = instanceId(def, state);
    const current = metricValue(def, ctx, state);
    const claimed = state.claimed.includes(id);
    return {
      instanceId: id,
      def,
      current,
      target: def.target,
      pct: Math.max(0, Math.min(1, current / def.target)),
      claimed,
      completable: !claimed && current >= def.target,
    };
  });
}
