import { Credentials } from "../types/index.js";
import { FoodItemDefinition, Rarity } from "@shared/types/FoodItem.js";
import { DroppedAsset } from "./topiaInit.js";
import { getFoodItemsById } from "./foodItemLookup.js";

export interface ResolvedFoodAsset {
  foodAsset: any;
  foodDef: FoodItemDefinition;
  itemId: string;
  rarity: Rarity;
  wasMystery: boolean;
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
  const foodAsset = await DroppedAsset.get(droppedAssetId, urlSlug, { credentials });
  if (!foodAsset) {
    return { success: false, status: 409, message: "This item was already picked up" };
  }

  await foodAsset.fetchDataObject();

  // Parse uniqueName: lunch-swap-food|{itemId}|{rarity}|{timestamp}|{mystery}
  const parts = ((foodAsset as any).uniqueName || "").split("|");
  let itemId = "";
  let rarity: Rarity = "common";
  const dataObj = foodAsset.dataObject as Record<string, any> | null | undefined;

  if (parts.length >= 3) {
    itemId = parts[1];
    rarity = parts[2] as Rarity;
  } else if (dataObj?.itemId) {
    itemId = dataObj.itemId;
    rarity = dataObj.rarity || "common";
  }

  const wasMystery = parts.length >= 5 ? parts[4] === "1" : false;

  const foodItemsById = await getFoodItemsById(credentials);
  const foodDef = foodItemsById.get(itemId);
  if (!foodDef) {
    return { success: false, status: 400, message: "Unknown food item" };
  }

  return { success: true, foodAsset, foodDef, itemId, rarity, wasMystery };
};
