import { IdealMealItem, FoodGroup } from "@shared/types/FoodItem.js";
import { Credentials } from "../../types/index.js";
import { getFoodItemsByGroup } from "../foodItemLookup.js";

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function generateIdealMeal(credentials: Credentials): Promise<IdealMealItem[]> {
  const foodItemsByGroup = await getFoodItemsByGroup(credentials);

  const drink = pickRandom(foodItemsByGroup.drink, 1)[0];
  const main = pickRandom(foodItemsByGroup.main, 1)[0];

  // "other 4" slots must include at least 2 distinct food groups
  const otherGroups: FoodGroup[] = ["fruit", "veggie", "snack"];
  const otherPool = otherGroups.flatMap((g) => foodItemsByGroup[g]);
  let others: typeof otherPool;
  do {
    others = pickRandom(otherPool, 4);
  } while (new Set(others.map((i) => i.foodGroup)).size < 2);

  return [drink, main, ...others].map((item) => ({
    itemId: item.itemId,
    name: item.name,
    foodGroup: item.foodGroup,
    rarity: item.rarity,
  }));
}
