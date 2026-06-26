import { WorldInterface } from "@rtsdk/topia";
import { Credentials } from "../types/Credentials.js";
import { DroppedAsset } from "./topiaInit.js";
import { dropFoodItem } from "./droppedAssets/index.js";
import { getFoodItemsInWorld } from "./getFoodItemsInWorld.js";

/**
 * Ensure exactly one of every food item exists in the world.
 * Deletes duplicates and drops missing items. Intended to run as a
 * fire-and-forget background task after a controller has responded.
 */
export async function ensureOneOfEverything({
  world,
  credentials,
  worldData,
  droppedAsset,
  hostname,
}: {
  world: WorldInterface;
  credentials: Credentials;
  worldData: { dropRadiusMin?: number; dropRadiusMax?: number };
  droppedAsset: { position?: { x: number; y: number } };
  hostname: string;
}) {
  const { urlSlug } = credentials;
  const inWorldData = await getFoodItemsInWorld(world, credentials);

  // Delete duplicates — for items with countInWorld > 1, remove extras
  const deletePromises: Promise<unknown>[] = [];
  for (const item of inWorldData) {
    if (item.countInWorld > 1) {
      for (const assetId of item.droppedAssetIds.slice(1)) {
        deletePromises.push(
          DroppedAsset.create(assetId, urlSlug, { credentials })
            .deleteDroppedAsset()
            .catch(() => {}),
        );
      }
    }
  }
  await Promise.allSettled(deletePromises);

  // Drop missing items — items with countInWorld === 0
  const missingItems = inWorldData.filter((item) => item.countInWorld === 0);
  if (missingItems.length === 0) return;

  await world.fetchDetails();
  const { width, height } = world as WorldInterface;
  const dropCenter = {
    x: droppedAsset.position?.x ?? 0,
    y: droppedAsset.position?.y ?? 0,
  };

  const dropPromises = missingItems.map((item) =>
    dropFoodItem({
      credentials,
      position: dropCenter,
      itemId: item.itemId,
      minOffset: worldData.dropRadiusMin,
      offsetRange: worldData.dropRadiusMax || 2000,
      mystery: Math.random() < 0.15,
      host: hostname,
      worldSize: width && height ? { width, height } : undefined,
    }).catch((err) => console.warn("Failed to drop item:", item.itemId, err)),
  );
  await Promise.allSettled(dropPromises);

  await world.updateDataObject({ lastReplenishedDate: new Date().toISOString() }, {});
}
