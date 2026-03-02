import { Rarity, RARITY_CONFIG } from "@shared/types/FoodItem.js";
import { XP_ACTIONS } from "@shared/data/xpConfig.js";

/**
 * Calculate XP earned from picking up a food item.
 * Applies rarity multiplier, ideal meal bonus, and optional hot streak multiplier.
 */
export const calculatePickupXp = (
  rarity: Rarity,
  matchesIdealMeal: boolean,
  xpMultiplier: number = 1,
): number => {
  const rarityConfig = RARITY_CONFIG[rarity] || RARITY_CONFIG.common;
  let xpEarned = Math.round(XP_ACTIONS.PICKUP * rarityConfig.xpMultiplier);
  if (matchesIdealMeal) {
    xpEarned += XP_ACTIONS.COLLECT_IDEAL_ITEM;
  }
  return Math.round(xpEarned * xpMultiplier);
};
