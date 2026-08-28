import { describe, expect, it } from "vitest";
import {
  createEconomy,
  effectiveEffects,
  gearScore,
  getGearItem,
  GEAR_SLOTS,
  sanitizeEconomy,
  sellValue,
  SHOP_ITEMS,
  STARTER_COINS,
  UPGRADE_MAX,
  upgradeCost,
  upgradeLevelOf,
} from "./economy";

const sample = SHOP_ITEMS[0];
const bySlot = (slot: string) => SHOP_ITEMS.filter((item) => item.slot === slot);

describe("shop catalog integrity", () => {
  it("covers every slot and has unique ids with positive costs", () => {
    for (const slot of GEAR_SLOTS) {
      expect(bySlot(slot).length).toBeGreaterThan(0);
    }
    const ids = SHOP_ITEMS.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const item of SHOP_ITEMS) {
      expect(item.cost).toBeGreaterThan(0);
      expect(item.itemLevel).toBeGreaterThan(0);
      expect(item.effects.xpMultiplier).toBeGreaterThanOrEqual(1);
      expect(item.effects.dataMultiplier).toBeGreaterThanOrEqual(1);
      expect(item.effects.energyBonus).toBeGreaterThanOrEqual(0);
      expect(item.effects.coinBonus).toBeGreaterThanOrEqual(0);
    }
  });

  it("prices rise with rarity", () => {
    const avg = (rarity: string) => {
      const items = SHOP_ITEMS.filter((item) => item.rarity === rarity);
      return items.reduce((sum, item) => sum + item.cost, 0) / items.length;
    };
    expect(avg("Epic")).toBeGreaterThan(avg("Rare"));
    expect(avg("Rare")).toBeGreaterThan(avg("Common"));
  });
});

describe("upgrade economy", () => {
  it("levels are clamped to UPGRADE_MAX", () => {
    expect(upgradeLevelOf({}, sample.id)).toBe(0);
    expect(upgradeLevelOf({ [sample.id]: 99 }, sample.id)).toBe(UPGRADE_MAX);
  });

  it("upgrade cost rises per level and sell value is a fraction of cost", () => {
    expect(upgradeCost(sample, 1)).toBeGreaterThan(upgradeCost(sample, 0));
    expect(sellValue(sample)).toBeLessThan(sample.cost);
    expect(sellValue(sample)).toBeGreaterThan(0);
  });

  it("upgrades amplify effects without flipping their sign", () => {
    const base = effectiveEffects(sample, 0);
    const maxed = effectiveEffects(sample, UPGRADE_MAX);
    expect(maxed.energyBonus).toBeGreaterThanOrEqual(base.energyBonus);
    expect(maxed.xpMultiplier).toBeGreaterThanOrEqual(base.xpMultiplier);
    expect(maxed.dataMultiplier).toBeGreaterThanOrEqual(base.dataMultiplier);
  });
});

describe("sanitizeEconomy", () => {
  it("keeps a healthy save untouched in content", () => {
    const economy = createEconomy("cat-001");
    economy.coins = 5000;
    economy.inventory = [sample.id];
    economy.loadouts["cat-001"] = { [sample.slot]: sample.id };
    economy.upgrades = { [sample.id]: 2 };
    const cleaned = sanitizeEconomy(economy, "cat-001");
    expect(cleaned.coins).toBe(5000);
    expect(cleaned.inventory).toEqual([sample.id]);
    expect(cleaned.loadouts["cat-001"][sample.slot]).toBe(sample.id);
    expect(cleaned.upgrades[sample.id]).toBe(2);
    expect(cleaned.ownedPets).toContain("cat-001");
  });

  it("drops unknown items, ghost upgrades and out-of-inventory loadouts", () => {
    const cleaned = sanitizeEconomy(
      {
        coins: -50,
        inventory: ["no-such-item", sample.id],
        loadouts: { "cat-001": { Head: "no-such-item", Charm: sample.id } },
        upgrades: { [sample.id]: 12, "no-such-item": 3 },
      },
      "cat-001",
    );
    expect(cleaned.coins).toBe(0); // negative balances clamp to 0
    expect(cleaned.inventory).toEqual([sample.id]);
    expect(cleaned.loadouts["cat-001"].Head).toBeUndefined();
    expect(cleaned.loadouts["cat-001"].Charm).toBeUndefined(); // Charm item can't sit in Head slot
    expect(cleaned.upgrades).toEqual({ [sample.id]: 5 }); // level 12 clamps to UPGRADE_MAX, ghost ids dropped
  });

  it("repairs garbage input to a valid fresh save", () => {
    const cleaned = sanitizeEconomy({ coins: "lots" as unknown as number });
    expect(cleaned.coins).toBe(0);
    expect(cleaned.inventory).toEqual([]);
    expect(cleaned.version).toBe(2);
    expect(cleaned.totalEarned).toBeGreaterThanOrEqual(STARTER_COINS);
  });
});

describe("equipment aggregation", () => {
  it("sums gear score across slots and adds upgrade levels", () => {
    const head = bySlot("Head")[0];
    const charm = bySlot("Charm")[0];
    const loadout = { Head: head.id, Charm: charm.id };
    expect(gearScore(loadout)).toBe(head.itemLevel + charm.itemLevel);
    expect(gearScore(loadout, { [head.id]: 2 })).toBe(head.itemLevel + 2 * 8 + charm.itemLevel);
    expect(gearScore({})).toBe(0);
  });

  it("ignores items the player does not reference by id", () => {
    expect(getGearItem("nope")).toBeUndefined();
    expect(getGearItem(undefined)).toBeUndefined();
  });
});
