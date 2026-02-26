import { Asset, DroppedAsset } from "../topiaInit.js";

interface DropFoodItemParams {
  credentials: Record<string, any>;
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
  const offsetX = (Math.random() - 0.5) * offsetRange;
  const offsetY = (Math.random() - 0.5) * offsetRange;
  const mysteryFlag = mystery ? "1" : "0";

  const asset = await Asset.create("webImageAsset", { credentials });
  return DroppedAsset.drop(asset, {
    position: {
      x: position.x + offsetX,
      y: position.y + offsetY,
    },
    uniqueName: `lunch-swap-food|${itemId}|${rarity}|${Date.now()}|${mysteryFlag}`,
    urlSlug: credentials.urlSlug,
    isInteractive: true,
    interactivePublicKey: credentials.interactivePublicKey,
  });
}
