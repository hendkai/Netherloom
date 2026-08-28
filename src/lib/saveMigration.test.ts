import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  __test_setSaveVersion,
  CURRENT_SAVE_VERSION,
  loadVersioned,
  removeSaveEntry,
  saveVersioned,
  setSaveStorage,
} from "./saveMigration";

interface Wrapper {
  v: number | string | unknown;
}

function makeStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key) => map.get(key) ?? null,
    key: () => null, // not needed by the layer
    removeItem: (key) => {
      map.delete(key);
    },
    setItem: (key, value) => {
      map.set(key, String(value));
    },
  };
}

let store: Storage;

beforeEach(() => {
  store = makeStorage();
  setSaveStorage(store);
  __test_setSaveVersion(2, [
    (raw) => ({ v: 2, prev: raw }), // v1 → v2: wraps old payload, adds marker
  ]);
});

afterEach(() => {
  setSaveStorage(null);
  __test_setSaveVersion(CURRENT_SAVE_VERSION, []);
});

describe("saveVersioned / loadVersioned round-trip", () => {
  it("round-trips a payload at the current version", () => {
    const payload = { totalXp: 42, sharedBytes: 7, lastTickAt: 1 };
    expect(saveVersioned("k", payload)).toBe(true);
    const loaded = loadVersioned<Wrapper>(
      "k",
      (raw) => (raw as Wrapper),
      { v: 0 },
    );
    expect(loaded).toEqual(payload);
  });

  it("returns the fallback for missing, corrupt or blocked storage", () => {
    const fallback: Wrapper = { v: "empty" };
    expect(loadVersioned<Wrapper>("missing", (raw) => raw as Wrapper, fallback)).toBe(fallback);
    store.setItem("broken", "{not json");
    expect(loadVersioned<Wrapper>("broken", (raw) => raw as Wrapper, fallback)).toBe(fallback);
  });

  it("removes entries together with their version stamp", () => {
    saveVersioned("k", { a: 1 });
    removeSaveEntry("k");
    expect(store.getItem("k")).toBeNull();
    expect(loadVersioned<Wrapper>("k", (raw) => raw as Wrapper, { v: "gone" })).toEqual({ v: "gone" });
  });
});

describe("migration path", () => {
  it("upgrades an un-stamped (version 1) save through the chain and writes back", () => {
    store.setItem("pet", JSON.stringify({ totalXp: 10 }));
    const loaded = loadVersioned<Wrapper>(
      "pet",
      (raw) => raw as Wrapper,
      { v: "fallback" },
    );
    expect(loaded).toMatchObject({ v: 2, prev: { totalXp: 10 } });
    // migrated payload + stamp persisted so the next load skips the migration
    const reparsed = JSON.parse(store.getItem("pet")!) as Wrapper;
    expect(reparsed).toMatchObject({ v: 2 });
  });

  it("runs the migration only once across repeated loads", () => {
    store.setItem("pet", JSON.stringify({ totalXp: 10 }));
    const once = loadVersioned<Wrapper>("pet", (raw) => raw as Wrapper, { v: 0 });
    const twice = loadVersioned<Wrapper>("pet", (raw) => raw as Wrapper, { v: 0 });
    expect(once).toMatchObject({ v: 2 });
    expect(twice).toMatchObject({ v: 2, prev: { totalXp: 10 } });
  });

  it("falls back to sanitized defaults when a migration step throws", () => {
    __test_setSaveVersion(2, [
      () => {
        throw new Error("boom");
      },
    ]);
    store.setItem("pet", JSON.stringify({ totalXp: 10 }));
    const loaded = loadVersioned<Wrapper>("pet", () => ({ v: "sanitized" }), { v: "fallback" });
    expect(loaded).toEqual({ v: "sanitized" });
  });

  it("refuses inconsistent migration registrations", () => {
    expect(() => __test_setSaveVersion(3, [])).toThrow();
  });
});
