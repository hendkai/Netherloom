import { Sparkline } from "../components/ui";
import { formatNumber } from "../lib/observatory";
import { useObservatory } from "../state/ObservatoryProvider";
import { TimeWindowControl } from "../components/TimeWindowControl";

export function PeersView() {
  const { metrics, series, values } = useObservatory();

  return (
    <section className="view-page">
      <header className="view-head">
        <div>
          <h2>Peers</h2>
          <p>Known and active peers in the local netDb.</p>
        </div>
        <TimeWindowControl />
      </header>

      <div className="view-grid two">
        <div className="metric-panel">
          <span className="view-label">Known Peers</span>
          <div className="big-number">
            <strong className="tone-blue">{formatNumber(metrics.knownPeers)}</strong>
          </div>
          <Sparkline values={series.peers} color="#1da8ff" filled />
        </div>
        <div className="metric-panel">
          <span className="view-label">Active Peers</span>
          <div className="big-number">
            <strong className="tone-green">{formatNumber(values.peers)}</strong>
          </div>
          <Sparkline values={series.peers} color="#36e56a" filled />
        </div>
      </div>
    </section>
  );
}
