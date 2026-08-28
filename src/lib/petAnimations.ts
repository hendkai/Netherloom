import { getPet } from "./pets";

export type PetAnimationState =
  | "idle"
  | "running-right"
  | "running-left"
  | "waving"
  | "jumping"
  | "failed"
  | "waiting"
  | "running"
  | "review";

export interface PetAnimationRow {
  row: number;
  durations: readonly number[];
}

export interface PetAnimationSource {
  src: string;
  species: string;
}

export interface PetAnimationFrame {
  column: number;
  row: number;
}

export const PET_ATLAS = {
  columns: 8,
  rows: 9,
  cellWidth: 192,
  cellHeight: 208,
  width: 1536,
  height: 1872,
} as const;

export const PET_ANIMATION_ROWS: Record<PetAnimationState, PetAnimationRow> = {
  idle: { row: 0, durations: [280, 110, 110, 140, 140, 320] },
  "running-right": { row: 1, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  "running-left": { row: 2, durations: [120, 120, 120, 120, 120, 120, 120, 220] },
  waving: { row: 3, durations: [140, 140, 140, 280] },
  jumping: { row: 4, durations: [140, 140, 140, 140, 280] },
  failed: { row: 5, durations: [140, 140, 140, 140, 140, 140, 140, 240] },
  waiting: { row: 6, durations: [150, 150, 150, 150, 150, 260] },
  running: { row: 7, durations: [120, 120, 120, 120, 120, 220] },
  review: { row: 8, durations: [150, 150, 150, 150, 150, 280] },
};

/**
 * Populated only after a species atlas passes Hatch-Pet validation and visual
 * review. Keeping this explicit prevents missing atlases from causing 404s.
 */
export const ANIMATED_PET_SPECIES = [] as const;
const animatedSpecies = new Set<string>(ANIMATED_PET_SPECIES);

function speciesKey(petId: string): string {
  return getPet(petId).baseId.replace(/\s+/g, "-");
}

export function petAnimationSource(petId: string): PetAnimationSource | null {
  if (!petId) return null;
  const species = speciesKey(petId);
  if (!animatedSpecies.has(species)) return null;
  return {
    species,
    src: new URL(`pet-animations/${species}/spritesheet.webp`, document.baseURI).href,
  };
}

export function petAnimationFrameAt(
  state: PetAnimationState,
  elapsedMs: number,
  reducedMotion = false,
): PetAnimationFrame {
  const animation = PET_ANIMATION_ROWS[state];
  if (reducedMotion) return { column: 0, row: animation.row };
  const cycleMs = animation.durations.reduce((sum, duration) => sum + duration, 0);
  let cursor = ((elapsedMs % cycleMs) + cycleMs) % cycleMs;
  for (let column = 0; column < animation.durations.length; column += 1) {
    const duration = animation.durations[column];
    if (cursor < duration) return { column, row: animation.row };
    cursor -= duration;
  }
  return { column: animation.durations.length - 1, row: animation.row };
}
