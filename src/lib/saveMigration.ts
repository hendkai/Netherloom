/**
 * Central save-schema migration layer.
 *
 * Every structured save (per-slot game state) is written through
 * {@link saveVersioned}, which records the schema version in a manifest key
 * next to the payload. {@link loadVersioned} reads that manifest, runs any
 * registered migrations in order, re-sanitizes through the caller's validator,
 * and writes the migrated data back so each migration runs at most once.
 *
 * Version semantics:
 * - `CURRENT_SAVE_VERSION` is the version the current code writes.
 * - `migrations[v]` upgrades a save of version `v` to `v + 1`.
 * - A save with **no manifest entry** is treated as version 1 (the last
 *   un-stamped era). All existing players therefore keep working unchanged;
 *   the stamp only becomes meaningful once a future release bumps the version
 *   and registers a migration.
 * - Saves from a *newer* app (version > current) are sanitized best-effort
 *   with a console warning instead of being dropped.
 *
 * Storage is injectable so the layer is unit-testable outside a browser.
 */

export const CURRENT_SAVE_VERSION = 1;

/** Upgrader list: `migrations[v]` turns a version-`v` payload into `v + 1`. */
const migrations: Array<((raw: unknown) => unknown) | undefined> = [];

let currentVersion = CURRENT_SAVE_VERSION;

/**
 * Test-only: override the active schema version and migration chain so the
 * upgrade path can be exercised without shipping a real migration.
 */
export function __test_setSaveVersion(version: number, steps: ReadonlyArray<(raw: unknown) => unknown>): void {
  if (steps.length !== version - 1) {
    throw new Error(`saveMigration: expected ${version - 1} step(s) for version ${version}, got ${steps.length}`);
  }
  currentVersion = version;
  migrations.length = 0;
  migrations.push(...steps);
}

/**
 * Register the migration chain up to {@link CURRENT_SAVE_VERSION}. Call once
 * at module load of the persistence layer. `steps[i]` upgrades version `i + 1`
 * to `i + 2`; the array length must equal `CURRENT_SAVE_VERSION - 1`.
 */
export function registerSaveMigrations(steps: ReadonlyArray<(raw: unknown) => unknown>): void {
  if (steps.length !== CURRENT_SAVE_VERSION - 1) {
    throw new Error(
      `saveMigration: expected ${CURRENT_SAVE_VERSION - 1} migration step(s) for version ${CURRENT_SAVE_VERSION}, got ${steps.length}`,
    );
  }
  migrations.length = 0;
  migrations.push(...steps);
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

let storage: StorageLike | null | undefined;

/** Override the backing storage (tests); `null` disables persistence. */
export function setSaveStorage(next: StorageLike | null): void {
  storage = next;
}

function backend(): StorageLike | null {
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

const MANIFEST_KEY = "netherloom.saveVersions";

function readManifest(store: StorageLike | null): Record<string, number> {
  if (!store) return {};
  try {
    const raw = store.getItem(MANIFEST_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof value === "number" && Number.isFinite(value) && value >= 1) out[key] = Math.floor(value);
    }
    return out;
  } catch {
    return {};
  }
}

function writeManifestVersion(store: StorageLike | null, key: string, version: number): void {
  if (!store) return;
  try {
    const manifest = readManifest(store);
    manifest[key] = version;
    store.setItem(MANIFEST_KEY, JSON.stringify(manifest));
  } catch {
    /* ignore storage errors — version stamps are an optimization, not truth */
  }
}

export function removeSaveEntry(key: string): void {
  const store = backend();
  if (!store) return;
  try {
    store.removeItem(key);
    const manifest = readManifest(store);
    if (key in manifest) {
      delete manifest[key];
      store.setItem(MANIFEST_KEY, JSON.stringify(manifest));
    }
  } catch {
    /* ignore storage errors */
  }
}

/** Persist a structured save and stamp it with the current schema version. */
export function saveVersioned(key: string, value: unknown): boolean {
  const store = backend();
  if (!store) return false;
  try {
    store.setItem(key, JSON.stringify(value));
    writeManifestVersion(store, key, currentVersion);
    return true;
  } catch {
    return false;
  }
}

/**
 * Load a structured save: read → migrate (if stale) → sanitize → write back.
 * `sanitize` is the domain's existing shape validator; `fallback` matches the
 * loader's empty/default result. Returns `fallback` for missing or unreadable
 * saves, exactly like the previous hand-rolled loaders.
 */
export function loadVersioned<T>(
  key: string,
  sanitize: (raw: unknown) => T,
  fallback: T,
): T {
  const store = backend();
  let raw: string | null = null;
  try {
    raw = store?.getItem(key) ?? null;
  } catch {
    return fallback;
  }
  if (raw == null) return fallback;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fallback;
  }

  const manifest = readManifest(store);
  let version = manifest[key] ?? 1;

  if (version > currentVersion) {
    // Save written by a newer build — keep data, skip migrations, no stamp.
    console.warn(`saveMigration: ${key} has version ${version} > current ${currentVersion}; loading best-effort`);
    return sanitize(parsed);
  }

  let value = parsed;
  let failed = false;
  while (version < currentVersion) {
    const step = migrations[version - 1];
    if (!step) {
      console.warn(`saveMigration: no migration for ${key} v${version} → v${version + 1}`);
      failed = true;
      break;
    }
    try {
      value = step(value);
      version += 1;
    } catch (error) {
      console.warn(`saveMigration: migration of ${key} v${version} failed:`, error);
      failed = true;
      break;
    }
  }

  const result = sanitize(value);
  if (!failed && version === currentVersion) {
    writeManifestVersion(store, key, currentVersion);
    // Write the migrated payload back so future loads skip migration entirely.
    try {
      store?.setItem(key, JSON.stringify(result));
    } catch {
      /* ignore storage errors */
    }
  }
  return result;
}
