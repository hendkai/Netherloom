# Netherloom

I2P Observatory / Tunnel Flow Visualizer with a local plugin UI, animated tunnel visualization, pet progression, and an I2P plugin package.

**[License: AGPL-3.0-or-later](LICENSE)** · **[GitHub](https://github.com/hendkai/Netherloom)** · **[Issues](https://github.com/hendkai/Netherloom/issues)**

> Netherloom turns your I2P router into a living world. A pixel companion grows in real time from your router's actual contribution to the network — tunnels carried, bandwidth shared, uptime.

## Development

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5173/`.

## Live data & navigation

The UI is fully interactive:

- **Live router metrics** — when running as the I2P plugin, the dashboard polls I2PControl
  (`RouterInfo`) through the bundled proxy and shows real bandwidth, tunnels, peers and uptime.
  Without a reachable router it shows an explicit disconnected state and zero live values. No
  synthetic router activity is generated.
- **Settings** (gear icon or sidebar) — set the I2PControl password (default `itoopie`), poll
  interval and default mode, then use **Test connection**. Settings and the creature name are
  stored in `localStorage`; the password is sent only to the local plugin proxy.
- **Navigation** — each sidebar entry (Traffic, Peers, Tunnels, Health, Creature, Collection,
  Timeline, Settings) opens its own view. The Observatory keeps the original layout.
- **Controls** — Living/Technical mode, canvas zoom and fullscreen, Live/Replay scrubber,
  automatic pet reactions and an inline-editable creature name.
- **History windows** — Traffic, peers and tunnels can be inspected over rolling 1 minute,
  5 minute and 1 hour windows.
- **Health guidance** — router status codes, reachability, peers, traffic and tunnel participation
  produce plain-language diagnostics with a suggested next step.
- **Themes and export** — Dark/Light themes persist locally. Session snapshots export metrics,
  chart history and progression as JSON without credentials, peer identities or route data.

## Creature progression

The creature is a real progression system driven by the router — not static numbers:

- **Onboarding** — first launch suggests three creatures; you pick one and start at **Level 0, 0 XP**.
- **XP from contribution** — while connected to a live router, XP accrues from real activity
  (participating tunnels + shared bandwidth + uptime) and is saved locally. Progress is frozen
  while disconnected.
- **Router-event reactions** — metric changes are recorded as a local event stream. Connection,
  network status, tunnel, peer, traffic, restart and level events make the pet choose a matching
  emote automatically.
- **Living Atlas skill tree** — 75 connected nodes across five branches form a pannable and
  zoomable passive tree with side paths, notables, achievement gates and keystones.
- **Evolution** — the creature grows through stages (Hatchling → Juvenile → Adept → Guardian →
  Ancient) at level milestones, unlocking glow, scale and cosmetics; its title advances too.
- **Router-true stats** — Energy, Mood, Data Shared, Uptime, Peers Helped and Network Score all
  derive from live `RouterMetrics` / accumulated progress. Tunable constants live in
  `src/lib/progression.ts`.

## Economy, gear and pet atlas

- **108 achievements** across router activity, progression, skills, economy, gear and pet
  collection. Every achievement grants virtual coins; Aura gear can boost coin rewards.
- **Nether Market** with 64 persistent items across Head, Neck, Charm and Aura slots.
  Equipment affects energy, contribution XP, shared-data progression or achievement rewards.
- **Pet-specific loadouts** — every companion keeps its own four equipment slots. Moving an item
  to another pet unequips it from the previous wearer, and only the active pet's gear applies effects.
- **Baked pet gear variants** — 384 pet-specific pixel assets cover all 24 species and 16
  visible item designs. The browser combines full-canvas variants without positioning gear from anchors.
- **WoW-style gear score** derived from equipped item levels and shown on the pet, loadout,
  sidebar and shop.
- **1,728 deterministic pets** (24 species × 72 variants) with stable IDs, names, rarity,
  affinity, trait, palette and adoption cost. The paginated Pet Atlas renders only 24 at once.
- **Local-only economy** — coins, purchases, equipment and adopted pets stay in browser storage.
  There are no payments, external accounts, loot boxes or remote economy calls.
- **Long-term pricing** — starter gear begins around 800 coins, higher rarities rise sharply into
  five-digit prices, and pets range from roughly 1,200 to 75,000+ coins. Completing the market
  is intentionally a long-term achievement rather than an onboarding shortcut.

## Production Build

```bash
npm run build
```

## I2P Plugin Build

```bash
npm run build:plugin
npm run validate:plugin
```

Outputs:

- `build/i2p-plugin/netherloom/`
- `dist-plugin/netherloom-0.1.0-dev.xpi2p`

The plugin starts `net.netherloom.plugin.NetherloomServer` on `127.0.0.1:7667`, serves the UI, and exposes:

- `GET /api/health`
- `GET /api/peers` for active NTCP2/SSU2 router hashes (IP addresses are discarded)
- `POST /api/i2pcontrol` proxying to `http://127.0.0.1:7657/jsonrpc/`

The HTML entry point is served with revalidation enabled, while fingerprinted production assets
use immutable caching. Plugin rebuilds therefore load the current bundle after a normal refresh.

The generated `.xpi2p` is an unsigned development archive. Public I2P distribution should be signed with the current I2P SU3 signing workflow and a trusted plugin signing key.

For a local development install:

```bash
npm run install:plugin:dev
```

More detail: [docs/i2p-plugin.md](docs/i2p-plugin.md)

## Stable I2P install URL

To distribute Netherloom at a stable I2P address so users can install it directly
from `http://[your-eepsite]/netherloom.xpi2p`:

1. **Build the signed plugin**: `npm run build:plugin` produces `dist-plugin/netherloom-0.1.0-dev.xpi2p`.
2. **Sign it** with your SU3 signing key via the standard I2P plugin signing workflow.
3. **Host the signed `.xpi2p`** at a stable eepsite. A hidden service with a persistent
   destination key gives you a stable `b32.i2p` address.
4. **Publish the address** in the I2P plugin directory or forum so users can subscribe.

Users then install via the I2P router console: *Configure Plugins → Add* → enter
`http://[your-eepsite]/netherloom.xpi2p` → the router fetches and installs the plugin,
and continues to check that URL for updates.

The `.xpi2p` filename should stay stable (`netherloom.xpi2p`) so update subscriptions
keep working across releases.

## License

Copyright © 2025 Hendrik Kai. Licensed under the [GNU Affero General Public License v3.0 or later](LICENSE) (AGPL-3.0-or-later).

This means you are free to use, modify, and distribute Netherloom — including running it
as a network service — provided that you release the source code of any modified version
that is made available to users over a network. See the [full license text](LICENSE) for
details.

### Third-party assets

- Pixel sprites are original artwork for this project.
- [lucide-react](https://lucide.dev/) icons are licensed under the ISC License.
- [React](https://react.dev/) is licensed under the MIT License.
