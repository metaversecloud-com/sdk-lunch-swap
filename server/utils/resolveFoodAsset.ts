import { Credentials } from "../types/index.js";
import { FoodItemDefinition, Rarity } from "@shared/types/FoodItem.js";
import { DroppedAsset } from "./topiaInit.js";
import { getFoodItemDefinition } from "./getFoodItemDefinition.js";
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

  const { itemId, foodDef, isMystery } = await getFoodItemDefinition(foodAsset.uniqueName ?? undefined, credentials);

  if (!foodDef) {
    return { success: false, status: 400, message: "Invalid food item (definition not found)" };
  }

  const rarity: Rarity = foodDef.rarity;

  return { success: true, foodAsset, foodDef, itemId, rarity, isMystery };
};
