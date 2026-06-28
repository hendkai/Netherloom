import { useState } from "react";
import { Activity as ActivityIcon, Filter, Trash2 } from "lucide-react";
import { useObservatory } from "../state/ObservatoryProvider";
import type { ActivityCategory } from "../lib/activityLog";

const CATEGORY_LABEL: Record<ActivityCategory, string> = {
  boss: "Bosses",
  expedition: "Expeditions",
  eepsite: "Eepsites",
  care: "Care",
  level: "Level",
  evolution: "Evolution",
  discovery: "Discoveries",
  economy: "Economy",
  system: "System",
};

const CATEGORY_TONE: Record<ActivityCategory, string> = {
  boss: "#ff5b6e",
  expedition: "#7a5aff",
  eepsite: "#57c7ff",
  care: "#ff6fae",
  level: "#43dd85",
  evolution: "#b280ff",
  discovery: "#f0df62",
  economy: "#ffd36a",
  system: "#c4cedd",
};

type FilterOption = "all" | ActivityCategory;

const FILTER_OPTIONS: FilterOption[] = [
  "all",
  "boss",
  "expedition",
  "eepsite",
  "level",
  "evolution",
  "discovery",
];

function timeAgo(at: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(at).toLocaleDateString();
}

export function ActivityView() {
  const { activityLog, clearActivity } = useObservatory();
  const [filter, setFilter] = useState<FilterOption>("all");

  const filtered = filter === "all"
    ? activityLog
    : activityLog.filter((entry) => entry.category === filter);

  return (
    <section className="view-page">
      <header className="view-head">
        <h2>Activity</h2>
        <p>Durable log of boss kills, expeditions, eepsite visits, level-ups, evolutions, and discoveries.</p>
      </header>

      <div className="activity-toolbar">
        <div className="activity-filters" aria-label="Activity filter">
          <Filter size={14} />
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option}
              className={filter === option ? "selected" : ""}
              aria-pressed={filter === option}
              onClick={() => setFilter(option)}
            >
              {option === "all" ? "All" : CATEGORY_LABEL[option]}
            </button>
          ))}
        </div>
        <button className="activity-clear" onClick={clearActivity} title="Clear log">
          <Trash2 size={13} /> Clear
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="activity-empty">
          <ActivityIcon size={32} />
          <p>No activity yet. Defeat a boss, complete an expedition, or pick an evolution path to fill this log.</p>
        </div>
      ) : (
        <ul className="activity-list">
          {filtered.map((entry) => {
            const tone = CATEGORY_TONE[entry.category];
            return (
              <li key={entry.id} className="activity-entry" style={{ borderColor: `${tone}55` }}>
                <div className="activity-entry-dot" style={{ background: tone }} />
                <div className="activity-entry-body">
                  <div className="activity-entry-head">
                    <span className="activity-entry-tag" style={{ color: tone }}>
                      {CATEGORY_LABEL[entry.category]}
                    </span>
                    <time>{timeAgo(entry.at)}</time>
                  </div>
                  <strong>{entry.title}</strong>
                  {entry.detail ? <small>{entry.detail}</small> : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
