import { RouterEventIcon } from "../components/RouterEventIcon";
import { useObservatory } from "../state/ObservatoryProvider";

export function TimelineView() {
  const { source, lastUpdated, routerEvents } = useObservatory();

  return (
    <section className="view-page">
      <header className="view-head">
        <h2>Timeline</h2>
        <p>
          Router telemetry events detected during live polling.
          {lastUpdated > 0 ? ` Last sample ${new Date(lastUpdated).toLocaleTimeString()}.` : ""}
        </p>
      </header>

      <div className="metric-panel">
        {routerEvents.length > 0 ? (
          <ul className="timeline">
            {routerEvents.map((event) => (
              <li className={`router-event-${event.severity}`} key={event.id}>
                <span className="timeline-time">
                  {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
                <i className="timeline-dot" />
                <img className="timeline-reaction" src={event.reactionSrc} alt="" />
                <div>
                  <strong>
                    <RouterEventIcon kind={event.kind} size={14} /> {event.title}
                  </strong>
                  <small>{event.detail}</small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="timeline-empty">
            <strong>No router events recorded</strong>
            <p>
              {source === "live"
                ? "Netherloom is watching the live telemetry stream for meaningful changes."
                : "Connect I2PControl in Settings. Synthetic events are not generated."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
