import { describe, expect, it } from "vitest";
import {
  BRANCH_META,
  canUnlock,
  computeSkillBonuses,
  EMPTY_BONUSES,
  nodesByBranch,
  SKILL_BY_ID,
  SKILL_TREE,
  type SkillBranch,
} from "./skills";

const branches = Object.keys(BRANCH_META) as SkillBranch[];

describe("skill tree integrity", () => {
  it("has unique node ids", () => {
    const ids = SKILL_TREE.map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("only references prerequisites that exist", () => {
    for (const node of SKILL_TREE) {
      for (const prereq of node.prerequisites) {
        expect(SKILL_BY_ID.has(prereq), `${node.id} → missing prereq ${prereq}`).toBe(true);
      }
    }
  });

  it("has no self-dependency and every branch has an entry node", () => {
    for (const branch of branches) {
      const nodes = nodesByBranch(branch);
      expect(nodes.length).toBeGreaterThan(0);
      expect(nodes.some((node) => node.prerequisites.length === 0)).toBe(true);
      for (const node of nodes) {
        expect(node.prerequisites).not.toContain(node.id);
      }
    }
  });
});

describe("canUnlock", () => {
  const entry = nodesByBranch(branches[0]).find((node) => node.prerequisites.length === 0)!;
  const gated = SKILL_TREE.find((node) => node.prerequisites.length > 0)!;

  it("allows a reachable entry node with points", () => {
    expect(canUnlock(entry, new Set(), 1, 1, new Set())).toEqual({ ok: true });
  });

  it("rejects the same node twice", () => {
    const check = canUnlock(entry, new Set([entry.id]), 1, 1, new Set());
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toBe("already_unlocked");
  });

  it("rejects without points", () => {
    const check = canUnlock(gated, new Set(gated.prerequisites), 0, 10, new Set());
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toBe("no_points");
  });

  it("rejects when prerequisites are missing", () => {
    const check = canUnlock(gated, new Set(), 5, 10, new Set());
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.reason).toBe("requires_node");
  });
});

describe("computeSkillBonuses", () => {
  it("returns the neutral baseline for an empty build", () => {
    expect(computeSkillBonuses([])).toEqual(EMPTY_BONUSES);
    expect(computeSkillBonuses([]).xpMultiplier).toBe(1);
    expect(computeSkillBonuses([]).dataSharedMultiplier).toBe(1);
  });

  it("ignores unknown node ids", () => {
    expect(computeSkillBonuses(["does-not-exist"])).toEqual(EMPTY_BONUSES);
  });

  it("stacks additive bonuses from multiple nodes", () => {
    const withEnergy = SKILL_TREE.filter(
      (node) => (node.effects.energyFloorBonus ?? 0) > 0,
    ).slice(0, 3);
    expect(withEnergy.length).toBeGreaterThan(1);
    const bonuses = computeSkillBonuses(withEnergy.map((node) => node.id));
    const expected = withEnergy.reduce((sum, node) => sum + (node.effects.energyFloorBonus ?? 0), 0);
    expect(bonuses.energyFloorBonus).toBe(expected);
  });

  it("keeps the keystone flag set only when the keystone is unlocked", () => {
    const keystone = SKILL_TREE.find((node) => node.effects.dataSharedGrantsXp === true);
    expect(keystone).toBeDefined();
    expect(computeSkillBonuses([keystone!.id]).dataSharedGrantsXp).toBe(true);
    expect(computeSkillBonuses([]).dataSharedGrantsXp).toBe(false);
  });
});
