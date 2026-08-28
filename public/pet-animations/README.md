# Pet animation atlases

This directory holds per-species animation spritesheets for the animated pet
system. Each accepted species gets one folder:

```
public/pet-animations/<baseId-with-dashes>/spritesheet.webp
```

## Contract

- The spritesheet is a **uniform grid** with exactly `PET_ATLAS` dimensions:
  **8 columns × 9 rows**, cell size **192 × 208 px** (1536 × 1872 total).
- Row assignment is fixed by `PET_ANIMATION_ROWS` in `src/lib/petAnimations.ts`:
  | Row | Animation     | Frames |
  |-----|---------------|--------|
  | 0   | idle          | 6      |
  | 1   | running-right | 8      |
  | 2   | running-left  | 8      |
  | 3   | waving        | 4      |
  | 4   | jumping       | 5      |
  | 5   | failed        | 8      |
  | 6   | waiting       | 6      |
  | 7   | running       | 6      |
  | 8   | review        | 6      |
- Cells beyond an animation's frame count stay empty (transparent).
- A species is only *enabled* once it passes Hatch-Pet validation and visual
  review; then its `baseId` is added to `ANIMATED_PET_SPECIES` in
  `src/lib/petAnimations.ts`.
- **Fallback:** before enabling, `useVerifiedPetAnimation` verifies the sheet
  loads. A missing or corrupt sheet degrades to the static per-variant PNG —
  no 404-driven broken image, no empty hero on the canvas.

The folder is intentionally not committed with placeholders: an empty directory
produces no misleading 404s because no species is listed as animated yet.
