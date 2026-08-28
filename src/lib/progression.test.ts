import { describe, expect, it } from "vitest";
import {
  accrue,
  derive,
  EVOLUTION_PATHS,
  INITIAL_PROGRESS,
  levelForXp,
  needsEvolutionChoice,
  stageForLevel,
  titleForLevel,
  xpForLevel,
  type CreatureSave,
} from "./progression";
import { EMPTY_METRICS, type RouterMetrics } from "./observatory";

const online: RouterMetrics = {
  ...EMPTY_METRICS,
  status: "Connected",
  online: true,
  inboundBps: 1024 * 1024,
  outboundBps: 1024 * 1024,
  participatingTunnels: 10,
};

const creature: CreatureSave = { id: "cat", name: "Miaus Router", createdAt: 0 };

describe("xp curve", () => {
  it("level 0 costs 0 XP", () => {
    expect(xpForLevel(0)).toBe(0);
  });

  it("is strictly increasing and matches levelForXp both ways", () => {
    for (let level = 1; level <= 60; level += 1) {
      const xp = xpForLevel(level);
      expect(xp).toBeGreaterThan(xpForLevel(level - 1));
      expect(levelForXp(xp)).toBe(level);
      expect(levelForXp(xp - 1)).toBe(level - 1);
    }
  });

  it("maps arbitrary XP to the highest reached level", () => {
    expect(levelForXp(0)).toBe(0);
    expect(levelForXp(-5)).toBe(0);
    expect(levelForXp(xpForLevel(7) + 1234)).toBe(7);
  });
});

describe("stages and evolution", () => {
  it("starts at Hatchling and reaches the final stage at level 50", () => {
    expect(stageForLevel(0).name).toBe("Hatchling");
    expect(stageForLevel(4).index).toBe(0);
    expect(stageForLevel(5).index).toBe(1);
    expect(stageForLevel(49).index).toBe(3);
    expect(stageForLevel(50).index).toBe(4);
    expect(stageForLevel(50).glow).toBeGreaterThan(stageForLevel(0).glow);
  });

  it("asks for an evolution path at level 15 until one is chosen", () => {
    expect(needsEvolutionChoice(14, null)).toBe(false);
    expect(needsEvolutionChoice(15, null)).toBe(true);
    for (const path of Object.keys(EVOLUTION_PATHS) as (keyof typeof EVOLUTION_PATHS)[]) {
      expect(needsEvolutionChoice(15, path)).toBe(false);
    }
  });

  it("resolves stage names through the chosen path", () => {
    const guardian = stageForLevel(15, "guardian");
    const sorcerer = stageForLevel(15, "sorcerer");
    expect(guardian.name).toBe(EVOLUTION_PATHS.guardian.stageNames[2]);
    expect(sorcerer.name).toBe(EVOLUTION_PATHS.sorcerer.stageNames[2]);
    expect(guardian.name).not.toBe(sorcerer.name);
  });

  it("advances titles monotonically", () => {
    expect(titleForLevel(0)).toBe(titleForLevel(1));
    expect(titleForLevel(10)).not.toBe(titleForLevel(60));
  });
});

describe("accrue", () => {
  it("grows XP and shared bytes from live metrics", () => {
    const next = accrue(INITIAL_PROGRESS, online, 5, 5);
    expect(next.totalXp).toBeGreaterThan(0);
    expect(next.sharedBytes).toBeGreaterThan(0);
  });

  it("reduces to the base trickle when disconnected (no traffic, no tunnels)", () => {
    const next = accrue(INITIAL_PROGRESS, EMPTY_METRICS, 5, 5);
    expect(next.totalXp).toBeCloseTo(2.5); // 0.5 XP/s base rate × 5s
    expect(next.sharedBytes).toBe(0);
  });

  it("clamps delta seconds to at most two poll intervals", () => {
    const normal = accrue(INITIAL_PROGRESS, online, 5, 5);
    const clamped = accrue(INITIAL_PROGRESS, online, 3600, 5);
    expect(clamped.totalXp).toBeCloseTo(normal.totalXp * 2);
  });

  it("never goes backwards", () => {
    const progress = { totalXp: 1000, sharedBytes: 500, lastTickAt: 0 };
    const next = accrue(progress, EMPTY_METRICS, 5, 5);
    expect(next.totalXp).toBeGreaterThanOrEqual(progress.totalXp);
    expect(next.sharedBytes).toBeGreaterThanOrEqual(progress.sharedBytes);
  });
});

describe("derive", () => {
  it("reports a coherent view model", () => {
    const progress = { totalXp: xpForLevel(8) + 50, sharedBytes: 2 * 1024 ** 3, lastTickAt: 0 };
    const view = derive(creature, progress, online, "live");
    expect(view.level).toBe(8);
    expect(view.xpIntoLevel).toBe(50);
    expect(view.xpPct).toBeGreaterThan(0);
    expect(view.xpPct).toBeLessThanOrEqual(1);
    expect(view.dataSharedGB).toBeCloseTo(2, 5);
    expect(view.personality.length).toBeGreaterThan(0);
  });

  it("keeps xp bounds valid at level 0", () => {
    const view = derive(creature, INITIAL_PROGRESS, EMPTY_METRICS, "disconnected");
    expect(view.level).toBe(0);
    expect(view.xpIntoLevel).toBe(0);
    expect(view.xpForNextLevel).toBeGreaterThan(0);
  });
});
