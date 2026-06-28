import { useEffect, useMemo, useState } from "react";
import { GEAR_SLOTS, getGearItem, type GearItem, type GearSlot } from "../lib/economy";
import { petVariantLayer } from "../lib/petVariants";
import { filterForCreature, spriteForCreature } from "../lib/progression";

interface PetSpriteProps {
  petId: string;
  equipped?: Partial<Record<GearSlot, string>>;
  size: number;
  baseScale?: number;
  filter?: string;
  className?: string;
  alt?: string;
}

interface CompositeResult {
  src: string;
  composed: boolean;
}

const COMPOSITE_SIZE = 224;
const imageCache = new Map<string, Promise<HTMLImageElement>>();
const compositeCache = new Map<string, Promise<string>>();

function loadImage(src: string): Promise<HTMLImageElement> {
  const cached = imageCache.get(src);
  if (cached) return cached;
  const pending = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load sprite ${src}`));
    image.src = src;
  });
  imageCache.set(src, pending);
  return pending;
}

async function compose(
  petId: string,
  equipped: Partial<Record<GearSlot, string>>,
  baseScale: number,
  recolor: string,
): Promise<string> {
  const layers = GEAR_SLOTS.flatMap((slot) => {
    const item = getGearItem(equipped[slot]);
    if (!item) return [];
    const back = petVariantLayer(petId, item.variantKey, "back");
    const front = petVariantLayer(petId, item.variantKey, "front");
    return [{ item, back, front }];
  });
  const base = await loadImage(spriteForCreature(petId));
  const layerImages = await Promise.all(
    layers.map(async (layer) => ({
      ...layer,
      backImage: layer.back ? await loadImage(layer.back) : undefined,
      frontImage: layer.front ? await loadImage(layer.front) : undefined,
    })),
  );
  const canvas = document.createElement("canvas");
  canvas.width = COMPOSITE_SIZE;
  canvas.height = COMPOSITE_SIZE;
  const context = canvas.getContext("2d");
  if (!context) return spriteForCreature(petId);

  context.clearRect(0, 0, COMPOSITE_SIZE, COMPOSITE_SIZE);
  context.imageSmoothingEnabled = false;
  const safeScale = Math.min(1, baseScale);
  context.save();
  context.translate(COMPOSITE_SIZE / 2, COMPOSITE_SIZE * 0.92);
  context.scale(safeScale, safeScale);
  context.translate(-COMPOSITE_SIZE / 2, -COMPOSITE_SIZE * 0.92);

  for (const layer of layerImages) {
    if (layer.backImage) context.drawImage(layer.backImage, 0, 0, COMPOSITE_SIZE, COMPOSITE_SIZE);
  }

  context.save();
  context.filter = recolor || "none";
  context.drawImage(base, 0, 0, COMPOSITE_SIZE, COMPOSITE_SIZE);
  context.restore();

  for (const layer of layerImages) {
    if (layer.frontImage) context.drawImage(layer.frontImage, 0, 0, COMPOSITE_SIZE, COMPOSITE_SIZE);
  }

  context.restore();
  return canvas.toDataURL("image/png");
}

function compositeKey(
  petId: string,
  equipped: Partial<Record<GearSlot, string>>,
  baseScale: number,
  recolor: string,
): string {
  const items = GEAR_SLOTS.map((slot) => equipped[slot] ?? "-").join("|");
  return `${petId}|${items}|${Math.min(1, baseScale).toFixed(3)}|${recolor}`;
}

function getComposite(
  petId: string,
  equipped: Partial<Record<GearSlot, string>>,
  baseScale: number,
  recolor: string,
): Promise<string> {
  const key = compositeKey(petId, equipped, baseScale, recolor);
  const cached = compositeCache.get(key);
  if (cached) return cached;
  const pending = compose(petId, equipped, baseScale, recolor);
  compositeCache.set(key, pending);
  if (compositeCache.size > 256) {
    const oldest = compositeCache.keys().next().value;
    if (typeof oldest === "string") compositeCache.delete(oldest);
  }
  return pending;
}

export function usePetCompositeSprite(
  petId: string,
  equipped: Partial<Record<GearSlot, string>> = {},
  baseScale = 1,
  filter?: string,
): CompositeResult {
  const recolor = filter ?? filterForCreature(petId);
  const fallback = spriteForCreature(petId);
  const key = useMemo(
    () => compositeKey(petId, equipped, baseScale, recolor),
    [petId, equipped, baseScale, recolor],
  );
  const [result, setResult] = useState<CompositeResult>({ src: fallback, composed: false });

  useEffect(() => {
    let cancelled = false;
    setResult({ src: fallback, composed: false });
    getComposite(petId, equipped, baseScale, recolor)
      .then((src) => {
        if (!cancelled) setResult({ src, composed: true });
      })
      .catch(() => {
        if (!cancelled) setResult({ src: fallback, composed: false });
      });
    return () => {
      cancelled = true;
    };
  }, [key, petId, equipped, baseScale, recolor, fallback]);

  return result;
}

export function PetSprite({
  petId,
  equipped = {},
  size,
  baseScale = 1,
  filter,
  className,
  alt = "",
}: PetSpriteProps) {
  const recolor = filter ?? filterForCreature(petId);
  const composite = usePetCompositeSprite(petId, equipped, baseScale, recolor);
  const items = GEAR_SLOTS.flatMap((slot) => {
    const item = getGearItem(equipped[slot]);
    return item ? [item] : [];
  });
  const label = items.length > 0
    ? `${alt || "Pet"} wearing ${items.map((item: GearItem) => item.name).join(", ")}`
    : alt;

  return (
    <span
      className={`pet-sprite${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
      data-composite={composite.composed ? "ready" : "loading"}
    >
      <img
        className="pet-sprite-composite"
        src={composite.src}
        alt={label}
        style={{ filter: composite.composed ? "none" : recolor }}
      />
    </span>
  );
}
