import { creatureSprites } from "../data";

export type PetRarity = "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";

export interface PetDefinition {
  id: string;
  baseId: string;
  name: string;
  rarity: PetRarity;
  affinity: string;
  trait: string;
  sprite: string;
  filter: string;
  accent: string;
  adoptionCost: number;
}

const PREFIXES = [
  "Ash", "Azure", "Bright", "Cloud", "Dawn", "Echo",
  "Frost", "Glow", "Lumen", "Mist", "Nova", "Velvet",
] as const;

const EPITHETS = [
  "Drifter", "Keeper", "Listener", "Runner", "Seeker", "Weaver",
] as const;

const AFFINITIES = [
  "Bandwidth", "Tunnels", "Peers", "Uptime", "Resonance", "Vitality",
] as const;

const TRAITS = [
  "Curious", "Steadfast", "Playful", "Watchful", "Patient", "Fearless",
] as const;

const ACCENTS = [
  "#57c7ff", "#8b6dff", "#43dd85", "#ffb24d", "#ff6fae", "#f0df62",
] as const;

function rarityFor(serial: number): PetRarity {
  if (serial % 72 === 0) return "Legendary";
  if (serial % 18 === 0) return "Epic";
  if (serial % 7 === 0) return "Rare";
  if (serial % 3 === 0) return "Uncommon";
  return "Common";
}

function adoptionCost(rarity: PetRarity, serial: number): number {
  const base = {
    Common: 1_200,
    Uncommon: 3_500,
    Rare: 9_000,
    Epic: 24_000,
    Legendary: 75_000,
  }[rarity];
  const variance = rarity === "Legendary" ? serial * 125 : (serial % 10) * 75;
  return Math.round((base + variance) / 25) * 25;
}

export const PET_CATALOG: PetDefinition[] = creatureSprites.flatMap((base) => {
  const baseId = base.name.toLowerCase();
  return Array.from({ length: 72 }, (_, index) => {
    const serial = index + 1;
    const prefix = PREFIXES[index % PREFIXES.length];
    const epithet = EPITHETS[Math.floor(index / PREFIXES.length) % EPITHETS.length];
    const rarity = rarityFor(serial);
    const hue = (index * 47 + creatureSprites.indexOf(base) * 23) % 360;
    const saturation = 0.88 + (index % 5) * 0.09;
    const brightness = 0.9 + (index % 4) * 0.05;
    return {
      id: `${baseId}-${String(serial).padStart(3, "0")}`,
      baseId,
      name: `${prefix} ${base.name} ${epithet}`,
      rarity,
      affinity: AFFINITIES[index % AFFINITIES.length],
      trait: TRAITS[(index + creatureSprites.indexOf(base)) % TRAITS.length],
      sprite: base.src,
      filter: `hue-rotate(${hue}deg) saturate(${saturation}) brightness(${brightness})`,
      accent: ACCENTS[index % ACCENTS.length],
      adoptionCost: adoptionCost(rarity, serial),
    };
  });
});

export const PET_COUNT = PET_CATALOG.length;

const PET_BY_ID = new Map(PET_CATALOG.map((pet) => [pet.id, pet] as const));
const LEGACY_BY_ID = new Map(
  creatureSprites.map((base, index) => {
    const id = base.name.toLowerCase();
    const pet: PetDefinition = {
      id,
      baseId: id,
      name: base.name,
      rarity: "Common",
      affinity: AFFINITIES[index % AFFINITIES.length],
      trait: TRAITS[index % TRAITS.length],
      sprite: base.src,
      filter: "none",
      accent: ACCENTS[index % ACCENTS.length],
      adoptionCost: 0,
    };
    return [id, pet] as const;
  }),
);

export function getPet(id: string): PetDefinition {
  return PET_BY_ID.get(id) ?? LEGACY_BY_ID.get(id) ?? PET_CATALOG[0];
}

export function isCatalogPet(id: string): boolean {
  return PET_BY_ID.has(id);
}

export function suggestPetIds(count = 3, exclude: readonly string[] = []): string[] {
  const excluded = new Set(exclude);
  const picks: string[] = [];
  const start = Math.floor(Math.random() * PET_CATALOG.length);
  for (let offset = 0; offset < PET_CATALOG.length && picks.length < count; offset += 1) {
    const pet = PET_CATALOG[(start + offset * 137) % PET_CATALOG.length];
    if (!excluded.has(pet.id)) picks.push(pet.id);
  }
  return picks;
}
