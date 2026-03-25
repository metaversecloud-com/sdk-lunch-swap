import { Credentials } from "../types/index.js";
import { BagItem, FoodItemDefinition, TargetMealItem } from "@shared/types/FoodItem.js";
import { getCachedInventoryItems, InventoryItemType } from "./inventoryCache.js";
import { getFoodItemsById } from "./foodItemLookup.js";
import { InventoryItemInterface, VisitorInterface } from "@rtsdk/topia";

/**
 * Build a BagItem[] from raw inventory items.
 * Shared by getVisitor (already has items in memory) and getVisitorBag (re-fetches).
 */
export const buildBagFromItems = (
  allItems: InventoryItemType[],
  targetMeal: TargetMealItem[],
  foodItemsById: Map<string, FoodItemDefinition>,
): BagItem[] => {
  const targetItemIds = new Set(targetMeal.map((i) => i.itemId));

  return allItems
    .filter(
      (item: InventoryItemType) =>
        item.type === "ITEM" &&
        item.status === "ACTIVE" &&
        (item.quantity ?? item.availableQuantity ?? 1) > 0 &&
        item.item?.name !== "Experience Points" &&
        item.item?.name !== "Reward Token",
    )
    .map((item: InventoryItemType) => {
      const itemId = item.metadata?.itemId ?? item.item?.metadata?.itemId ?? item.name;
      const foodDef = foodItemsById.get(itemId);
      return {
        itemId,
        name: foodDef?.name ?? item.metadata?.name ?? item.name,
        foodGroup: foodDef?.foodGroup ?? item.metadata?.foodGroup ?? "snack",
        rarity: foodDef?.rarity ?? item.metadata?.rarity ?? "common",
        matchesTargetMeal: targetItemIds.has(itemId),
        nutrition: foodDef?.nutrition,
        funFact: foodDef?.funFact,
        image: foodDef?.image,
      };
    });
};

/**
 * Read the visitor's bag from their inventory.
 * Re-fetches inventory items then builds the bag.
 */
export const getVisitorBag = async (
  visitor: VisitorInterface,
  targetMeal: TargetMealItem[],
  credentials: Credentials,
): Promise<BagItem[]> => {
  await visitor.fetchInventoryItems();
  const allItems: InventoryItemInterface[] = visitor.inventoryItems || [];
  const foodItemsById = await getFoodItemsById(credentials);

  return buildBagFromItems(allItems as InventoryItemType[], targetMeal, foodItemsById);
};

/**
 * Build a BagItem from a food definition and check if it matches the target meal.
 */
export const buildBagItemFromDef = (
  foodDef: FoodItemDefinition,
  targetMeal: TargetMealItem[],
): { bagItem: BagItem; matchesTargetMeal: boolean } => {
  const targetItemIds = new Set(targetMeal?.map((i) => i.itemId) || []);
  const matchesTargetMeal = targetItemIds.has(foodDef.itemId);

  const bagItem: BagItem = {
    itemId: foodDef.itemId,
    name: foodDef.name,
    foodGroup: foodDef.foodGroup,
    rarity: foodDef.rarity,
    matchesTargetMeal,
    nutrition: foodDef.nutrition,
    funFact: foodDef.funFact,
    image: foodDef.image,
  };

  return { bagItem, matchesTargetMeal };
};

/**
 * Grant a food item to a visitor's inventory.
 * Looks up the ecosystem item by itemId metadata and grants 1 unit.
 */
export const grantFoodToVisitor = async (
  visitor: VisitorInterface,
  credentials: Credentials,
  bagItem: BagItem,
): Promise<void> => {
  const items = await getCachedInventoryItems({ credentials });
  const ecosystemItem = items.find((item) => item.type === "ITEM" && item.metadata?.itemId === bagItem.itemId);

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
  visitor: VisitorInterface,
  credentials: Credentials,
  itemId: string,
): Promise<void> => {
  const items = await getCachedInventoryItems({ credentials });
  const ecosystemItem = items.find((item) => item.type === "ITEM" && item.metadata?.itemId === itemId);

  if (!ecosystemItem) {
    console.warn(`Ecosystem item not found for itemId: ${itemId}`);
    return;
  }

  await visitor.modifyInventoryItemQuantity(ecosystemItem, -1);
};

/**
 * Read XP from already-fetched visitor inventory items.
 */
export const getVisitorXp = (allItems: InventoryItemType[]): number => {
  const xpItem = allItems.find(
    (item: InventoryItemType) => item.item?.name === "Experience Points" && item.status === "ACTIVE",
  );
  return xpItem?.quantity ?? xpItem?.availableQuantity ?? 0;
};

/**
 * Grant XP to a visitor via the "Experience Points" inventory item.
 * Returns the new total XP quantity.
 */
export const grantXp = async (visitor: any, credentials: Credentials, amount: number): Promise<number> => {
  const items = await getCachedInventoryItems({ credentials });
  const xpItem = items.find((item) => item.name === "Experience Points" && item.status === "ACTIVE");

  if (!xpItem) {
    console.warn("Experience Points item not found in ecosystem");
    return 0;
  }

  const result = await visitor.modifyInventoryItemQuantity(xpItem, amount);
  return result?.quantity ?? 0;
};
