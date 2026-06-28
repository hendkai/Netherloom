import { Clock, Sparkles, Swords, Trophy, X } from "lucide-react";
import { formatNumber } from "../lib/observatory";
import { formatDuration } from "../lib/expeditions";
import { useObservatory, type OfflineSummary } from "../state/ObservatoryProvider";

function SummaryStat({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone?: string }) {
  return (
    <div className="summary-stat">
      <div className="summary-stat-icon" style={tone ? { color: tone } : undefined}>{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

export function OfflineSummaryModal({ summary }: { summary: OfflineSummary }) {
  const { dismissOfflineSummary } = useObservatory();
  const minutes = Math.round(summary.awayMs / 60_000);
  const hours = Math.floor(minutes / 60);
  const minsRest = minutes % 60;
  const awayLabel = hours > 0 ? `${hours}h ${minsRest}m` : `${minutes}m`;

  return (
    <div className="offline-modal-backdrop" role="dialog" aria-modal="true">
      <div className="offline-modal">
        <button className="offline-modal-close" onClick={dismissOfflineSummary} aria-label="Close">
          <X size={16} />
        </button>
        <div className="offline-modal-head">
          <Sparkles size={20} />
          <div>
            <h3>Welcome back</h3>
            <small>You were away for <strong>{awayLabel}</strong></small>
          </div>
        </div>

        <div className="offline-stats">
          {summary.expeditionsClaimed > 0 ? (
            <SummaryStat icon={<Clock size={16} />} label="Expeditions" value={`${summary.expeditionsClaimed} auto-claimed`} tone="#7a5aff" />
          ) : null}
          {summary.eepsitesClaimed > 0 ? (
            <SummaryStat icon={<Clock size={16} />} label="Eepsite visits" value={`${summary.eepsitesClaimed} auto-claimed`} tone="#57c7ff" />
          ) : null}
          {summary.bossDamage > 0 ? (
            <SummaryStat
              icon={<Swords size={16} />}
              label="Auto-attacks on active boss"
              value={`-${formatNumber(summary.bossDamage)} HP` + (summary.bossDefeats > 0 ? ` · ${summary.bossDefeats} defeat${summary.bossDefeats === 1 ? "" : "s"}` : "")}
              tone="#ff5b6e"
            />
          ) : null}
          {summary.rewardsGained.coins > 0 ? (
            <SummaryStat icon={<Trophy size={16} />} label="Coins gained" value={`+${formatNumber(summary.rewardsGained.coins)}`} tone="#ffd36a" />
          ) : null}
          {summary.rewardsGained.xp > 0 ? (
            <SummaryStat icon={<Trophy size={16} />} label="XP gained" value={`+${formatNumber(summary.rewardsGained.xp)}`} tone="#43dd85" />
          ) : null}
          {summary.rewardsGained.items > 0 ? (
            <SummaryStat icon={<Trophy size={16} />} label="Items gained" value={`+${formatNumber(summary.rewardsGained.items)}`} tone="#ff6fae" />
          ) : null}
        </div>

        <button className="offline-modal-dismiss" onClick={dismissOfflineSummary}>
          Continue
        </button>
        <small className="offline-modal-note">
          Offline boss damage is capped at {formatDuration(60 * 60_000)}. Care stats keep decaying in real time. Check the Activity log for full details.
        </small>
      </div>
    </div>
  );
}
