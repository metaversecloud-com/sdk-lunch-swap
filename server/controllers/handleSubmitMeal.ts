import { Request, Response } from "express";
import {
  errorHandler,
  getCredentials,
  getKeyAsset,
  parseLeaderboard,
  updateLeaderboard,
  World,
  getFoodItemsById,
  getVisitor,
  grantXp,
  checkSubmitMealBadges,
  checkLevelBadges,
  getVisitorBadges,
} from "@utils/index.js";
import { XP_ACTIONS, getLevelForXp } from "@shared/data/xpConfig.js";
import { RARITY_CONFIG } from "@shared/types/FoodItem.js";
import {
  calculateNutritionScore,
  detectSuperCombos,
  getCurrentDateMT,
  getCurrentWeekMT,
  getPreviousWeekMT,
} from "@utils/gameLogic/index.js";

export const handleSubmitMeal = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, profileId } = credentials;

    const world = World.create(urlSlug, { credentials });

    // Fetch visitor with data and bag
    const { visitor, visitorData, visitorInventory, brownBag } = await getVisitor(credentials, true);

    // Already completed?
    if (visitorData.completedToday) {
      return res.status(400).json({ success: false, message: "Already completed meal today" });
    }

    // Validate: bag contains all matching meal items
    const bagItemIds = new Set(brownBag.map((i) => i.itemId));
    const missingItems = visitorData.targetMeal.filter((item: any) => !bagItemIds.has(item.itemId));

    if (missingItems.length > 0) {
      // Update world stats
      await world.incrementDataObjectValue("totalMealSubmissions", 1, {
        analytics: [{ analyticName: "mealSubmissions", profileId, urlSlug, uniqueKey: profileId }],
      });

      return res.status(400).json({
        success: false,
        message: "Meal incomplete",
        missingItems: missingItems.map((i: any) => ({ itemId: i.itemId, name: i.name, foodGroup: i.foodGroup })),
      });
    }

    // Calculate nutrition score
    const mealItemIds = visitorData.targetMeal.map((i: any) => i.itemId);
    const nutritionResult = await calculateNutritionScore(credentials, mealItemIds);

    // Detect super combos
    const allBagItemIds = brownBag.map((i) => i.itemId);
    const superCombos = detectSuperCombos(allBagItemIds);
    const superComboNames = superCombos.map((c) => c.name);

    // Calculate total XP
    let totalXp = XP_ACTIONS.SUBMIT_MEAL;
    // Rarity bonuses from matching meal items
    const foodItemsById = await getFoodItemsById(credentials);
    for (const item of visitorData.targetMeal) {
      const foodDef = foodItemsById.get(item.itemId);
      if (foodDef) {
        const rarityConfig = RARITY_CONFIG[foodDef.rarity] || RARITY_CONFIG.common;
        totalXp += Math.round(XP_ACTIONS.COLLECT_TARGET_ITEM * (rarityConfig.xpMultiplier - 1));
      }
    }
    // Nutrition bonus
    // if (nutritionResult.score >= 80) {
    //   totalXp += XP_ACTIONS.BALANCED_MEAL_BONUS;
    // }
    // Super combo bonuses
    totalXp += superCombos.reduce((sum, c) => sum + c.bonusXp, 0);

    // Streak logic — weekly: streak increments when completing in consecutive weeks
    const today = getCurrentDateMT();
    const currentWeek = getCurrentWeekMT();
    const previousWeek = getPreviousWeekMT();

    let newStreak: number;
    const lastWeek = visitorData.lastCompletionWeek || "";
    if (lastWeek === currentWeek) {
      // Already completed this week — streak stays the same
      newStreak = visitorData.currentStreak;
    } else if (lastWeek === previousWeek) {
      newStreak = visitorData.currentStreak + 1; // Continuing streak
    } else {
      newStreak = 1; // Starting fresh
    }
    const isNewStreakRecord = newStreak > (visitorData.longestStreak || 0);

    // Streak XP bonus (capped)
    const streakXp = Math.min(newStreak * XP_ACTIONS.STREAK_PER_WEEK, XP_ACTIONS.STREAK_CAP);
    totalXp += streakXp;

    // Apply double-xp buff
    if (visitorData.dailyBuff === "double-xp") {
      totalXp *= 2;
    }

    // Grant XP to visitor inventory and derive level
    const newTotalXp = await grantXp(visitor, credentials, totalXp);
    const newLevel = getLevelForXp(newTotalXp);
    const newLongestStreak = Math.max(visitorData.longestStreak, newStreak);
    const newBestNutrition = Math.max(visitorData.bestNutritionScore, nutritionResult.score);

    // Separate meal items from remaining bag items
    const targetMealItemIds = new Set(mealItemIds);
    const remainingBag = brownBag.filter((i) => !targetMealItemIds.has(i.itemId));

    // Update visitor data
    await visitor.updateDataObject(
      {
        currentStreak: newStreak,
        longestStreak: newLongestStreak,
        lastCompletionDate: today,
        lastCompletionWeek: currentWeek,
        bestNutritionScore: newBestNutrition,
        totalMealsCompleted: (visitorData.totalMealsCompleted || 0) + 1,
        totalSuperCombos: (visitorData.totalSuperCombos || 0) + superCombos.length,
        completedToday: true,
        completionTimestamp: new Date().toISOString(),
        nutritionScore: nutritionResult.score,
        superCombosFound: superComboNames,
      },
      {
        analytics: [
          { analyticName: "completions", profileId, urlSlug, uniqueKey: profileId },
          { analyticName: "mealSubmissions", profileId, urlSlug, uniqueKey: profileId },
        ],
      },
    );

    // Update world stats
    if (world.incrementDataObjectValue) {
      await world.incrementDataObjectValue("totalCompletionsToday", 1);
    }

    // Award badges and re-fetch inventory so client can update UI
    const newTotalMeals = (visitorData.totalMealsCompleted || 0) + 1;
    const newTotalCombos = (visitorData.totalSuperCombos || 0) + superCombos.length;
    try {
      await checkSubmitMealBadges({
        credentials,
        visitor,
        visitorInventory,
        totalMealsCompleted: newTotalMeals,
        nutritionScore: nutritionResult.score,
        currentStreak: newStreak,
        totalSuperCombos: newTotalCombos,
      });
      await checkLevelBadges({ credentials, visitor, visitorInventory, level: newLevel });
    } catch (err) {
      console.warn("Badge check failed:", err);
    }

    // Re-fetch inventory to include any newly awarded badges
    await visitor.fetchInventoryItems();
    const updatedVisitorInventory = getVisitorBadges(visitor.inventoryItems || []);

    // Update leaderboard on key asset and return parsed result
    let leaderboard;
    try {
      const keyAsset = await getKeyAsset(credentials);
      await updateLeaderboard(keyAsset, profileId, credentials.displayName, newTotalMeals, newLongestStreak);
      await keyAsset.fetchDataObject();
      leaderboard = parseLeaderboard(keyAsset);
    } catch (err) {
      console.warn("Leaderboard update failed:", err);
    }

    // Celebration toast
    visitor
      .fireToast({
        title: "Meal Complete!",
        text: `+${totalXp} XP${superCombos.length > 0 ? ` | ${superCombos.length} combo(s)!` : ""}`,
      })
      .catch(() => {});

    return res.json({
      success: true,
      nutritionScore: nutritionResult.score,
      nutritionBreakdown: nutritionResult.breakdown,
      superCombosFound: superComboNames,
      totalXpEarned: totalXp,
      newTotalXp,
      newLevel,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      completedToday: true,
      visitorInventory: updatedVisitorInventory,
      ...(leaderboard && { leaderboard }),
      isNewStreakRecord,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleSubmitMeal",
      message: "Error submitting meal",
      req,
      res,
    });
  }
};
