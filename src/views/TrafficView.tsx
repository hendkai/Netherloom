import { Sparkline, PanelHeader } from "../components/ui";
import { formatBandwidth } from "../lib/observatory";
import { useObservatory } from "../state/ObservatoryProvider";
import { TimeWindowControl } from "../components/TimeWindowControl";

function stats(series: number[]) {
  if (series.length === 0) return { peak: 0, avg: 0 };
  const peak = Math.max(...series);
  const avg = series.reduce((a, b) => a + b, 0) / series.length;
  return { peak, avg };
}

export function TrafficView() {
  const { series, values } = useObservatory();
  const inb = stats(series.inbound);
  const outb = stats(series.outbound);

  return (
    <section className="view-page">
      <header className="view-head">
        <div>
          <h2>Traffic</h2>
          <p>Inbound and outbound bandwidth over the recent sampling window.</p>
        </div>
        <TimeWindowControl />
      </header>

      <div className="view-grid two">
        <div className="metric-panel tall">
          <PanelHeader title="Inbound" />
          <div className="big-number">
            <strong className="tone-blue">{formatBandwidth(values.inbound * 1024 * 1024)}</strong>
          </div>
          <Sparkline values={series.inbound} color="#19a8ff" filled />
          <div className="mini-stats">
            <span>Peak {formatBandwidth(inb.peak * 1024 * 1024)}</span>
            <span>Avg {formatBandwidth(inb.avg * 1024 * 1024)}</span>
          </div>
        </div>

        <div className="metric-panel tall">
          <PanelHeader title="Outbound" status="Live" />
          <div className="big-number">
            <strong className="tone-violet">{formatBandwidth(values.outbound * 1024 * 1024)}</strong>
          </div>
          <Sparkline values={series.outbound} color="#c24dff" filled />
          <div className="mini-stats">
            <span>Peak {formatBandwidth(outb.peak * 1024 * 1024)}</span>
            <span>Avg {formatBandwidth(outb.avg * 1024 * 1024)}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
