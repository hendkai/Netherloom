import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PET_ANIMATION_ROWS, petAnimationFrameAt, type PetAnimationState } from "./petAnimations";

const states = Object.keys(PET_ANIMATION_ROWS) as PetAnimationState[];

beforeEach(() => {
  // Deterministic row layout guards: every animation stays on its own row.
});

afterEach(() => {});

describe("atlas frame timing", () => {
  it("maps each state to its dedicated row", () => {
    for (const state of states) {
      expect(petAnimationFrameAt(state, 0).row).toBe(PET_ANIMATION_ROWS[state].row);
    }
    const rows = states.map((state) => PET_ANIMATION_ROWS[state].row);
    expect(new Set(rows).size).toBe(states.length);
  });

  it("starts and ends within the frame count of each animation", () => {
    for (const state of states) {
      const durations = PET_ANIMATION_ROWS[state].durations;
      const cycle = durations.reduce((sum, d) => sum + d, 0);
      expect(petAnimationFrameAt(state, 0).column).toBe(0);
      expect(petAnimationFrameAt(state, cycle - 1).column).toBe(durations.length - 1);
      // wraps cleanly
      expect(petAnimationFrameAt(state, cycle).column).toBe(0);
      expect(petAnimationFrameAt(state, 10 * cycle + 40).column).toBeGreaterThanOrEqual(0);
      expect(petAnimationFrameAt(state, 10 * cycle + 40).column).toBeLessThan(durations.length);
    }
  });

  it("advances monotonically through frames over one cycle", () => {
    const durations = PET_ANIMATION_ROWS.idle.durations;
    let column = -1;
    let at = 0;
    for (const duration of durations) {
      at += duration - 1;
      const next = petAnimationFrameAt("idle", at).column;
      expect(next).toBeGreaterThanOrEqual(column);
      column = next;
      at += 1;
    }
  });

  it("freezes on frame 0 under reduced motion", () => {
    for (const state of states) {
      expect(petAnimationFrameAt(state, 123_456, true)).toEqual({
        column: 0,
        row: PET_ANIMATION_ROWS[state].row,
      });
    }
  });

  it("handles negative elapsed time without throwing", () => {
    expect(petAnimationFrameAt("idle", -1).column).toBeGreaterThanOrEqual(0);
    expect(petAnimationFrameAt("idle", -999_999).column).toBeLessThan(PET_ANIMATION_ROWS.idle.durations.length);
  });
});
