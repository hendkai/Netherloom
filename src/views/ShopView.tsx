import { useState } from "react";
import { Coins, Heart, ShieldCheck, ShoppingBag, TrendingUp, TrendingDown } from "lucide-react";
import { SHOP_ITEMS, GEAR_SLOTS, STARTER_COINS, getGearItem, sellValue, type GearSlot } from "../lib/economy";
import { formatNumber } from "../lib/observatory";
import { useObservatory } from "../state/ObservatoryProvider";

type ShopFilter = "All" | GearSlot;

interface ComparisonDelta {
  label: string;
  tone: "up" | "down" | "same";
  delta: string;
}

function computeComparisonDeltas(
  candidate: typeof SHOP_ITEMS[number],
  currentId: string | undefined,
): ComparisonDelta[] {
  const current = currentId ? getGearItem(currentId) : undefined;
  const deltas: ComparisonDelta[] = [];

  const xpDelta = (candidate.effects.xpMultiplier - (current?.effects.xpMultiplier ?? 1)) * 100;
  if (Math.abs(xpDelta) > 0.1) {
    deltas.push({
      label: "XP",
      tone: xpDelta > 0 ? "up" : "down",
      delta: `${xpDelta > 0 ? "+" : ""}${xpDelta.toFixed(1)}%`,
    });
  }
  const dataDelta = (candidate.effects.dataMultiplier - (current?.effects.dataMultiplier ?? 1)) * 100;
  if (Math.abs(dataDelta) > 0.1) {
    deltas.push({
      label: "Data",
      tone: dataDelta > 0 ? "up" : "down",
      delta: `${dataDelta > 0 ? "+" : ""}${dataDelta.toFixed(1)}%`,
    });
  }
  const energyDelta = candidate.effects.energyBonus - (current?.effects.energyBonus ?? 0);
  if (energyDelta !== 0) {
    deltas.push({
      label: "Energy",
      tone: energyDelta > 0 ? "up" : "down",
      delta: `${energyDelta > 0 ? "+" : ""}${energyDelta}`,
    });
  }
  const coinDelta = (candidate.effects.coinBonus - (current?.effects.coinBonus ?? 0)) * 100;
  if (Math.abs(coinDelta) > 0.1) {
    deltas.push({
      label: "Coins",
      tone: coinDelta > 0 ? "up" : "down",
      delta: `${coinDelta > 0 ? "+" : ""}${coinDelta.toFixed(1)}%`,
    });
  }
  return deltas;
}

