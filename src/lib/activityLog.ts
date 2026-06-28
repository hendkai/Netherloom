/**
 * Persistent activity log — durable record of significant game events so the
 * player can review what happened while they were away or distracted. Strictly
 * local, capped to keep localStorage lean.
 */

export type ActivityCategory =
  | "boss"
  | "expedition"
  | "eepsite"
  | "care"
  | "level"
  | "evolution"
  | "discovery"
  | "economy"
  | "system";

export interface ActivityEntry {
  /** Stable unique id. */
  id: string;
  /** Epoch ms. */
  at: number;
  category: ActivityCategory;
  /** Short title, e.g. "Boss defeated: NetDB Drifter". */
  title: string;
  /** Optional detail line, e.g. "+400 coins, +300 XP". */
  detail?: string;
  /** Optional accent color (hex). */
  accent?: string;
}

export type ActivityLog = ActivityEntry[];

const MAX_ENTRIES = 200;

export function createActivityLog(): ActivityLog {
  return [];
}

export function sanitizeActivityLog(value: unknown): ActivityLog {
  if (!Array.isArray(value)) return [];
  const cleaned: ActivityEntry[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const e = raw as Partial<ActivityEntry>;
    if (typeof e.id !== "string") continue;
    if (typeof e.at !== "number") continue;
    if (typeof e.title !== "string") continue;
    cleaned.push({
      id: e.id,
      at: e.at,
      category: typeof e.category === "string" ? (e.category as ActivityCategory) : "system",
      title: e.title,
      detail: typeof e.detail === "string" ? e.detail : undefined,
      accent: typeof e.accent === "string" ? e.accent : undefined,
    });
    if (cleaned.length >= MAX_ENTRIES) break;
  }
  return cleaned.sort((a, b) => b.at - a.at).slice(0, MAX_ENTRIES);
}

let counter = 0;

export function makeActivityId(at: number): string {
  counter += 1;
  return `${at}-${counter}`;
}

export function appendActivity(log: ActivityLog, entries: ActivityEntry | ActivityEntry[]): ActivityLog {
  const incoming = Array.isArray(entries) ? entries : [entries];
  const merged = [...incoming, ...log].sort((a, b) => b.at - a.at);
  return merged.slice(0, MAX_ENTRIES);
}
