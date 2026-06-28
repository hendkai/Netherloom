import { Check, Coins } from "lucide-react";
import { formatNumber } from "../lib/observatory";
import { useObservatory } from "../state/ObservatoryProvider";
import type { QuestInstance, QuestMetric } from "../lib/quests";

function fmt(metric: QuestMetric, value: number): string {
  if (metric === "dataSharedGB") return `${value.toFixed(2)} GB`;
  if (metric === "uptimeHours") return `${value.toFixed(1)} h`;
  return formatNumber(Math.floor(value));
}

function QuestCard({ q, onClaim }: { q: QuestInstance; onClaim: (id: string) => void }) {
  return (
    <div className={`quest-card${q.completable ? " ready" : ""}${q.claimed ? " claimed" : ""}`}>
      <div className="quest-head">
        <strong>{q.def.title}</strong>
        <span className="quest-reward">
          <Coins size={13} /> {formatNumber(q.def.reward)}
        </span>
      </div>
      <p>{q.def.description}</p>
      <div className="quest-track">
        <i style={{ width: `${q.pct * 100}%` }} />
      </div>
      <div className="quest-foot">
        <span>
          {fmt(q.def.metric, q.current)} / {fmt(q.def.metric, q.target)}
        </span>
        {q.claimed ? (
          <span className="quest-done">
            <Check size={14} /> Claimed
          </span>
        ) : (
          <button disabled={!q.completable} onClick={() => onClaim(q.instanceId)}>
            {q.completable ? "Claim reward" : `${Math.round(q.pct * 100)}%`}
          </button>
        )}
      </div>
    </div>
  );
}

export function QuestsView() {
  const { quests, claimQuest, source } = useObservatory();
  const daily = quests.filter((q) => q.def.period === "daily");
  const weekly = quests.filter((q) => q.def.period === "weekly");

  return (
    <section className="view-page">
      <header className="view-head">
        <h2>Quests</h2>
        <p>Daily and weekly goals that reward coins for real router contribution.</p>
      </header>

      {source !== "live" ? (
        <div className="grow-hint">Connect your router through I2PControl — most quests only progress on live data.</div>
      ) : null}

      <div className="metric-panel">
        <span className="view-label">Daily</span>
        <div className="quest-grid">
          {daily.map((q) => (
            <QuestCard key={q.instanceId} q={q} onClaim={claimQuest} />
          ))}
        </div>
      </div>

      <div className="metric-panel">
        <span className="view-label">Weekly</span>
        <div className="quest-grid">
          {weekly.map((q) => (
            <QuestCard key={q.instanceId} q={q} onClaim={claimQuest} />
          ))}
        </div>
      </div>
    </section>
  );
}
