import { Sparkline } from "../components/ui";
import { formatNumber } from "../lib/observatory";
import { activityBreakdown } from "../lib/observatory";
import { useObservatory } from "../state/ObservatoryProvider";
import { TimeWindowControl } from "../components/TimeWindowControl";

export function TunnelsView() {
  const { metrics, series, values } = useObservatory();
  const activity = activityBreakdown(metrics);
  const total = activity.reduce((sum, item) => sum + item.value, 0);

  return (
    <section className="view-page">
      <header className="view-head">
        <div>
          <h2>Tunnels</h2>
          <p>Participating tunnels carried for the network and their activity mix.</p>
        </div>
        <TimeWindowControl />
      </header>

      <div className="metric-panel">
        <span className="view-label">Participating Tunnels</span>
        <div className="big-number">
          <strong className="tone-violet">{formatNumber(values.tunnels)}</strong>
        </div>
        <Sparkline values={series.tunnels} color="#b540ff" filled />
      </div>

      <div className="metric-panel">
        <span className="view-label">Activity Breakdown</span>
        <div className="breakdown">
          {activity.map((item) => (
            <div key={item.label} className="breakdown-row">
              <span style={{ color: item.color }}>{item.label}</span>
              <div className="breakdown-track">
                <i style={{ width: `${(item.value / total) * 100}%`, background: item.color }} />
              </div>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
