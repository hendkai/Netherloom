import { useEffect, useState } from "react";
import type { GearSlot } from "../lib/economy";
import {
  PET_ATLAS,
  PET_ANIMATION_ROWS,
  petAnimationFrameAt,
  petAnimationSource,
  type PetAnimationSource,
  type PetAnimationState,
} from "../lib/petAnimations";
import { filterForCreature, spriteForCreature } from "../lib/progression";

/**
 * Returns the species atlas only after its spritesheet actually loaded. A
 * species listed in ANIMATED_PET_SPECIES whose .webp is missing (partial
 * release, cache purge) degrades to the static sprite instead of a broken
 * image or an empty canvas hero.
 */
export function useVerifiedPetAnimation(petId: string): PetAnimationSource | null {
  const source = petAnimationSource(petId);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setLoaded(false);
    if (!source) return;
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (!cancelled) setLoaded(true);
    };
    image.onerror = () => {
      if (!cancelled) setLoaded(false);
    };
    image.src = source.src;
    return () => {
      cancelled = true;
    };
  }, [source?.src]);
  return source && loaded ? source : null;
}

interface PetSpriteProps {
  petId: string;
  /** Kept for loadout UI compatibility; gear is intentionally not drawn on pets. */
  equipped?: Partial<Record<GearSlot, string>>;
  size: number;
  baseScale?: number;
  filter?: string;
  className?: string;
  alt?: string;
  animation?: PetAnimationState;
}

interface CompositeResult {
  src: string;
  composed: boolean;
}

/**
 * Compatibility hook for the Observatory canvas. Equipment remains part of
 * progression and stats, but the visual source is always the unmodified pet.
 */
export function usePetCompositeSprite(
  petId: string,
  _equipped: Partial<Record<GearSlot, string>> = {},
  _baseScale = 1,
  _filter?: string,
): CompositeResult {
  return {
    src: spriteForCreature(petId),
    composed: false,
  };
}

export function PetSprite({
  petId,
  size,
  filter,
  className,
  alt = "",
  animation = "idle",
}: PetSpriteProps) {
  const recolor = filter ?? filterForCreature(petId);
  const animated = useVerifiedPetAnimation(petId);
  const [frame, setFrame] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    setFrame(0);
    if (!animated || reducedMotion) return;
    const durations = PET_ANIMATION_ROWS[animation].durations;
    let timeout = 0;
    let current = 0;
    const advance = () => {
      timeout = window.setTimeout(() => {
        current = (current + 1) % durations.length;
        setFrame(current);
        advance();
      }, durations[current]);
    };
    advance();
    return () => window.clearTimeout(timeout);
  }, [animated?.src, animation, reducedMotion]);

  const atlasFrame = petAnimationFrameAt(animation, 0, reducedMotion);
  const column = reducedMotion ? atlasFrame.column : frame;

  return (
    <span
      className={`pet-sprite${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
      data-composite="base"
      data-animation={animated ? animation : "static"}
    >
      {animated ? (
        <span className="pet-sprite-atlas-window" role="img" aria-label={alt}>
          <img
            className="pet-sprite-atlas"
            src={animated.src}
            alt=""
            aria-hidden="true"
            style={{
              filter: recolor,
              width: `${PET_ATLAS.columns * 100}%`,
              height: `${PET_ATLAS.rows * 100}%`,
              transform: `translate(-${column * 100 / PET_ATLAS.columns}%, -${atlasFrame.row * 100 / PET_ATLAS.rows}%)`,
            }}
          />
        </span>
      ) : (
        <img
          className="pet-sprite-composite"
          src={spriteForCreature(petId)}
          alt={alt}
          style={{ filter: recolor }}
        />
      )}
    </span>
  );
}
