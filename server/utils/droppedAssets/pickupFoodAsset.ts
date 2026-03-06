import { Credentials } from "../../types/index.js";
import { World } from "../topiaInit.js";

/**
 * Delete a dropped food asset from the world with a particle effect.
 * Acts as a race-condition guard — if the asset was already picked up,
 * the deletion throws and this function returns `{ pickedUp: false }`.
 */
export async function pickupFoodAsset(
  foodAsset: any,
  urlSlug: string,
  credentials: Credentials,
): Promise<{ pickedUp: boolean }> {
  try {
    const world = await World.create(urlSlug, { credentials });
    const assetPosition = { x: foodAsset.position?.x ?? 0, y: foodAsset.position?.y ?? 0 };
    world
      .triggerParticle({
        name: "blueSmoke_puff",
        duration: 2,
        position: assetPosition,
      })
      .catch((error: unknown) => console.error("Failed to trigger particle:", JSON.stringify(error)));
    await foodAsset.deleteDroppedAsset();
    return { pickedUp: true };
  } catch {
    return { pickedUp: false };
  }
}
