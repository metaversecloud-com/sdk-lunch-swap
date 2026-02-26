import { IdealMealItem, FoodGroup } from "@shared/types/FoodItem.js";
import { FOOD_ITEMS_BY_GROUP } from "@shared/data/foodItems.js";

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function generateIdealMeal(): IdealMealItem[] {
  const drink = pickRandom(FOOD_ITEMS_BY_GROUP.drink, 1)[0];
  const main = pickRandom(FOOD_ITEMS_BY_GROUP.main, 1)[0];

  // "other 4" slots must include at least 2 distinct food groups
  const otherGroups: FoodGroup[] = ["fruit", "veggie", "snack"];
  const otherPool = otherGroups.flatMap((g) => FOOD_ITEMS_BY_GROUP[g]);
  let others: typeof otherPool;
  do {
    others = pickRandom(otherPool, 4);
  } while (new Set(others.map((i) => i.foodGroup)).size < 2);

  return [drink, main, ...others].map((item) => ({
    itemId: item.itemId,
    name: item.name,
    foodGroup: item.foodGroup,
    rarity: item.rarity,
    collected: false,
  }));
}
