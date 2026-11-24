// Barcode lookup against Open Food Facts (free, no key). Data is crowd-sourced,
// so the result is shown for the user to confirm before it is logged.
import { foodFromOff } from "../engine";

export async function lookupBarcode(code) {
  const clean = String(code || "").replace(/\D/g, "");
  if (clean.length < 8) throw new Error("That barcode looks too short.");
  const r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=code,product_name,brands,serving_size,nutriments`);
  if (!r.ok) throw new Error("Lookup failed. Check the connection and try again.");
  const food = foodFromOff(await r.json());
  if (!food) throw new Error("No nutrition data for that barcode. Add it as a custom food.");
  return food;
}
