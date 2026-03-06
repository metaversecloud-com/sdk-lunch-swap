import { Credentials } from "../../types/index.js";
import { Asset, DroppedAsset, World } from "../topiaInit.js";
import { getCachedInventoryItems } from "../inventoryCache.js";

interface DropFoodItemParams {
  credentials: Credentials;
  position: { x: number; y: number };
  itemId: string;
  rarity: string;
  offsetRange?: number;
  mystery?: boolean;
  shouldTriggerParticle?: boolean;
}

export async function dropFoodItem({
  credentials,
  position,
  itemId,
  rarity,
  offsetRange = 100,
  mystery = false,
  shouldTriggerParticle = false,
}: DropFoodItemParams) {
  const { interactivePublicKey, sceneDropId, urlSlug } = credentials;

  const offsetX = (Math.random() - 0.5) * offsetRange;
  const offsetY = (Math.random() - 0.5) * offsetRange;
  const mysteryFlag = mystery ? "1" : "0";

  const items = await getCachedInventoryItems({ credentials });
  const inventoryItem = items.find((i) => i.type === "ITEM" && i.metadata?.itemId === itemId);

  if (!inventoryItem) throw "Item not found in inventory: " + itemId;

  const positionWithOffset = {
    x: position.x + offsetX,
    y: position.y + offsetY,
  };
  const asset = await Asset.create("webImageAsset", { credentials });
  const droppedAsset = await DroppedAsset.drop(asset, {
    position: positionWithOffset,
    uniqueName: `lunch-swap-food|${itemId}|${rarity}|${Date.now()}|${mysteryFlag}`,
    urlSlug,
    isInteractive: true,
    interactivePublicKey,
    sceneDropId,
    layer0: inventoryItem.image_path || "",
    assetScale: 0.5,
  });

  // Particle effect at drop location
  if (shouldTriggerParticle) {
    const world = World.create(urlSlug, { credentials });
    world.triggerParticle({ name: "sparkles_float", duration: 2, position: positionWithOffset }).catch(() => {});
  }

  return droppedAsset;
}
