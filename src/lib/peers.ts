import { creatureSprites } from "../data";

export interface PeerCreature {
  hash: string;
  short: string;
  baseId: string;
  sprite: string;
  color: string;
}

const PEER_COLORS = [
  "#57c7ff", "#8b6dff", "#43dd85", "#ffb24d",
  "#ff6fae", "#f0df62", "#5df5c4", "#c98bff",
];

/** FNV-1a hash → unsigned 32-bit. Deterministic per router hash. */
function hashNum(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Map a peer's public router hash to a stable creature — the same peer always
 * yields the same base creature and accent colour. No IP, just the hash.
 */
export function peerToCreature(hash: string): PeerCreature {
  const n = hashNum(hash);
  const base = creatureSprites[n % creatureSprites.length];
  return {
    hash,
    short: `${hash.slice(0, 6)}…`,
    baseId: base.name.toLowerCase(),
    sprite: base.src,
    color: PEER_COLORS[(n >>> 3) % PEER_COLORS.length],
  };
}

/** Fetch connected peers from the plugin proxy and map them to creatures. */
export async function fetchPeers(): Promise<PeerCreature[]> {
  const response = await fetch("./api/peers", { cache: "no-store" });
  if (!response.ok) throw new Error(`peers ${response.status}`);
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) throw new Error("peers response not json");
  const body = (await response.json()) as { peers?: string[] };
  const peers = Array.isArray(body.peers) ? body.peers : [];
  return peers.map(peerToCreature);
}
