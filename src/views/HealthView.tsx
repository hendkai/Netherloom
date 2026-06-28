import { AlertTriangle, CheckCircle2, CircleAlert, Info } from "lucide-react";
import { Ring } from "../components/ui";
import { healthNotices, healthScore, formatUptime } from "../lib/observatory";
import { useObservatory } from "../state/ObservatoryProvider";

export function HealthView() {
  const { metrics } = useObservatory();
  const health = healthScore(metrics);
  const notices = healthNotices(metrics);
  const noticeIcon = {
    good: CheckCircle2,
    info: Info,
    warning: AlertTriangle,
    critical: CircleAlert,
  };

  return (
    <section className="view-page">
      <header className="view-head">
        <h2>Health</h2>
        <p>Overall network health score derived from live router metrics.</p>
      </header>

      <div className="view-grid health-layout">
        <div className="metric-panel health-big">
          <Ring value={health.total} size={170} />
          <div className="health-summary">
            <div>
              <span>Router</span>
              <strong className={metrics.online ? "tone-green" : "tone-violet"}>{metrics.status}</strong>
            </div>
            <div>
              <span>Network</span>
              <strong className={metrics.netHealthy ? "tone-green" : "tone-violet"}>{metrics.netStatus}</strong>
            </div>
            <div>
              <span>Uptime</span>
              <strong>{formatUptime(metrics.uptimeMs)}</strong>
            </div>
          </div>
        </div>

        <div className="metric-panel">
          <span className="view-label">Sub-Scores</span>
          <div className="breakdown">
            {health.parts.map((part) => (
              <div key={part.label} className="breakdown-row">
                <span>{part.label}</span>
                <div className="breakdown-track">
                  <i
                    style={{
                      width: `${part.value}%`,
                      background: part.value >= 70 ? "#43dd5c" : part.value >= 45 ? "#d6e145" : "#ff9d2f",
                    }}
                  />
                </div>
                <strong>{part.value}/100</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="health-notices">
        {notices.map((notice) => {
          const Icon = noticeIcon[notice.severity];
          return (
            <article className={`health-notice ${notice.severity}`} key={notice.title}>
              <Icon size={20} />
              <div>
                <h3>{notice.title}</h3>
                <p>{notice.detail}</p>
                <small>{notice.action}</small>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
