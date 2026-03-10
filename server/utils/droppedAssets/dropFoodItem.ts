import { Credentials } from "../../types/index.js";
import { Asset, DroppedAsset, World } from "../topiaInit.js";
import { getCachedInventoryItems } from "../inventoryCache.js";
import { DroppedAssetClickType } from "@rtsdk/topia";

interface DropFoodItemParams {
  credentials: Credentials;
  position: { x: number; y: number };
  itemId: string;
  rarity: string;
  offsetRange?: number;
  minOffset?: number;
  mystery?: boolean;
  shouldTriggerParticle?: boolean;
  host: string;
}

export async function dropFoodItem({
  credentials,
  position,
  itemId,
  rarity,
  offsetRange = 100,
  minOffset = 0,
  mystery = false,
  shouldTriggerParticle = false,
  host,
}: DropFoodItemParams) {
  const { interactivePublicKey, sceneDropId, urlSlug } = credentials;

  let offsetX: number;
  let offsetY: number;

  if (minOffset > 0) {
    // Place at random angle, random distance between minOffset and offsetRange/2
    const angle = Math.random() * 2 * Math.PI;
    const maxDist = offsetRange / 2;
    const dist = minOffset + Math.random() * (maxDist - minOffset);
    offsetX = Math.cos(angle) * dist;
    offsetY = Math.sin(angle) * dist;
  } else {
    offsetX = (Math.random() - 0.5) * offsetRange;
    offsetY = (Math.random() - 0.5) * offsetRange;
  }
  const mysteryFlag = mystery ? "1" : "0";

  const items = await getCachedInventoryItems({ credentials });
  const inventoryItem = items.find((i) => i.type === "ITEM" && i.metadata?.itemId === itemId);

  if (!inventoryItem) throw "Item not found in inventory: " + itemId;

  const protocol = process.env.INSTANCE_PROTOCOL;
  let BASE_URL = `${protocol}://${host}`;
  if (host === "localhost") BASE_URL = "http://localhost:3001";

  const positionWithOffset = {
    x: position.x + offsetX,
    y: position.y + offsetY,
  };
  const asset = await Asset.create("webImageAsset", { credentials });
  const droppedAsset = await DroppedAsset.drop(asset, {
    clickType: DroppedAssetClickType.LINK,
    clickableLink: `${BASE_URL}/item/${itemId}?mystery=${mysteryFlag}`,
    clickableLinkTitle: "View Crop",
    isOpenLinkInDrawer: true,
    position: positionWithOffset,
    uniqueName: `LunchSwap_foodItem_${itemId}_${mysteryFlag}`,
    urlSlug,
    isInteractive: true,
    interactivePublicKey,
    sceneDropId,
    layer1: inventoryItem.image_path || "",
    assetScale: 0.5,
  });

  // Particle effect at drop location
  if (shouldTriggerParticle) {
    const world = World.create(urlSlug, { credentials });
    world.triggerParticle({ name: "sparkles_float", duration: 2, position: positionWithOffset }).catch(() => {});
  }

  return droppedAsset;
}