export function ShopView() {
  const {
    coins,
    creatureName,
    inventory,
    equipped,
    gearScore,
    purchaseItem,
    sellItem,
    equipItem,
    unequipSlot,
    careItems,
    careInventory,
    purchaseCareItem,
  } = useObservatory();
  const [filter, setFilter] = useState<ShopFilter>("All");
  const [message, setMessage] = useState(`Starter grant: ${formatNumber(STARTER_COINS)} coins. Achievements fund long-term upgrades.`);
  const inventorySet = new Set(inventory);
  const visibleItems = filter === "All" ? SHOP_ITEMS : SHOP_ITEMS.filter((item) => item.slot === filter);

  const countOf = (id: string) => careInventory.filter((owned) => owned === id).length;

  return (
    <section className="view-page">
      <header className="view-head shop-head">
        <div>
          <h2>Nether Market</h2>
          <p>Buy local-only virtual gear and equip strengthening effects on your active pet.</p>
        </div>
        <div className="economy-summary">
          <span><Coins size={16} /> {formatNumber(coins)}</span>
          <span><ShieldCheck size={16} /> Gear {formatNumber(gearScore)}</span>
        </div>
      </header>

      <section className="loadout-panel">
        <div className="loadout-title">
          <strong>{creatureName}'s Loadout</strong>
          <span>{inventory.length} / {SHOP_ITEMS.length} items owned · Effects apply to this pet only</span>
        </div>
        <div className="loadout-grid">
          {GEAR_SLOTS.map((slot) => {
            const item = getGearItem(equipped[slot]);
            return (
              <div className={`loadout-slot ${item ? "filled" : ""}`} key={slot}>
                <span>{slot}</span>
                {item ? (
                  <>
                    <img src={item.icon} alt="" />
                    <strong>{item.name}</strong>
                    <small>iLvl {item.itemLevel} · {item.effectLabel}</small>
                    <button onClick={() => unequipSlot(slot)}>Unequip</button>
                  </>
                ) : (
                  <div className="empty-slot">Empty</div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <div className="shop-toolbar">
        <div className="shop-filters" aria-label="Shop item filter">
          {(["All", ...GEAR_SLOTS] as ShopFilter[]).map((slot) => (
            <button
              key={slot}
              className={filter === slot ? "selected" : ""}
              aria-pressed={filter === slot}
              onClick={() => setFilter(slot)}
            >
              {slot}
            </button>
          ))}
        </div>
        <span role="status">{message}</span>
      </div>

      <div className="shop-grid">
        {visibleItems.map((item) => {
          const owned = inventorySet.has(item.id);
          const isEquipped = equipped[item.slot] === item.id;
          const affordable = coins >= item.cost;
          const comparison = computeComparisonDeltas(item, equipped[item.slot]);
          return (
            <article className={`shop-item rarity-${item.rarity.toLowerCase()}`} key={item.id}>
              <div className="shop-item-icon"><img src={item.icon} alt="" /></div>
              <div className="shop-item-copy">
                <span>{item.rarity} · {item.slot}</span>
                <h3>{item.name}</h3>
                <p>{item.effectLabel}</p>
                <small>Item level {item.itemLevel}</small>
                {!owned && !isEquipped && comparison.length > 0 ? (
                  <div className="shop-comparison">
                    {comparison.map((d) => (
                      <span key={d.label} className={`cmp-${d.tone}`}>
                        {d.tone === "up" ? <TrendingUp size={10} /> : d.tone === "down" ? <TrendingDown size={10} /> : null}
                        {d.label} {d.delta}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="shop-item-action">
                {owned ? (
                  <>
                    <button
                      className={isEquipped ? "equipped" : "equip"}
                      onClick={() => {
                        if (isEquipped) {
                          unequipSlot(item.slot);
                          setMessage(`${item.name} unequipped.`);
                        } else {
                          equipItem(item.id);
                          setMessage(`${item.name} equipped in ${item.slot}.`);
                        }
                      }}
                    >
                      {isEquipped ? "Equipped" : "Equip"}
                    </button>
                    <button
                      className="sell"
                      onClick={() => {
                        if (sellItem(item.id)) setMessage(`Sold ${item.name} for ${formatNumber(sellValue(item))} coins.`);
                      }}
                    >
                      Sell · {formatNumber(sellValue(item))}
                    </button>
                  </>
                ) : (
                  <button
                    className="buy"
                    disabled={!affordable}
                    onClick={() => {
                      const bought = purchaseItem(item.id);
                      setMessage(bought ? `${item.name} added to your inventory.` : "Not enough coins.");
                    }}
                  >
                    <ShoppingBag size={14} />
                    {formatNumber(item.cost)}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <section className="care-shop">
        <header className="care-shop-head">
          <div>
            <h3>Care Items</h3>
            <p>Consumables for your active pet. Stock up — hunger and boredom tick in real time.</p>
          </div>
          <span className="care-shop-hint"><Heart size={14} /> Restores stats, some grant Bond</span>
        </header>

        <div className="care-shop-grid">
          {careItems.map((item) => {
            const owned = countOf(item.id);
            const affordable = coins >= item.cost;
            return (
              <article className={`care-shop-item kind-${item.kind}`} key={item.id}>
                <div className="care-shop-icon"><img src={item.icon} alt="" /></div>
                <div className="care-shop-copy">
                  <span className="care-kind">{item.kind}</span>
                  <h4>{item.name}</h4>
                  <p>{item.description}</p>
                  <small>Owned: {owned}</small>
                </div>
                <button
                  className="buy"
                  disabled={!affordable}
                  onClick={() => {
                    const ok = purchaseCareItem(item.id);
                    setMessage(ok ? `${item.name} purchased.` : "Not enough coins.");
                  }}
                >
                  <ShoppingBag size={14} />
                  {formatNumber(item.cost)}
                </button>
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}
