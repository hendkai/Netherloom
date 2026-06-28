# Open Points

Tracked known limitations / follow-up work.

## Save slots & backup (implemented)

- 3 handheld-style save slots (`src/lib/saves.ts`, `src/components/SaveSlotSelect.tsx`).
  Game state is namespaced per slot (`netherloom.s{N}.*`); connection/theme settings stay
  global. A pre-slot save auto-migrates into slot 1.
- Backup: Settings → **Download save** / **Import save** (full round-trip per slot) and
  **Switch save slot**.
- **Open (polish):** the save-slot select screen has only basic layout CSS — visual polish
  is intentionally deferred. Hardening idea: add a schema `version` to `progress`/`skills`
  (economy already has one) so future field changes never reset progress.

## Quests (implemented)

- Daily/weekly quests in `src/lib/quests.ts` + `src/views/QuestsView.tsx`, rewarding coins.
- Progress is measured against a per-period baseline; daily/weekly roll over by calendar.
- **Open:** quests only advance on **live** data (xp/data/tunnels/uptime); pool is small —
  expand `DAILY_POOL` / `WEEKLY_POOL` for more variety.

## Pet gear rendering (composite sprites)

Equipped gear uses 384 baked, full-canvas pixel variants from
`public/pet-variants`. `src/components/PetSprite.tsx` combines those finished
assets into one cached 224×224 PNG. The browser does not calculate item
positions, and equipment is not displayed as floating UI badges.

**Done / verified**

- All 24 base species have a tailored variant for each of the 16 visible item
  designs. Item proportions are preserved instead of stretched into squares.
- Item visuals have fixed semantic slots: hats remain Head items, scarves
  remain Neck items, crystals remain Charms, and relay effects remain Auras.
- Every four-slot loadout is composed from the baked species variants and
  cached, avoiding an exponential set of complete loadout images.
- `npm run generate:pet-variants` reproducibly rebuilds the variant library.

## Peers as real routers (`/api/peers`)

- Peer creatures are derived from the active **NTCP2 and SSU2 connection
  tables** (`/peers?tx=ntcp` and `/peers?tx=ssu`): real router hashes, never
  IP addresses. If a future I2P version changes that markup, the hash regex in
  `NetherloomServer.PeersHandler` may need updating.
- The canvas shows up to 7 ambient peer creatures (the visible node slots);
  the full peer set is not all drawn at once by design (readability).
- Live peers require I2PControl connected **and** the new plugin jar loaded
  (router restart after install).
