import { BagItem, IdealMealItem } from "@shared/types/FoodItem.js";
import { Credentials } from "../../types/index.js";
import { getAllFoodItems } from "../foodItemLookup.js";

export async function generateBrownBag(credentials: Credentials, idealMeal: IdealMealItem[]): Promise<BagItem[]> {
  const allFoodItems = await getAllFoodItems(credentials);

  const matchIndex = Math.floor(Math.random() * idealMeal.length);
  const matchItem = idealMeal[matchIndex];

  const idealIds = new Set(idealMeal.map((i) => i.itemId));
  const nonIdealPool = allFoodItems.filter((i) => !idealIds.has(i.itemId));

  const shuffled = [...nonIdealPool].sort(() => Math.random() - 0.5);
  const fillers = shuffled.slice(0, 7);

  const allFoodItemsById = new Map(allFoodItems.map((i) => [i.itemId, i]));
  const matchDef = allFoodItemsById.get(matchItem.itemId);

  const bag: BagItem[] = [
    {
      itemId: matchItem.itemId,
      name: matchItem.name,
      foodGroup: matchItem.foodGroup,
      rarity: matchItem.rarity,
      matchesIdealMeal: true,
      nutrition: matchDef?.nutrition,
      funFact: matchDef?.funFact,
    },
    ...fillers.map((item) => ({
      itemId: item.itemId,
      name: item.name,
      foodGroup: item.foodGroup,
      rarity: item.rarity,
      matchesIdealMeal: false,
      nutrition: item.nutrition,
      funFact: item.funFact,
    })),
  ];

  return bag.sort(() => Math.random() - 0.5);
}
