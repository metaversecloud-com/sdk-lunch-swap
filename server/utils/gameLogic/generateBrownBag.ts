import { BagItem, IdealMealItem } from "@shared/types/FoodItem.js";
import { FOOD_ITEMS } from "@shared/data/foodItems.js";

export function generateBrownBag(idealMeal: IdealMealItem[]): BagItem[] {
  const matchIndex = Math.floor(Math.random() * idealMeal.length);
  const matchItem = idealMeal[matchIndex];

  const idealIds = new Set(idealMeal.map((i) => i.itemId));
  const nonIdealPool = FOOD_ITEMS.filter((i) => !idealIds.has(i.itemId));

  const shuffled = [...nonIdealPool].sort(() => Math.random() - 0.5);
  const fillers = shuffled.slice(0, 7);

  const bag: BagItem[] = [
    {
      itemId: matchItem.itemId,
      name: matchItem.name,
      foodGroup: matchItem.foodGroup,
      rarity: matchItem.rarity,
      matchesIdealMeal: true,
    },
    ...fillers.map((item) => ({
      itemId: item.itemId,
      name: item.name,
      foodGroup: item.foodGroup,
      rarity: item.rarity,
      matchesIdealMeal: false,
    })),
  ];

  return bag.sort(() => Math.random() - 0.5);
}
