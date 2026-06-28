import { useState } from "react";
import { Apple, Check, Droplets, Edit3, Gamepad2, Heart, ShieldCheck, ShoppingBag, Sparkles } from "lucide-react";
import { formatNumber } from "../lib/observatory";
import { EVOLUTION_PATHS, needsEvolutionChoice, unlockedCosmetics, type EvolutionPath } from "../lib/progression";
import { GEAR_SLOTS, getGearItem, setBonus, upgradeCost, upgradeLevelOf, UPGRADE_MAX } from "../lib/economy";
import {
  bondStatus,
  cleanlinessStatus,
  funStatus,
  hungerStatus,
  PET_COOLDOWN_MS,
  FREE_PLAY_COOLDOWN_MS,
  type CareItem,
  type CareStats,
} from "../lib/care";
import { PetSprite } from "../components/PetSprite";
import { useObservatory } from "../state/ObservatoryProvider";

function CareBar({ label, status, accent }: { label: string; status: { value: number; tone: string; label: string }; accent: string }) {
  return (
    <div className="care-row" data-tone={status.tone}>
      <div className="care-row-head">
        <span>{label}</span>
        <strong>{status.label}</strong>
      </div>
      <div className="care-track">
        <span style={{ width: `${status.value}%`, background: accent }} />
      </div>
      <small>{status.value}%</small>
    </div>
  );
}

function pickBestCareItem(items: CareItem[], careInventory: string[], kind: CareItem["kind"]): CareItem | undefined {
  const owned = items.filter((item) => item.kind === kind && careInventory.includes(item.id));
  if (owned.length === 0) return undefined;
  return owned.sort((a, b) => b.cost - a.cost)[0];
}

function useFreeCareCooldownLabel(stats: CareStats | null, kind: "play" | "pet"): string {
  if (!stats) return "";
  const last = kind === "play" ? stats.lastFreePlayAt : stats.lastPetAt;
  const cooldown = kind === "play" ? FREE_PLAY_COOLDOWN_MS : PET_COOLDOWN_MS;
  const remaining = cooldown - (Date.now() - last);
  if (remaining <= 0) return "";
  const seconds = Math.ceil(remaining / 1000);
  return `${seconds}s`;
}

