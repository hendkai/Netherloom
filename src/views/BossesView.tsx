import { useEffect, useMemo, useState } from "react";
import { Lock, Sparkles } from "lucide-react";
import { formatNumber } from "../lib/observatory";
import {
  ATTACK_COOLDOWN_MS,
  clickDamage,
  currentPhase,
  formatHp,
  getBoss,
  itemDamage,
  networkSupportPct,
  phaseThreshold,
  type DamageContext,
} from "../lib/bosses";
import { getCareItem } from "../lib/care";
import { useObservatory } from "../state/ObservatoryProvider";

function formatCooldown(ms: number): string {
  if (ms <= 0) return "0s";
  const seconds = Math.ceil(ms / 1000);
  return `${seconds}s`;
}

function BossHpBar({ progress, phases, accent }: { progress: { currentHp: number; maxHp: number }; phases: number; accent: string }) {
  const pct = Math.max(0, (progress.currentHp / progress.maxHp) * 100);
  return (
    <div className="boss-hp-bar" data-phases={phases}>
      <span style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${accent}, ${accent}aa)` }} />
      {Array.from({ length: phases - 1 }).map((_, i) => {
        const mark = phaseThresholdWrapper(phases, i + 1, progress.maxHp);
        const left = (mark / progress.maxHp) * 100;
        return <i key={i} className="boss-phase-mark" style={{ left: `${left}%` }} />;
      })}
    </div>
  );
}

function phaseThresholdWrapper(phases: number, phase: number, maxHp: number): number {
  const hpPerPhase = maxHp / phases;
  return Math.round(maxHp - hpPerPhase * phase);
}

function AtlasBoss({
  bossId,
  active,
  onSelect,
}: {
  bossId: string;
  active: boolean;
  onSelect: () => void;
}) {
  const { bossSave, progression } = useObservatory();
  const boss = getBoss(bossId);
  const progress = bossSave[bossId];
  if (!boss || !progress) return null;
  const level = progression?.level ?? 0;
  const lockedByLevel = level < boss.minLevel;
  const selectable = progress.unlocked && !lockedByLevel;

  return (
    <button
      className={`atlas-boss${active ? " active" : ""}${!selectable ? " disabled" : ""}`}
      data-kind={bossId}
      style={selectable ? { borderColor: active ? boss.accent : `${boss.accent}55` } : undefined}
      onClick={() => selectable && onSelect()}
      title={lockedByLevel ? `Unlocks at level ${boss.minLevel}` : progress.unlocked ? "Switch target" : "Defeat previous boss to unlock"}
    >
      <div className="atlas-boss-icon" style={{ background: `${boss.accent}22` }}>
        <img src={boss.icon} alt="" />
      </div>
      <div className="atlas-boss-info">
        <strong>{boss.name}</strong>
        <small>{boss.title}</small>
        <div className="atlas-boss-meta">
          <span>HP {formatHp(progress.currentHp)} / {formatHp(progress.maxHp)}</span>
          {progress.kills > 0 ? <i>Kills: {progress.kills}</i> : null}
          {lockedByLevel ? <i className="locked"><Lock size={9} /> Lvl {boss.minLevel}</i> : null}
        </div>
      </div>
    </button>
  );
}

export function BossesView() {
  const {
    bosses,
    bossSave,
    activeBoss,
    activeBossId,
    useCareItemOnBoss,
    setActiveBoss,
    progression,
    metrics,
    source,
    careItems,
    careInventory,
    gearScore,
    evolutionPath,
    creatureName,
  } = useObservatory();
  const [now, setNow] = useState(Date.now());
  const [lastHit, setLastHit] = useState<{ damage: number; defeated: boolean } | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, []);

  const damageCtx: DamageContext = useMemo(() => ({
    level: progression?.level ?? 0,
    gearScore,
    evolutionPath,
    metrics,
    source: source === "live" ? "live" : "disconnected",
  }), [progression?.level, gearScore, evolutionPath, metrics, source]);

  const previewClickDmg = clickDamage(damageCtx);
  const supportPct = networkSupportPct(damageCtx);
  const dps = previewClickDmg / (ATTACK_COOLDOWN_MS / 1000);

  if (!activeBoss) {
    return (
      <section className="view-page">
        <header className="view-head">
          <h2>World Bosses</h2>
          <p>Auto-combat against huge HP-pool threats. Burn care items for burst damage.</p>
        </header>
        <p className="muted-note">No active boss. Adopt a creature to begin.</p>
      </section>
    );
  }
  const { boss, progress } = activeBoss;
  const cooldownRemaining = Math.max(0, (progress.lastAttackAt + ATTACK_COOLDOWN_MS) - now);
  const cooldownPct = Math.max(0, Math.min(1, 1 - cooldownRemaining / ATTACK_COOLDOWN_MS));
  const phase = currentPhase(boss, progress);
  const hpPct = (progress.currentHp / progress.maxHp) * 100;

  const handleAmmo = (itemId: string) => {
    const result = useCareItemOnBoss(itemId);
    if (result) {
      setLastHit({ damage: result.damage, defeated: result.defeated });
      window.setTimeout(() => setLastHit(null), 1800);
    }
  };

  const ammoOptions = careItems
    .filter((item) => careInventory.includes(item.id))
    .map((item) => ({
      item,
      count: careInventory.filter((id) => id === item.id).length,
      damage: itemDamage(item, damageCtx),
    }))
    .sort((a, b) => a.damage - b.damage);

  return (
    <section className="view-page">
      <header className="view-head">
        <h2>World Bosses</h2>
        <p>Auto-combat. {creatureName || "Your companion"} attacks automatically — your job is spending ammo wisely.</p>
      </header>

      {source === "live" ? (
        <div className="boss-support-banner">
          <Sparkles size={14} />
          <span>Network Support active: <strong>+{supportPct}%</strong> damage from {metrics.knownPeers} peers and {metrics.participatingTunnels} tunnels.</span>
        </div>
      ) : (
        <div className="grow-hint">Connect your router to gain Network Support (+ up to 50% damage) and passive tick damage.</div>
      )}

      <section className="boss-arena" style={{ borderColor: `${boss.accent}55` }}>
        <div className="boss-arena-head">
          <div className="boss-portrait" style={{ background: `${boss.accent}22`, boxShadow: `0 0 30px ${boss.accent}55 inset` }}>
            <img src={boss.icon} alt="" />
            <i className="boss-portrait-pct">{Math.round(hpPct)}%</i>
          </div>
          <div className="boss-meta">
            <span className="boss-tag" style={{ color: boss.accent }}>{boss.title}</span>
            <h3>{boss.name}</h3>
            <p>{boss.description}</p>
            <div className="boss-hp-row">
              <strong>{formatHp(progress.currentHp)}</strong>
              <span> / {formatHp(progress.maxHp)} HP</span>
            </div>
            <BossHpBar progress={progress} phases={boss.phases} accent={boss.accent} />
            <div className="boss-phase-tracker">
              Phase <strong>{phase}</strong> / {boss.phases}
              {progress.kills > 0 ? <i>· Kills: {progress.kills}</i> : null}
            </div>
          </div>
        </div>

        <div className="auto-attack-panel">
          <div className="auto-attack-info">
            <div className="auto-attack-stat">
              <span>Per hit</span>
              <strong>{formatNumber(previewClickDmg)}</strong>
            </div>
            <div className="auto-attack-stat">
              <span>DPS</span>
              <strong>{formatNumber(Math.round(dps))}</strong>
            </div>
            <div className="auto-attack-stat">
              <span>Interval</span>
              <strong>{ATTACK_COOLDOWN_MS / 1000}s</strong>
            </div>
          </div>
          <div className="auto-attack-countdown">
            <div className="auto-attack-track">
              <span style={{ width: `${cooldownPct * 100}%`, background: `linear-gradient(90deg, ${boss.accent}, ${boss.accent}cc)` }} />
            </div>
            <div className="auto-attack-time">
              {cooldownRemaining > 0 ? (
                <span>Next attack in <strong>{formatCooldown(cooldownRemaining)}</strong></span>
              ) : (
                <span className="ready">Attacking…</span>
              )}
              {lastHit ? (
                <i className={`auto-attack-hit${lastHit.defeated ? " defeat" : ""}`}>
                  {lastHit.defeated ? "Defeated!" : `-${formatNumber(lastHit.damage)}`}
                </i>
              ) : null}
            </div>
          </div>
        </div>

        <div className="boss-ammo">
          <span className="view-label">Care Items as Ammo (manual burst)</span>
          {ammoOptions.length > 0 ? (
            <div className="ammo-row">
              {ammoOptions.map(({ item, count, damage }) => (
                <button key={item.id} className="ammo-chip" onClick={() => handleAmmo(item.id)} title={`${item.name} → ${formatNumber(damage)} damage`}>
                  <img src={item.icon} alt={item.name} />
                  <span>{formatNumber(damage)} dmg</span>
                  <i>×{count}</i>
                </button>
              ))}
            </div>
          ) : (
            <p className="muted-note">No care items. Buy food / soap / toys in the shop to use as ammo.</p>
          )}
        </div>
      </section>

      <section className="boss-atlas">
        <div className="boss-atlas-head">
          <h3>Boss Atlas</h3>
          <span>Each defeat unlocks the next. Defeated bosses revive tougher for re-farming.</span>
        </div>
        <div className="boss-atlas-grid">
          {bosses.map((boss) => (
            <AtlasBoss
              key={boss.id}
              bossId={boss.id}
              active={boss.id === activeBossId}
              onSelect={() => setActiveBoss(boss.id)}
            />
          ))}
        </div>
      </section>

      <p className="boss-help">
        Auto-attack runs every {ATTACK_COOLDOWN_MS / 1000}s. Network Support {source === "live" ? `+${supportPct}%` : "needs live router"}.
        Switch targets freely — the active pet keeps attacking the selected boss.
      </p>
    </section>
  );
}
