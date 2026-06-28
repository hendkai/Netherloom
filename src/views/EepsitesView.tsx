import { useEffect, useState } from "react";
import { Globe, Lock, Sparkles, Zap } from "lucide-react";
import { formatNumber } from "../lib/observatory";
import {
  createEepsiteSave,
  EEPSITES,
  eepsiteProgress,
  formatDuration,
  rushCostEepsite,
} from "../lib/eepsites";
import { getCareItem } from "../lib/care";
import { useObservatory } from "../state/ObservatoryProvider";

export function EepsitesView() {
  const {
    eepsites,
    activeEepsite,
    eepsitesByPet,
    creature,
    progression,
    source,
    coins,
    creatureName,
    startEepsiteVisit,
    rushEepsiteVisit,
    claimEepsiteVisit,
  } = useObservatory();
  const [, setNow] = useState(Date.now());
  const [lastResult, setLastResult] = useState<{ coins: number; xp: number; careItemId?: string; bonusCoins: number } | null>(null);

  useEffect(() => {
    if (!activeEepsite) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeEepsite]);

  const level = progression?.level ?? 0;
  const petId = creature?.id;
  const eepSave = petId ? (eepsitesByPet[petId] ?? createEepsiteSave()) : createEepsiteSave();
  const discovered = eepSave.discovered;

  const progress = activeEepsite ? eepsiteProgress(activeEepsite.active) : null;
  const rush = progress ? rushCostEepsite(progress.remaining) : 0;

  const handleClaim = () => {
    const result = claimEepsiteVisit();
    if (result) setLastResult(result);
  };

  const activeDef = activeEepsite?.eepsite;

  return (
    <section className="view-page">
      <header className="view-head">
        <h2>Eepsites</h2>
        <p>Send {creatureName || "your companion"} into I2P's hidden services for higher-risk, higher-reward loot.</p>
      </header>

      {source !== "live" ? (
        <div className="grow-hint">Visits complete on real time — connect your router to earn XP alongside them.</div>
      ) : null}

      <div className="expedition-summary">
        <div className="expedition-summary-stat">
          <span>Completed</span>
          <strong>{formatNumber(eepSave.completedCount)}</strong>
        </div>
        <div className="expedition-summary-stat">
          <span>Discovered</span>
          <strong>{discovered.length} / {eepsites.length}</strong>
        </div>
        <div className="expedition-summary-stat">
          <span>Active Pet Level</span>
          <strong>{formatNumber(level)}</strong>
        </div>
        <div className="expedition-summary-stat">
          <span>Coins</span>
          <strong>{formatNumber(coins)}</strong>
        </div>
      </div>

      {activeEepsite && progress && activeDef ? (
        <section className={`expedition-active eepsite-active${progress.complete ? " ready" : ""}`} style={{ borderColor: `${activeDef.accent}55` }}>
          <div className="expedition-active-head">
            <div className="expedition-active-icon" style={{ background: activeDef.accent }}>
              <img src={activeDef.icon} alt="" />
            </div>
            <div>
              <span className="expedition-active-location">{activeDef.host}</span>
              <h3>{activeDef.name}</h3>
              <small>{activeDef.description}</small>
            </div>
          </div>
          <div className="expedition-active-progress">
            <div className="expedition-track">
              <span style={{ width: `${progress.pct * 100}%`, background: activeDef.accent }} />
            </div>
            <div className="expedition-active-time">
              {progress.complete ? (
                <strong className="ready">Ready to claim</strong>
              ) : (
                <>
                  <span>{formatDuration(progress.remaining)} remaining</span>
                  <small>{Math.round(progress.pct * 100)}%</small>
                </>
              )}
            </div>
          </div>
          <div className="expedition-active-actions">
            {progress.complete ? (
              <button className="claim" onClick={handleClaim}>
                <Sparkles size={14} /> Claim rewards
              </button>
            ) : (
              <button className="rush" disabled={coins < rush} onClick={rushEepsiteVisit} title={`Rush for ${formatNumber(rush)} coins`}>
                <Zap size={14} /> Rush · {formatNumber(rush)}
              </button>
            )}
          </div>
        </section>
      ) : null}

      {lastResult ? (
        <div className="expedition-result-banner">
          <strong>Eepsite visit complete!</strong>
          <span>+{formatNumber(lastResult.coins)} coins</span>
          <span>+{formatNumber(lastResult.xp)} XP</span>
          {lastResult.bonusCoins > 0 ? <span className="jackpot">+{formatNumber(lastResult.bonusCoins)} bonus!</span> : null}
          {lastResult.careItemId ? (
            <span>+1 {getCareItem(lastResult.careItemId)?.name ?? "item"}</span>
          ) : null}
          <button onClick={() => setLastResult(null)}>Dismiss</button>
        </div>
      ) : null}

      <div className="expedition-grid">
        {eepsites.map((eep) => {
          const isDiscovered = discovered.includes(eep.id);
          const lockedByLevel = level < eep.minLevel;
          const isRunning = activeEepsite?.eepsite.id === eep.id;
          const anyRunning = activeEepsite != null;
          const disabled = !isDiscovered || lockedByLevel || isRunning || (anyRunning && !progress?.complete);

          return (
            <article
              className={`expedition-card eepsite-card${!isDiscovered ? " undiscovered" : ""}${lockedByLevel ? " locked" : ""}${isRunning ? " running" : ""}`}
              key={eep.id}
              style={isDiscovered ? { borderColor: `${eep.accent}55` } : undefined}
            >
              <div className="expedition-card-icon" style={isDiscovered ? { background: `${eep.accent}22` } : undefined}>
                <img src={eep.icon} alt="" />
              </div>
              <div className="expedition-card-copy">
                {isDiscovered ? (
                  <>
                    <span className="expedition-card-location" style={{ color: eep.accent }}>
                      <Globe size={11} /> {eep.host}
                    </span>
                    <h4>{eep.name}</h4>
                    <p>{eep.description}</p>
                    <div className="expedition-card-meta">
                      <span>⏱ {formatDuration(eep.durationMs)}</span>
                      <span className="reward-range">{formatNumber(eep.rewards.coinsMin)}–{formatNumber(eep.rewards.coinsMax)} coins</span>
                      <span className="reward-range">{formatNumber(eep.rewards.xpMin)}–{formatNumber(eep.rewards.xpMax)} XP</span>
                    </div>
                  </>
                ) : (
                  <>
                    <span className="expedition-card-location">
                      <Lock size={11} /> Undiscovered
                    </span>
                    <h4>???.i2p</h4>
                    <p>{eep.discoveryHint}</p>
                  </>
                )}
              </div>
              <div className="expedition-card-action">
                {!isDiscovered ? (
                  <button disabled title="Locked">Hidden</button>
                ) : lockedByLevel ? (
                  <button disabled title={`Unlocks at level ${eep.minLevel}`}>Lock · Lvl {eep.minLevel}</button>
                ) : isRunning ? (
                  <button disabled>Visiting</button>
                ) : (
                  <button
                    disabled={disabled}
                    onClick={() => startEepsiteVisit(eep.id)}
                    style={anyRunning ? undefined : { borderColor: eep.accent, color: eep.accent }}
                  >
                    {anyRunning ? "Busy" : "Visit"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className="expedition-help">
        Eepsites offer better loot than expeditions. Hidden services (???.i2p) unlock by defeating specific bosses — defeat the boss shown in the hint to reveal the host.
      </p>
    </section>
  );
}
