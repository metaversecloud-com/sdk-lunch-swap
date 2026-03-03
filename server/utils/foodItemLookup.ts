import { Credentials } from "../types/index.js";
import { FoodItemDefinition, FoodGroup, NutritionInfo } from "@shared/types/FoodItem.js";
import { getCachedInventoryItems } from "./inventoryCache.js";

function toFoodItemDefinition(item: { name: string; metadata?: Record<string, any> }): FoodItemDefinition | null {
  const m = item.metadata;
  if (!m?.itemId) return null;
  return {
    itemId: m.itemId,
    name: m.name || item.name,
    foodGroup: m.foodGroup as FoodGroup,
    rarity: m.rarity,
    nutrition: (m.nutrition as NutritionInfo) || { calories: 0, protein: 0, carbs: 0, fiber: 0, vitamins: [] },
    funFact: m.funFact || "",
    superComboPairs: m.superComboPairs || [],
    sortOrder: m.sortOrder ?? 0,
  };
}

export async function getFoodItemsById(credentials: Credentials): Promise<Map<string, FoodItemDefinition>> {
  const items = await getCachedInventoryItems({ credentials });
  const map = new Map<string, FoodItemDefinition>();
  for (const item of items) {
    if (item.type !== "ITEM" || item.name === "Experience Points" || item.name === "Reward Token") continue;
    const def = toFoodItemDefinition(item);
    if (def) map.set(def.itemId, def);
  }
  return map;
}

export async function getFoodItemsByGroup(credentials: Credentials): Promise<Record<FoodGroup, FoodItemDefinition[]>> {
  const byId = await getFoodItemsById(credentials);
  const groups: Record<FoodGroup, FoodItemDefinition[]> = {
    drink: [],
    fruit: [],
    veggie: [],
    main: [],
    snack: [],
  };
  for (const def of byId.values()) {
    if (def.foodGroup in groups) {
      groups[def.foodGroup].push(def);
    }
  }
  return groups;
}

export async function getAllFoodItems(credentials: Credentials): Promise<FoodItemDefinition[]> {
  const byId = await getFoodItemsById(credentials);
  return Array.from(byId.values());
}
