import { NutritionScoreResult } from "@shared/types/NutritionScore.js";
import { FOOD_ITEMS_BY_ID } from "@shared/data/foodItems.js";

export function calculateNutritionScore(itemIds: string[]): NutritionScoreResult {
  const items = itemIds.map((id) => FOOD_ITEMS_BY_ID.get(id)).filter(Boolean);

  const totalProtein = items.reduce((sum, i) => sum + (i?.nutrition.protein ?? 0), 0);
  const proteinScore = Math.min(25, Math.round((totalProtein / 40) * 25));

  const totalFiber = items.reduce((sum, i) => sum + (i?.nutrition.fiber ?? 0), 0);
  const fiberScore = Math.min(25, Math.round((totalFiber / 15) * 25));

  const allVitamins = new Set(items.flatMap((i) => i?.nutrition.vitamins ?? []));
  const vitaminDiversity = Math.min(25, Math.round((allVitamins.size / 6) * 25));

  const groups = new Set(items.map((i) => i?.foodGroup));
  const balanceScore = Math.min(25, Math.round((groups.size / 5) * 25));

  const score = proteinScore + fiberScore + vitaminDiversity + balanceScore;

  return {
    score,
    breakdown: { proteinScore, fiberScore, vitaminDiversity, balanceScore },
    superCombos: [],
    totalXpEarned: 0,
    bonusXp: score > 80 ? 50 : 0,
  };
}
