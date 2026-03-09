import { Credentials } from "../types/index.js";
import { FoodItemDefinition, Rarity } from "@shared/types/FoodItem.js";
import { DroppedAsset } from "./topiaInit.js";
import { getFoodItemsById } from "./foodItemLookup.js";
import { DroppedAssetInterface } from "@rtsdk/topia";

export interface ResolvedFoodAsset {
  foodAsset: DroppedAssetInterface;
  foodDef: FoodItemDefinition;
  itemId: string;
  rarity: Rarity;
  isMystery: boolean;
}

export type ResolveFoodAssetResult =
  | ({ success: true } & ResolvedFoodAsset)
  | { success: false; status: number; message: string };

/**
 * Fetch a dropped food asset, parse its uniqueName for metadata, and look up
 * the food definition. Returns a discriminated union so callers can forward
 * the error status/message directly.
 */
export const resolveFoodAsset = async (
  droppedAssetId: string,
  urlSlug: string,
  credentials: Credentials,
): Promise<ResolveFoodAssetResult> => {
  const foodAsset: DroppedAssetInterface = await DroppedAsset.get(droppedAssetId, urlSlug, { credentials });
  if (!foodAsset) {
    return { success: false, status: 409, message: "This item was already picked up" };
  }

  await foodAsset.fetchDataObject();

  // Parse uniqueName: `LunchSwap_foodItem_${itemId}_${mysteryFlag}`
  const parts = (foodAsset.uniqueName || "").split("_");

  let itemId = "";
  const dataObj = foodAsset.dataObject as Record<string, any> | null | undefined;

  if (parts.length >= 3) {
    itemId = parts[2];
  } else if (dataObj?.itemId) {
    itemId = dataObj.itemId;
  }

  const isMystery = parts.length >= 4 ? parts[3] === "1" : false;

  const foodItemsById = await getFoodItemsById(credentials);
  const foodDef = foodItemsById.get(itemId);
  if (!foodDef) {
    return { success: false, status: 400, message: "Unknown food item" };
  }

  const rarity: Rarity = foodDef.rarity;

  return { success: true, foodAsset, foodDef, itemId, rarity, isMystery };
};
