import { Credentials } from "../types/index.js";
import { BagItem, IdealMealItem } from "@shared/types/FoodItem.js";
import { getCachedInventoryItems } from "./inventoryCache.js";
import { getFoodItemsById } from "./foodItemLookup.js";

/**
 * Build a BagItem[] from raw inventory items.
 * Shared by getVisitor (already has items in memory) and getVisitorBag (re-fetches).
 */
export const buildBagFromItems = (
  allItems: any[],
  idealMeal: IdealMealItem[],
  foodItemsById: Map<string, any>,
): BagItem[] => {
  const idealItemIds = new Set(idealMeal.map((i) => i.itemId));

  return allItems
    .filter(
      (item: any) =>
        item.type === "ITEM" &&
        item.status === "ACTIVE" &&
        (item.quantity ?? item.availableQuantity ?? 1) > 0 &&
        item.item?.name !== "Experience Points",
    )
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
 * Read the visitor's bag from their inventory.
 * Re-fetches inventory items then builds the bag.
 */
export const getVisitorBag = async (
  visitor: any,
  idealMeal: IdealMealItem[],
  credentials: Credentials,
): Promise<BagItem[]> => {
  await visitor.fetchInventoryItems();
  const allItems: any[] = visitor.inventoryItems || [];
  const foodItemsById = await getFoodItemsById(credentials);

  return buildBagFromItems(allItems, idealMeal, foodItemsById);
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

/**
 * Read XP from already-fetched visitor inventory items.
 */
export const getVisitorXp = (allItems: any[]): number => {
  const xpItem = allItems.find(
    (item: any) => item.item?.name === "Experience Points" && item.status === "ACTIVE",
  );
  return xpItem?.quantity ?? xpItem?.availableQuantity ?? 0;
};

/**
 * Grant XP to a visitor via the "Experience Points" inventory item.
 * Returns the new total XP quantity.
 */
export const grantXp = async (
  visitor: any,
  credentials: Credentials,
  amount: number,
): Promise<number> => {
  const items = await getCachedInventoryItems({ credentials });
  const xpItem = items.find(
    (item) => item.name === "Experience Points" && item.status === "ACTIVE",
  );

  if (!xpItem) {
    console.warn("Experience Points item not found in ecosystem");
    return 0;
  }

  const result = await visitor.modifyInventoryItemQuantity(xpItem, amount);
  return result?.quantity ?? 0;
};
