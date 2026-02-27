import { Credentials } from "../types/index.js";
import { BagItem, IdealMealItem } from "@shared/types/FoodItem.js";
import { getCachedInventoryItems } from "./inventoryCache.js";
import { getFoodItemsById } from "./foodItemLookup.js";

/**
 * Read the visitor's bag from their inventory.
 * Filters for ITEM-type inventory entries and enriches with ecosystem data.
 */
export const getVisitorBag = async (
  visitor: any,
  idealMeal: IdealMealItem[],
  credentials: Credentials,
): Promise<BagItem[]> => {
  await visitor.fetchInventoryItems();
  const allItems: any[] = visitor.inventoryItems || [];

  const idealItemIds = new Set(idealMeal.map((i) => i.itemId));
  const foodItemsById = await getFoodItemsById(credentials);

  return allItems
    .filter((item: any) => item.type === "ITEM" && item.status === "ACTIVE" && (item.quantity ?? item.availableQuantity ?? 1) > 0)
    .map((item: any) => {
      const itemId = item.metadata?.itemId ?? item.item?.metadata?.itemId ?? item.name;
      const foodDef = foodItemsById.get(itemId);
      return {
        itemId,
        name: foodDef?.name ?? item.metadata?.name ?? item.name,
        foodGroup: foodDef?.foodGroup ?? item.metadata?.foodGroup ?? "snack",
        rarity: foodDef?.rarity ?? item.metadata?.rarity ?? "common",
        matchesIdealMeal: idealItemIds.has(itemId),
        nutrition: foodDef?.nutrition,
        funFact: foodDef?.funFact,
      };
    });
};

/**
 * Grant a food item to a visitor's inventory.
 * Looks up the ecosystem item by itemId metadata and grants 1 unit.
 */
export const grantFoodToVisitor = async (
  visitor: any,
  credentials: Credentials,
  bagItem: BagItem,
): Promise<void> => {
  const items = await getCachedInventoryItems({ credentials });
  const ecosystemItem = items.find(
    (item) => item.type === "ITEM" && item.metadata?.itemId === bagItem.itemId,
  );

  if (!ecosystemItem) {
    console.warn(`Ecosystem item not found for itemId: ${bagItem.itemId}`);
    return;
  }

  await visitor.modifyInventoryItemQuantity(ecosystemItem, 1);
};

/**
 * Remove a food item from a visitor's inventory.
 * Looks up the ecosystem item by itemId metadata and decrements by 1.
 */
export const removeFoodFromVisitor = async (
  visitor: any,
  credentials: Credentials,
  itemId: string,
): Promise<void> => {
  const items = await getCachedInventoryItems({ credentials });
  const ecosystemItem = items.find(
    (item) => item.type === "ITEM" && item.metadata?.itemId === itemId,
  );

  if (!ecosystemItem) {
    console.warn(`Ecosystem item not found for itemId: ${itemId}`);
    return;
  }

  await visitor.modifyInventoryItemQuantity(ecosystemItem, -1);
};
