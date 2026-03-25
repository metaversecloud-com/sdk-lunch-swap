import { Credentials } from "../types/index.js";
import { awardBadge } from "./awardBadge.js";
import { VisitorInterface } from "@rtsdk/topia";
import { VisitorBadgeRecord } from "./getVisitorBadges.js";

// Badge names must exactly match the names in the inventory ZIP
const BADGES = {
  BROWN_BAG_BEGINNER: "Brown Bag Beginner",
  CULINARY_CONNOISSEUR: "Culinary Connoisseur",
  LUNCHBOX_LEGEND: "Lunchbox Legend",
  PERFECT_PLATE: "Perfect Plate",
  STREAK_STARTER: "Streak Starter",
  MYSTERY_MAVEN: "Mystery Maven",
  EPIC_COLLECTOR: "Epic Collector",
  COMBO_MASTER: "Combo Master",
  NUTRITION_NINJA: "Nutrition Ninja",
  MASTER_CHEF: "Master Chef",
  GOLDEN_FORK: "Golden Fork",
  CAFETERIA_BOSS: "Cafeteria Boss",
} as const;

interface BadgeContext {
  credentials: Credentials;
  visitor: VisitorInterface;
  visitorInventory: VisitorBadgeRecord;
}

export const checkSubmitMealBadges = async ({
  credentials,
  visitor,
  visitorInventory,
  totalMealsCompleted,
  nutritionScore,
  currentStreak,
  totalSuperCombos,
}: BadgeContext & {
  totalMealsCompleted: number;
  nutritionScore: number;
  currentStreak: number;
  totalSuperCombos: number;
}) => {
  const ctx = { credentials, visitor, visitorInventory };
  const promises: Promise<{ success: boolean }>[] = [];

  // Brown Bag Beginner: Submit first completed meal
  if (totalMealsCompleted >= 1) {
    promises.push(awardBadge({ ...ctx, badgeName: BADGES.BROWN_BAG_BEGINNER }));
  }

  // Culinary Connoisseur: Submit 15 completed meals
  if (totalMealsCompleted >= 15) {
    promises.push(awardBadge({ ...ctx, badgeName: BADGES.CULINARY_CONNOISSEUR }));
  }

  // Lunchbox Legend: Submit 30 completed meals
  if (totalMealsCompleted >= 30) {
    promises.push(awardBadge({ ...ctx, badgeName: BADGES.LUNCHBOX_LEGEND }));
  }

  // Perfect Plate: Get a nutritional score of 95+
  if (nutritionScore >= 95) {
    promises.push(awardBadge({ ...ctx, badgeName: BADGES.PERFECT_PLATE }));
  }

  // Streak Starter: Complete a meal 3 weeks in a row
  if (currentStreak >= 3) {
    promises.push(awardBadge({ ...ctx, badgeName: BADGES.STREAK_STARTER }));
  }

  // Combo Master: Collect 20 super combos
  if (totalSuperCombos >= 20) {
    promises.push(awardBadge({ ...ctx, badgeName: BADGES.COMBO_MASTER }));
  }

  if (promises.length > 0) {
    await Promise.allSettled(promises);
  }
};

export const checkPickupBadges = async ({
  credentials,
  visitor,
  visitorInventory,
  totalMysteryItemsRevealed,
  totalEpicItemsCollected,
}: BadgeContext & {
  totalMysteryItemsRevealed: number;
  totalEpicItemsCollected: number;
}) => {
  const ctx = { credentials, visitor, visitorInventory };
  const promises: Promise<{ success: boolean }>[] = [];

  // Mystery Maven: Reveal 10 mystery items
  if (totalMysteryItemsRevealed >= 10) {
    promises.push(awardBadge({ ...ctx, badgeName: BADGES.MYSTERY_MAVEN }));
  }

  // Epic Collector: Collect 10 epic rarity items
  if (totalEpicItemsCollected >= 10) {
    promises.push(awardBadge({ ...ctx, badgeName: BADGES.EPIC_COLLECTOR }));
  }

  if (promises.length > 0) {
    await Promise.allSettled(promises);
  }
};

export const checkLevelBadges = async ({
  credentials,
  visitor,
  visitorInventory,
  level,
}: BadgeContext & { level: number }) => {
  const ctx = { credentials, visitor, visitorInventory };
  const promises: Promise<{ success: boolean }>[] = [];

  // Master Chef: Reach level 45
  if (level >= 45) {
    promises.push(awardBadge({ ...ctx, badgeName: BADGES.MASTER_CHEF }));
  }

  // Golden Fork: Reach level 60
  if (level >= 60) {
    promises.push(awardBadge({ ...ctx, badgeName: BADGES.GOLDEN_FORK }));
  }

  // Cafeteria Boss: Reach level 75
  if (level >= 75) {
    promises.push(awardBadge({ ...ctx, badgeName: BADGES.CAFETERIA_BOSS }));
  }

  if (promises.length > 0) {
    await Promise.allSettled(promises);
  }
};
