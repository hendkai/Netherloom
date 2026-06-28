import { useObservatory, type TimeWindow } from "../state/ObservatoryProvider";

const WINDOWS: TimeWindow[] = ["1m", "5m", "1h"];

export function TimeWindowControl() {
  const { timeWindow, setTimeWindow } = useObservatory();

  return (
    <div className="time-window" aria-label="Chart time window">
      {WINDOWS.map((window) => (
        <button
          key={window}
          className={timeWindow === window ? "selected" : ""}
          onClick={() => setTimeWindow(window)}
          aria-pressed={timeWindow === window}
        >
          {window}
        </button>
      ))}
    </div>
  );
}
