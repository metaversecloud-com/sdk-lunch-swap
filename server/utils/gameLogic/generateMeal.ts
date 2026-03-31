import { TargetMealItem, FoodGroup } from "@shared/types/FoodItem.js";
import { Credentials } from "../../types/index.js";
import { getFoodItemsByGroup } from "../foodItemLookup.js";

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export async function generateMeal(credentials: Credentials): Promise<TargetMealItem[]> {
  const foodItemsByGroup = await getFoodItemsByGroup(credentials);

  const drink = pickRandom(foodItemsByGroup.drink, 1)[0];
  const main = pickRandom(foodItemsByGroup.main, 1)[0];
  const fruit = pickRandom(foodItemsByGroup.fruit, 1)[0];
  const veggie = pickRandom(foodItemsByGroup.veggie, 1)[0];
  const snack = pickRandom(foodItemsByGroup.snack, 1)[0];

  const bonusGroup: FoodGroup = pickRandom<FoodGroup>(["fruit", "veggie", "snack"], 1)[0];
  const bonusPool = foodItemsByGroup[bonusGroup].filter(
    (i) => i.itemId !== fruit.itemId && i.itemId !== veggie.itemId && i.itemId !== snack.itemId,
  );
  const bonus = bonusPool.length > 0 ? pickRandom(bonusPool, 1)[0] : pickRandom(foodItemsByGroup[bonusGroup], 1)[0];

  return [drink, main, fruit, veggie, snack, bonus].map((item) => ({
    itemId: item.itemId,
    name: item.name,
    foodGroup: item.foodGroup,
    rarity: item.rarity,
    image: item.image,
  }));
}
