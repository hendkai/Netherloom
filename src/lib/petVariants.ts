import { getPet } from "./pets";

type VariantSide = "front" | "back";
const BACK_VARIANTS = new Set(["ufo", "relay-antenna"]);

function speciesKey(petId: string): string {
  return getPet(petId).baseId.replace(/\s+/g, "-");
}

export function petVariantLayer(
  petId: string,
  variantKey: string,
  side: VariantSide,
): string {
  if ((side === "back") !== BACK_VARIANTS.has(variantKey)) return "";
  const path = `pet-variants/${side}/${speciesKey(petId)}/${variantKey}.png`;
  return new URL(path, document.baseURI).href;
}
