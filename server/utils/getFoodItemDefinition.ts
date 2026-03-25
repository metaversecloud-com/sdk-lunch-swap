import { FoodItemDefinition } from "@shared/types/FoodItem";
import { Credentials } from "../types/index.js";
import { getFoodItemsById } from "./foodItemLookup.js";

/**
 * Parse a LunchSwap food asset uniqueName: `LunchSwap_foodItem_${itemId}_${mysteryFlag}`
 */
export const getFoodItemDefinition = async (
  uniqueName: string | undefined,
  credentials: Credentials,
): Promise<{ itemId: string; foodDef?: FoodItemDefinition; isMystery: boolean }> => {
  const parts = (uniqueName || "").split("_");

  let itemId = "";
  if (parts.length >= 3) {
    itemId = parts[2];
  }

  const isMystery = parts.length >= 4 ? parts[3] === "1" : false;

  const foodItemsById = await getFoodItemsById(credentials);
  const foodDef = foodItemsById.get(itemId);

  if (!foodDef) return { itemId, isMystery };

  return { itemId, foodDef, isMystery };
};
