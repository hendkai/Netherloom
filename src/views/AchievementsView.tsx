import { useMemo } from "react";
import { Coins } from "lucide-react";
import { useObservatory } from "../state/ObservatoryProvider";
import {
  ACHIEVEMENTS,
  CATEGORY_META,
  type Achievement,
  type AchievementCategory,
} from "../lib/achievements";

const GB = 1024 * 1024 * 1024;
const ROMAN = ["", "I", "II", "III", "IV", "V"] as const;

function tierLabel(a: Achievement): string {
  if (!a.tier) return "★";
  return ROMAN[a.tier] ?? String(a.tier);
}

export function AchievementsView() {
  const {
    achievements,
    metrics,
    progression,
    unlockedSkills,
    source,
    coins,
    totalCoinsEarned,
    totalCoinsSpent,
    inventory,
    equipped,
    gearScore,
    ownedPets,
  } =
    useObservatory();
  const unlockedSet = useMemo(() => new Set(achievements), [achievements]);

  const ctx = {
    metrics,
    progression,
    totalSkillsUnlocked: unlockedSkills.length,
    source,
    effectiveSharedBytes: (progression?.dataSharedGB ?? 0) * GB,
    coins,
    totalCoinsEarned,
    totalCoinsSpent,
    itemsOwned: inventory.length,
    equippedSlots: Object.keys(equipped).length,
    gearScore,
    petsOwned: ownedPets.length,
  };

  // Re-evaluate progress against current state. Progress is purely visual;
  // unlocks are authoritative via the provider's tick.
  const groups = useMemo(() => {
    const byCat = new Map<AchievementCategory, Achievement[]>();
    for (const a of ACHIEVEMENTS) {
      const list = byCat.get(a.category) ?? [];
      list.push(a);
      byCat.set(a.category, list);
    }
    const ordered: { category: AchievementCategory; items: Achievement[] }[] = [];
    const order = Object.entries(CATEGORY_META)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([k]) => k as AchievementCategory);
    for (const cat of order) {
      const items = byCat.get(cat);
      if (items) ordered.push({ category: cat, items });
    }
    return ordered;
  }, []);

  return (
    <section className="view-page">
      <header className="view-head">
        <h2>Achievements</h2>
        <p>
          Router-driven milestones that reward running I2P — tunnels, peers,
          bandwidth, uptime, evolution and skill investment.
        </p>
      </header>

      <div className="ach-summary">
        <strong>{achievements.length}</strong>
        <span> / {ACHIEVEMENTS.length} unlocked</span>
      </div>

      <div className="ach-categories">
        {groups.map(({ category, items }) => (
          <section className="ach-category" key={category}>
            <h3 className="ach-category-title">
              {CATEGORY_META[category].label}
              <span className="ach-category-count">
                {items.filter((a) => unlockedSet.has(a.id)).length} / {items.length}
              </span>
            </h3>
            <div className="ach-grid">
              {items.map((a) => {
                const unlocked = unlockedSet.has(a.id);
                const progress = !unlocked && a.progress ? a.progress(ctx) : null;
                const pct =
                  progress && progress.target > 0
                    ? Math.max(0, Math.min(100, (progress.current / progress.target) * 100))
                    : 0;
                return (
                  <div
                    className={`ach-card ${unlocked ? "unlocked" : "locked"}`}
                    key={a.id}
                  >
                    <div className="ach-card-head">
                      <div className="ach-tier">{tierLabel(a)}</div>
                      <div className="ach-card-body">
                        <div className="ach-name">{a.name}</div>
                        <div className="ach-desc">{a.description}</div>
                        <div className="ach-reward"><Coins size={12} /> +{a.rewardCoins}</div>
                      </div>
                      {unlocked ? <div className="ach-check">✓</div> : null}
                    </div>
                    {!unlocked && progress ? (
                      <div className="ach-progress">
                        <div className="ach-progress-bar">
                          <div
                            className="ach-progress-fill"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="ach-progress-text">
                          {Math.floor(progress.current)} / {progress.target}
                        </span>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
