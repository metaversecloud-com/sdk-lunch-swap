import { DroppedAssetInterface, WorldInterface } from "@rtsdk/topia";
import { getFoodItemsById } from "./foodItemLookup.js";
import { getFoodItemDefinition } from "./getFoodItemDefinition.js";
import { Credentials } from "../types/Credentials.js";

export type FoodItemInWorld = {
  itemId: string;
  name: string;
  foodGroup: string;
  rarity: string;
  countInWorld: number;
  droppedAssetIds: string[];
};

export const getFoodItemsInWorld = async (
  world: WorldInterface,
  credentials: Credentials,
): Promise<FoodItemInWorld[]> => {
  const allFoodAssets: DroppedAssetInterface[] = await world.fetchDroppedAssetsWithUniqueName({
    uniqueName: "LunchSwap_foodItem",
    isPartial: true,
  });

  const foodItemsById = await getFoodItemsById(credentials);

  const assetIdsMap = new Map<string, string[]>();
  for (const asset of allFoodAssets) {
    const { itemId } = await getFoodItemDefinition(asset.uniqueName ?? undefined, credentials);
    if (itemId && foodItemsById.has(itemId) && asset.id) {
      const ids = assetIdsMap.get(itemId) || [];
      ids.push(asset.id);
      assetIdsMap.set(itemId, ids);
    }
  }

  return Array.from(foodItemsById.values())
    .map((foodDef) => {
      const droppedAssetIds = assetIdsMap.get(foodDef.itemId) || [];
      return {
        itemId: foodDef.itemId,
        name: foodDef.name,
        foodGroup: foodDef.foodGroup,
        rarity: foodDef.rarity,
        countInWorld: droppedAssetIds.length,
        droppedAssetIds,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
};
