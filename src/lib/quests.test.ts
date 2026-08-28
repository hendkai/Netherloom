import { describe, expect, it } from "vitest";
import {
  activeQuestDefs,
  createQuestState,
  deriveQuests,
  instanceId,
  rolloverQuests,
  type QuestBaseline,
  type QuestContext,
  type QuestState,
} from "./quests";

const baseline: QuestBaseline = { totalXp: 1000, sharedBytes: 0, totalEarned: 200 };

function context(overrides: Partial<QuestContext> = {}): QuestContext {
  return {
    totalXp: 1000,
    sharedBytes: 0,
    totalEarned: 200,
    participatingTunnels: 0,
    uptimeMs: 0,
    level: 1,
    connected: true,
    ...overrides,
  };
}

function advancedState(state: QuestState, instance: string): QuestState {
  return { ...state, claimed: [...state.claimed, instance] };
}

describe("quest period selection", () => {
  it("offers exactly 3 dailies and 1 weekly, deterministically", () => {
    const a = activeQuestDefs("2026-08-28", "2026-W35");
    const b = activeQuestDefs("2026-08-28", "2026-W35");
    expect(a.filter((def) => def.period === "daily")).toHaveLength(3);
    expect(a.filter((def) => def.period === "weekly")).toHaveLength(1);
    expect(a.map((def) => def.id)).toEqual(b.map((def) => def.id));
  });
});

describe("rolloverQuests", () => {
  it("rebases the daily baseline and clears daily claims on a new day", () => {
    const monday = new Date("2026-08-24T12:00:00Z");
    const state = createQuestState(baseline, monday);
    const defs = activeQuestDefs(state.dayKey, state.weekKey);
    const daily = defs.find((def) => def.period === "daily")!;
    const claimed = advancedState(state, instanceId(daily, state));

    const tuesday = new Date("2026-08-25T12:00:00Z");
    const rolled = rolloverQuests(claimed, baseline, tuesday);
    expect(rolled.dayKey).not.toBe(state.dayKey);
    expect(rolled.dailyBaseline).toEqual(baseline);
    expect(rolled.claimed).toHaveLength(0);
  });

  it("keeps weekly progress when only the day changed", () => {
    const monday = new Date("2026-08-24T12:00:00Z");
    const state = createQuestState(baseline, monday);
    const weekly = activeQuestDefs(state.dayKey, state.weekKey).find((def) => def.period === "weekly")!;
    const claimed = advancedState(state, instanceId(weekly, state));

    const tuesday = new Date("2026-08-25T12:00:00Z");
    const rolled = rolloverQuests(claimed, baseline, tuesday);
    expect(rolled.claimed).toEqual(claimed.claimed);
    expect(rolled.weekKey).toBe(state.weekKey);
  });

  it("is a no-op within the same period", () => {
    const now = new Date("2026-08-26T12:00:00Z");
    const state = createQuestState(baseline, now);
    expect(rolloverQuests(state, baseline, now)).toEqual(state);
  });
});

describe("deriveQuests", () => {
  it("marks a quest completable once its metric passes the target", () => {
    const now = new Date("2026-08-26T12:00:00Z");
    const state = createQuestState(baseline, now);
    const instances = deriveQuests(state, context({ totalXp: baseline.totalXp + 10_000 }));
    const xpQuest = instances.find((q) => q.def.metric === "xpEarned")!;
    expect(xpQuest.current).toBe(10_000);
    expect(xpQuest.completable).toBe(true);
    expect(xpQuest.claimed).toBe(false);
  });

  it("ignores counter resets instead of going negative", () => {
    const now = new Date("2026-08-26T12:00:00Z");
    const state = createQuestState(baseline, now);
    const instances = deriveQuests(state, context({ totalXp: 5 })); // below baseline
    const xpQuest = instances.find((q) => q.def.metric === "xpEarned")!;
    expect(xpQuest.current).toBe(0);
  });

  it("never offers a claimed quest again as completable", () => {
    const now = new Date("2026-08-26T12:00:00Z");
    const state = createQuestState(baseline, now);
    const target = deriveQuests(state, context({ totalXp: baseline.totalXp + 10_000 }))[0];
    const claimed = advancedState(state, target.instanceId);
    const after = deriveQuests(claimed, context({ totalXp: baseline.totalXp + 50_000 }));
    expect(after.find((q) => q.instanceId === target.instanceId)!.completable).toBe(false);
  });
});
