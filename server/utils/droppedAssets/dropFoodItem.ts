import { Credentials } from "../../types/index.js";
import { Asset, DroppedAsset } from "../topiaInit.js";
import { getCachedInventoryItems } from "../inventoryCache.js";

interface DropFoodItemParams {
  credentials: Credentials;
  position: { x: number; y: number };
  itemId: string;
  rarity: string;
  offsetRange?: number;
  mystery?: boolean;
}

export async function dropFoodItem({
  credentials,
  position,
  itemId,
  rarity,
  offsetRange = 100,
  mystery = false,
}: DropFoodItemParams) {
  const { interactivePublicKey, sceneDropId, urlSlug } = credentials;

  const offsetX = (Math.random() - 0.5) * offsetRange;
  const offsetY = (Math.random() - 0.5) * offsetRange;
  const mysteryFlag = mystery ? "1" : "0";

  const items = await getCachedInventoryItems({ credentials });
  const inventoryItem = items.find((i) => i.type === "ITEM" && i.metadata?.itemId === itemId);

  if (!inventoryItem) throw "Item not found in inventory: " + itemId;

  const asset = await Asset.create("webImageAsset", { credentials });
  const droppedAsset = await DroppedAsset.drop(asset, {
    position: {
      x: position.x + offsetX,
      y: position.y + offsetY,
    },
    uniqueName: `lunch-swap-food|${itemId}|${rarity}|${Date.now()}|${mysteryFlag}`,
    urlSlug,
    isInteractive: true,
    interactivePublicKey,
    sceneDropId,
    layer0: inventoryItem.image_path || "",
    assetScale: 0.5,
  });

  return droppedAsset;
}
