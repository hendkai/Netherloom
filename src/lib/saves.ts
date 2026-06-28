import { levelForXp, titleForLevel, displayCreatureName } from "./progression";

/** Handheld-style save slots. Game state is namespaced per slot; device-level
 *  settings (connection, theme) stay global and are shared across slots. */
export const SAVE_SLOTS = [1, 2, 3] as const;
export type SlotId = (typeof SAVE_SLOTS)[number];

const ACTIVE_KEY = "netherloom.activeSlot";
const MIGRATED_KEY = "netherloom.migratedV3";

/** Per-slot game-state keys (suffixes). Settings/port stay global. */
const SLOT_BASES = ["creature", "creatureName", "progress", "economy", "skills", "achievements", "routerEvents", "quests"] as const;

function rawKey(slot: SlotId, base: string): string {
  return `netherloom.s${slot}.${base}`;
}

let cachedActive: SlotId | null | undefined;

/**
 * One-time migration: if a pre-slot save exists (un-namespaced keys), move it
 * into slot 1 so existing players keep their progress, then mark slot 1 active.
 */
function migrateLegacyIfNeeded() {
  try {
    if (localStorage.getItem(MIGRATED_KEY)) return;
    const hasLegacy = localStorage.getItem("netherloom.creature") != null;
    if (hasLegacy) {
      for (const base of SLOT_BASES) {
        const legacyKey = `netherloom.${base}`;
        const value = localStorage.getItem(legacyKey);
        if (value != null) {
          localStorage.setItem(rawKey(1, base), value);
          localStorage.removeItem(legacyKey);
        }
      }
      localStorage.setItem(ACTIVE_KEY, "1");
    }
    localStorage.setItem(MIGRATED_KEY, "1");
  } catch {
    /* ignore storage errors */
  }
}

export function getActiveSlot(): SlotId | null {
  if (cachedActive !== undefined) return cachedActive;
  migrateLegacyIfNeeded();
  let value: SlotId | null = null;
  try {
    const n = Number(localStorage.getItem(ACTIVE_KEY));
    if (n === 1 || n === 2 || n === 3) value = n;
  } catch {
    value = null;
  }
  cachedActive = value;
  return value;
}

export function setActiveSlot(slot: SlotId | null) {
  cachedActive = slot;
  try {
    if (slot == null) localStorage.removeItem(ACTIVE_KEY);
    else localStorage.setItem(ACTIVE_KEY, String(slot));
  } catch {
    /* ignore storage errors */
  }
}

/** Storage key for a game-state value in the *active* slot (slot 1 fallback). */
export function slotKey(base: string): string {
  return rawKey(getActiveSlot() ?? 1, base);
}

export function deleteSlot(slot: SlotId) {
  try {
    for (const base of SLOT_BASES) localStorage.removeItem(rawKey(slot, base));
  } catch {
    /* ignore storage errors */
  }
  if (getActiveSlot() === slot) setActiveSlot(null);
}

export interface SlotSummary {
  slot: SlotId;
  empty: boolean;
  petId: string;
  name: string;
  level: number;
  title: string;
  createdAt: number | null;
}

export function slotSummary(slot: SlotId): SlotSummary {
  try {
    const creatureRaw = localStorage.getItem(rawKey(slot, "creature"));
    if (!creatureRaw) return { slot, empty: true, petId: "", name: "", level: 0, title: "", createdAt: null };
    const creature = JSON.parse(creatureRaw) as { id?: string; name?: string; createdAt?: number };
    if (!creature.id) return { slot, empty: true, petId: "", name: "", level: 0, title: "", createdAt: null };

    let totalXp = 0;
    const progressRaw = localStorage.getItem(rawKey(slot, "progress"));
    if (progressRaw) totalXp = Number((JSON.parse(progressRaw) as { totalXp?: number }).totalXp) || 0;
    const level = levelForXp(Math.floor(totalXp));

    return {
      slot,
      empty: false,
      petId: creature.id,
      name: creature.name || displayCreatureName(creature.id),
      level,
      title: titleForLevel(level),
      createdAt: typeof creature.createdAt === "number" ? creature.createdAt : null,
    };
  } catch {
    return { slot, empty: true, petId: "", name: "", level: 0, title: "", createdAt: null };
  }
}

export function allSlotSummaries(): SlotSummary[] {
  return SAVE_SLOTS.map(slotSummary);
}

// --- Backup / restore -----------------------------------------------------

const SAVE_SCHEMA = "netherloom-save-v1";

export interface SaveFile {
  schema: string;
  exportedAt: string;
  slot: SlotId;
  data: Record<string, unknown>;
}

/** Serialize the active slot's raw game state into a portable backup object. */
export function exportSave(): SaveFile {
  const slot = getActiveSlot() ?? 1;
  const data: Record<string, unknown> = {};
  for (const base of SLOT_BASES) {
    const raw = localStorage.getItem(rawKey(slot, base));
    if (raw != null) {
      try {
        data[base] = JSON.parse(raw);
      } catch {
        /* skip corrupt entry */
      }
    }
  }
  return { schema: SAVE_SCHEMA, exportedAt: new Date().toISOString(), slot, data };
}

/** Restore a backup into the *current* slot, overwriting it. Reload after. */
export function importSave(text: string): { ok: boolean; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "Invalid JSON file." };
  }
  const file = parsed as Partial<SaveFile>;
  const data = file?.data;
  if (file?.schema !== SAVE_SCHEMA || !data || typeof data !== "object") {
    return { ok: false, error: "Not a Netherloom save file." };
  }
  const creature = (data as Record<string, unknown>).creature as { id?: string } | undefined;
  if (!creature || typeof creature !== "object" || !creature.id) {
    return { ok: false, error: "Save file contains no creature." };
  }
  const slot = getActiveSlot() ?? 1;
  try {
    for (const base of SLOT_BASES) {
      const value = (data as Record<string, unknown>)[base];
      if (value != null) localStorage.setItem(rawKey(slot, base), JSON.stringify(value));
    }
  } catch {
    return { ok: false, error: "Could not write to storage." };
  }
  return { ok: true };
}