export function CreatureView() {
  const {
    creature,
    creatureName,
    creatureFilter,
    renameCreature,
    reactions,
    routerEvents,
    progression,
    source,
    gearScore,
    equipped,
    upgrades,
    coins,
    unequipSlot,
    upgradeItem,
    setView,
    care,
    careItems,
    careInventory,
    careBonuses,
    performCareAction,
    evolutionPath,
    needsEvolutionChoice: needsChoice,
    chooseEvolutionPath,
  } = useObservatory();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(creatureName);
  const [careFeedback, setCareFeedback] = useState<{ action: string; message: string; tone: "ok" | "warn" } | null>(null);
  const [evolutionModalOpen, setEvolutionModalOpen] = useState(false);
  const [pickedPath, setPickedPath] = useState<EvolutionPath | null>(null);

  const commit = () => {
    renameCreature(draft);
    setEditing(false);
  };

  const p = progression;
  const stage = p?.stage;
  const set = setBonus(equipped);
  const cosmetics = unlockedCosmetics(p?.level ?? 0, evolutionPath);
  const activePathInfo = evolutionPath ? EVOLUTION_PATHS[evolutionPath] : null;
  const showEvolutionModal = needsChoice || evolutionModalOpen;

  const triggerCare = (action: "feed" | "clean" | "play" | "pet") => {
    const bestKind = action === "feed" ? "food" : action === "clean" ? "soap" : action === "play" ? "toy" : null;
    const bestItem = bestKind ? pickBestCareItem(careItems, careInventory, bestKind) : undefined;
    const ok = performCareAction(action, bestItem?.id);
    setCareFeedback({
      action,
      message: ok
        ? bestItem
          ? `Used ${bestItem.name}`
          : action === "pet"
            ? "Your pet purrs softly"
            : action === "feed"
              ? "Foraged a snack"
              : action === "clean"
                ? "Quick rinse"
                : "Free play"
        : "On cooldown or not needed",
      tone: ok ? "ok" : "warn",
    });
    window.setTimeout(() => setCareFeedback(null), 2200);
  };

  const useItem = (item: CareItem) => {
    const action = item.kind === "food" ? "feed" : item.kind === "soap" ? "clean" : "play";
    const ok = performCareAction(action, item.id);
    setCareFeedback({
      action,
      message: ok ? `Used ${item.name}` : "Couldn't use that",
      tone: ok ? "ok" : "warn",
    });
    window.setTimeout(() => setCareFeedback(null), 2200);
  };

  const hunger = care ? hungerStatus(care.hunger) : null;
  const clean = care ? cleanlinessStatus(care.cleanliness) : null;
  const fun = care ? funStatus(care.fun) : null;
  const bond = care ? bondStatus(care.bond) : null;
  const playCd = useFreeCareCooldownLabel(care, "play");
  const petCd = useFreeCareCooldownLabel(care, "pet");

  const inventoryByKind = (kind: CareItem["kind"]) =>
    careItems.filter((item) => item.kind === kind && careInventory.includes(item.id));

  return (
    <section className="view-page">
      <header className="view-head">
        <h2>Creature</h2>
        <p>Your companion grows as your router contributes to the network.</p>
      </header>

      {showEvolutionModal ? (
        <div className="evolution-modal-backdrop" role="dialog" aria-modal="true">
          <div className="evolution-modal">
            <div className="evolution-modal-head">
              <h3>Choose your evolution path</h3>
              <p>Pick once — this decision is permanent for this companion.</p>
            </div>
            <div className="evolution-paths">
              {(Object.values(EVOLUTION_PATHS)).map((path) => (
                <button
                  key={path.id}
                  className={`evolution-path-card${pickedPath === path.id ? " picked" : ""}`}
                  style={{ borderColor: pickedPath === path.id ? path.accent : undefined }}
                  onClick={() => setPickedPath(path.id)}
                >
                  <div className="evolution-path-icon" style={{ background: `${path.accent}22` }}>
                    <img src={path.icon} alt="" />
                  </div>
                  <div>
                    <span style={{ color: path.accent }}>{path.name}</span>
                    <strong>{path.stageNames[2]} → {path.stageNames[3]} → {path.stageNames[4]}</strong>
                    <p>{path.blurb}</p>
                    <small>{path.bonusLabel}</small>
                  </div>
                </button>
              ))}
            </div>
            <div className="evolution-modal-actions">
              <button className="ghost" onClick={() => setEvolutionModalOpen(false)}>Decide later</button>
              <button
                className="primary"
                disabled={!pickedPath}
                onClick={() => {
                  if (pickedPath && chooseEvolutionPath(pickedPath)) {
                    setPickedPath(null);
                    setEvolutionModalOpen(false);
                  }
                }}
              >
                <Sparkles size={14} /> Commit {pickedPath ? EVOLUTION_PATHS[pickedPath].name : ""}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {source !== "live" ? (
        <div className="grow-hint">Connect your router through I2PControl to earn XP and activate automatic pet reactions.</div>
      ) : null}

      {needsChoice ? (
        <div className="evolution-prompt">
          <Sparkles size={14} />
          <span>Level {(p?.level ?? 0) >= 15 ? 15 : p?.level ?? 0} reached — pick your evolution path.</span>
          <button onClick={() => setEvolutionModalOpen(true)}>Choose now</button>
        </div>
      ) : null}

      <div className="view-grid two">
        <div className="metric-panel creature-detail">
          <div className="creature-art big" data-stage={stage?.index ?? 0}>
            <PetSprite
              petId={creature?.id ?? ""}
              equipped={equipped}
              size={190}
              baseScale={stage?.scale ?? 1}
              filter={creatureFilter}
              alt={creatureName}
            />
            <div className="reaction-layer">
              {reactions.map((reaction, index) => (
                <img
                  key={reaction.id}
                  className="reaction-pop"
                  src={reaction.src}
                  alt={reaction.name}
                  style={{ left: `${44 + ((index * 31) % 20)}%` }}
                />
              ))}
            </div>
          </div>
          <div className="creature-name">
            {editing ? (
              <>
                <input
                  className="name-input"
                  value={draft}
                  autoFocus
                  maxLength={24}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") commit();
                    if (event.key === "Escape") setEditing(false);
                  }}
                />
                <button aria-label="Save name" onClick={commit}>
                  <Check size={15} />
                </button>
              </>
            ) : (
              <>
                <h2>{creatureName}</h2>
                <button
                  aria-label="Edit name"
                  onClick={() => {
                    setDraft(creatureName);
                    setEditing(true);
                  }}
                >
                  <Edit3 size={15} />
                </button>
              </>
            )}
          </div>
          <p>
            {p?.title ?? "Hatchling"} · {stage?.name ?? "Hatchling"}
            {activePathInfo ? (
              <span className="path-badge" style={{ borderColor: activePathInfo.accent, color: activePathInfo.accent }}>
                {activePathInfo.name} · {activePathInfo.bonusLabel}
              </span>
            ) : null}
          </p>
          <div className="level-badge">Level {p?.level ?? 0}</div>
          <div className="gear-score-badge"><ShieldCheck size={15} /> Gear Score {formatNumber(gearScore)}</div>
          <div className="xp-track violet">
            <span style={{ width: `${(p?.xpPct ?? 0) * 100}%` }} />
          </div>
          <small className="xp-caption">
            {formatNumber(p?.xpIntoLevel ?? 0)} / {formatNumber(p?.xpForNextLevel ?? 100)} XP to next level
          </small>
        </div>

        <div className="metric-panel">
          <span className="view-label">Care</span>
          <div className={`care-status-banner${careBonuses.neglected ? " warn" : careBonuses.allHappy ? " happy" : ""}`}>
            {careBonuses.allHappy
              ? "Thriving — bonus XP active"
              : careBonuses.neglected
                ? "Needs attention — XP reduced"
                : "Cared for"}
            <span className="care-xp-hint">XP × {careBonuses.xpMultiplier.toFixed(2)}</span>
          </div>

          {care && hunger && clean && fun && bond ? (
            <div className="care-grid">
              <CareBar label="Hunger" status={hunger} accent="linear-gradient(90deg,#ff8b3d,#ffb24d)" />
              <CareBar label="Cleanliness" status={clean} accent="linear-gradient(90deg,#57c7ff,#8bd3ff)" />
              <CareBar label="Fun" status={fun} accent="linear-gradient(90deg,#b280ff,#d6a8ff)" />
              <CareBar label="Bond" status={bond} accent="linear-gradient(90deg,#ff6fae,#ff9bc4)" />
            </div>
          ) : (
            <p className="muted-note">Adopt a creature to start caring for it.</p>
          )}

          <div className="care-actions">
            <button onClick={() => triggerCare("feed")} disabled={!care}>
              <Apple size={15} /> Feed
            </button>
            <button onClick={() => triggerCare("clean")} disabled={!care}>
              <Droplets size={15} /> Clean
            </button>
            <button onClick={() => triggerCare("play")} disabled={!care}>
              <Gamepad2 size={15} /> Play
              {playCd ? <i className="cd">{playCd}</i> : null}
            </button>
            <button onClick={() => triggerCare("pet")} disabled={!care}>
              <Heart size={15} /> Pet
              {petCd ? <i className="cd">{petCd}</i> : null}
            </button>
          </div>

          {careFeedback ? (
            <div className={`care-feedback ${careFeedback.tone}`}>{careFeedback.message}</div>
          ) : null}

          <div className="care-inventory-strip">
            <div className="care-inv-group">
              <span className="view-label">Food</span>
              <div className="care-inv-row">
                {inventoryByKind("food").length > 0 ? inventoryByKind("food").map((item) => (
                  <button key={item.id} className="care-inv-chip" onClick={() => useItem(item)} title={item.description}>
                    <img src={item.icon} alt={item.name} />
                    <i>×{careInventory.filter((id) => id === item.id).length}</i>
                  </button>
                )) : <span className="muted-note">Empty — buy food in the shop.</span>}
              </div>
            </div>
            <div className="care-inv-group">
              <span className="view-label">Soap</span>
              <div className="care-inv-row">
                {inventoryByKind("soap").length > 0 ? inventoryByKind("soap").map((item) => (
                  <button key={item.id} className="care-inv-chip" onClick={() => useItem(item)} title={item.description}>
                    <img src={item.icon} alt={item.name} />
                    <i>×{careInventory.filter((id) => id === item.id).length}</i>
                  </button>
                )) : <span className="muted-note">Empty — buy soap in the shop.</span>}
              </div>
            </div>
            <div className="care-inv-group">
              <span className="view-label">Toys</span>
              <div className="care-inv-row">
                {inventoryByKind("toy").length > 0 ? inventoryByKind("toy").map((item) => (
                  <button key={item.id} className="care-inv-chip" onClick={() => useItem(item)} title={item.description}>
                    <img src={item.icon} alt={item.name} />
                    <i>×{careInventory.filter((id) => id === item.id).length}</i>
                  </button>
                )) : <span className="muted-note">Empty — buy toys in the shop.</span>}
              </div>
            </div>
          </div>

          <span className="view-label" style={{ marginTop: 16, display: "block" }}>Attributes</span>
          <div className="creature-stats">
            <div>
              <span>Personality</span>
              <strong>{p?.personality ?? "—"}</strong>
            </div>
            <div>
              <span>Mood</span>
              <strong>{p?.mood ?? "Resting"}</strong>
            </div>
            <div>
              <span>Energy</span>
              <strong>{source === "live" && p ? `${p.energy}%` : "—"}</strong>
            </div>
            <div>
              <span>Title</span>
              <strong>{p?.title ?? "Hatchling"}</strong>
            </div>
            <div>
              <span>Affinity</span>
              <strong>{p?.affinity ?? "—"}</strong>
            </div>
            <div>
              <span>Total XP</span>
              <strong>{formatNumber(p?.totalXp ?? 0)}</strong>
            </div>
            <div>
              <span>Data Shared</span>
              <strong>{(p?.dataSharedGB ?? 0).toFixed(2)} GB</strong>
            </div>
          </div>

          <div className="creature-loadout-title">
            <span className="view-label">Equipped Gear</span>
            <button onClick={() => setView("Shop")}><ShoppingBag size={14} /> Open Shop</button>
          </div>
          <div className={`set-bonus${set.rarity ? " active" : ""}`}>
            <ShieldCheck size={14} /> {set.label}
          </div>
          <div className="creature-loadout">
            {GEAR_SLOTS.map((slot) => {
              const item = getGearItem(equipped[slot]);
              const level = item ? upgradeLevelOf(upgrades, item.id) : 0;
              const cost = item ? upgradeCost(item, level) : 0;
              const maxed = level >= UPGRADE_MAX;
              return (
                <div className={item ? "filled" : ""} key={slot}>
                  <span>
                    {slot}
                    {item && level > 0 ? <b className="up-badge">+{level}</b> : null}
                  </span>
                  {item ? (
                    <>
                      <img src={item.icon} alt="" />
                      <strong>{item.name}</strong>
                      <small>{item.effectLabel}</small>
                      <div className="loadout-actions">
                        <button
                          className="upgrade"
                          disabled={maxed || coins < cost}
                          onClick={() => upgradeItem(item.id)}
                          title={maxed ? "Max level" : `Upgrade for ${cost} coins`}
                        >
                          {maxed ? "Max +5" : `Upgrade · ${formatNumber(cost)}`}
                        </button>
                        <button onClick={() => unequipSlot(slot)}>Remove</button>
                      </div>
                    </>
                  ) : <em>Empty</em>}
                </div>
              );
            })}
          </div>

          <span className="view-label" style={{ marginTop: 16, display: "block" }}>
            Unlocked Cosmetics
          </span>
          <div className="emoji-grid">
            {cosmetics.length ? (
              cosmetics.map((src) => (
                <button key={src} aria-label="Cosmetic">
                  <img src={src} alt="" />
                </button>
              ))
            ) : (
              <span className="muted-note">Reach Level 15 to unlock your first cosmetic.</span>
            )}
          </div>

          <span className="view-label creature-reactions-label">
            Automatic Reactions
          </span>
          <div className="creature-reaction-history">
            {routerEvents.length > 0 ? routerEvents.slice(0, 6).map((event) => (
              <div key={event.id}>
                <img src={event.reactionSrc} alt="" />
                <span>
                  <strong>{event.title}</strong>
                  <small>{event.detail}</small>
                </span>
              </div>
            )) : (
              <p className="muted-note">
                {source === "live"
                  ? "Watching the router event stream…"
                  : "No synthetic reactions are shown while the router is disconnected."}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
