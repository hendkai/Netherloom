import { useEffect, useState } from "react";
import { Compass, Sparkles, Zap } from "lucide-react";
import { formatNumber } from "../lib/observatory";
import {
  EXPEDITIONS,
  expeditionProgress,
  formatDuration,
  rushCost,
} from "../lib/expeditions";
import { getCareItem } from "../lib/care";
import { useObservatory } from "../state/ObservatoryProvider";

function fmtRemaining(ms: number): string {
  return formatDuration(ms);
}

export function ExpeditionsView() {
  const {
    expeditions,
    activeExpedition,
    expeditionsCompleted,
    progression,
    source,
    coins,
    creatureName,
    startExpedition,
    rushExpedition,
    claimExpedition,
  } = useObservatory();
  const [, setNow] = useState(Date.now());

  useEffect(() => {
    if (!activeExpedition) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [activeExpedition]);

  const level = progression?.level ?? 0;
  const progress = activeExpedition ? expeditionProgress(activeExpedition.active) : null;
  const rush = progress ? rushCost(progress.remaining) : 0;

  const [lastResult, setLastResult] = useState<{ coins: number; xp: number; careItemId?: string; bonusCoins: number } | null>(null);

  const handleClaim = () => {
    const result = claimExpedition();
    if (result) setLastResult(result);
  };

  const activeDef = activeExpedition?.expedition;

  return (
    <section className="view-page">
      <header className="view-head">
        <h2>Expeditions</h2>
        <p>Send {creatureName || "your companion"} on real-time missions for coins, XP, and care items.</p>
      </header>

      {source !== "live" ? (
        <div className="grow-hint">Expeditions complete on real time — connect your router to earn XP alongside them.</div>
      ) : null}

      <div className="expedition-summary">
        <div className="expedition-summary-stat">
          <span>Completed</span>
          <strong>{formatNumber(expeditionsCompleted)}</strong>
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

      {activeExpedition && progress && activeDef ? (
        <section className={`expedition-active${progress.complete ? " ready" : ""}`}>
          <div className="expedition-active-head">
            <div className="expedition-active-icon" style={{ background: activeDef.accent }}>
              <img src={activeDef.icon} alt="" />
            </div>
            <div>
              <span className="expedition-active-location">{activeDef.location}</span>
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
                  <span>{fmtRemaining(progress.remaining)} remaining</span>
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
              <button className="rush" disabled={coins < rush} onClick={rushExpedition} title={`Rush for ${formatNumber(rush)} coins`}>
                <Zap size={14} /> Rush · {formatNumber(rush)}
              </button>
            )}
          </div>
        </section>
      ) : null}

      {lastResult ? (
        <div className="expedition-result-banner">
          <strong>Expedition complete!</strong>
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
        {expeditions.map((exp) => {
          const locked = level < exp.minLevel;
          const isRunning = activeExpedition?.expedition.id === exp.id;
          const anyRunning = activeExpedition != null;
          const disabled = locked || isRunning || (anyRunning && !progress?.complete);
          return (
            <article
              className={`expedition-card${locked ? " locked" : ""}${isRunning ? " running" : ""}`}
              key={exp.id}
              style={{ borderColor: locked ? undefined : `${exp.accent}55` }}
            >
              <div className="expedition-card-icon" style={{ background: `${exp.accent}22` }}>
                <img src={exp.icon} alt="" />
              </div>
              <div className="expedition-card-copy">
                <span className="expedition-card-location">{exp.location}</span>
                <h4>{exp.name}</h4>
                <p>{exp.description}</p>
                <div className="expedition-card-meta">
                  <span><Compass size={12} /> {formatDuration(exp.durationMs)}</span>
                  <span className="reward-range">
                    {formatNumber(exp.rewards.coinsMin)}–{formatNumber(exp.rewards.coinsMax)} coins
                  </span>
                  <span className="reward-range">
                    {formatNumber(exp.rewards.xpMin)}–{formatNumber(exp.rewards.xpMax)} XP
                  </span>
                </div>
              </div>
              <div className="expedition-card-action">
                {locked ? (
                  <button disabled title={`Unlocks at level ${exp.minLevel}`}>Lock · Lvl {exp.minLevel}</button>
                ) : isRunning ? (
                  <button disabled>Running</button>
                ) : (
                  <button
                    disabled={disabled}
                    onClick={() => startExpedition(exp.id)}
                    style={anyRunning ? undefined : { borderColor: exp.accent, color: exp.accent }}
                  >
                    {anyRunning ? "Busy" : "Send"}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <p className="expedition-help">
        Higher-level expeditions pay better and drop more care items. Rush with coins to skip the wait.
      </p>
    </section>
  );
}
