import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, World, dropFoodItem } from "../utils/index.js";
import { VISITOR_DATA_DEFAULTS } from "@shared/types/DataObjects.js";
import { FOOD_ITEMS_BY_ID } from "@shared/data/foodItems.js";
import { XP_ACTIONS, getLevelForXp } from "@shared/data/xpConfig.js";
import { RARITY_CONFIG } from "@shared/types/FoodItem.js";
import { calculateNutritionScore, detectSuperCombos, getCurrentDateMT } from "../utils/gameLogic/index.js";

export const handleSubmitMeal = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    const world = World.create(urlSlug, { credentials });

    // Fetch visitor data
    const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    await visitor.fetchDataObject();
    const visitorData = { ...VISITOR_DATA_DEFAULTS, ...visitor.dataObject };

    // Already completed?
    if (visitorData.completedToday) {
      return res.status(400).json({ success: false, message: "Already completed meal today" });
    }

    // Validate: bag contains all ideal meal items
    const bagItemIds = new Set(visitorData.brownBag.map((i: any) => i.itemId));
    const missingItems = visitorData.idealMeal.filter((item: any) => !bagItemIds.has(item.itemId));

    if (missingItems.length > 0) {
      // Update world stats
      if (world.incrementDataObjectValue) {
        await world.incrementDataObjectValue("totalMealSubmissions", 1);
      }

      return res.status(400).json({
        success: false,
        message: "Meal incomplete",
        missingItems: missingItems.map((i: any) => ({ itemId: i.itemId, name: i.name, foodGroup: i.foodGroup })),
      });
    }

    // Calculate nutrition score
    const mealItemIds = visitorData.idealMeal.map((i: any) => i.itemId);
    const nutritionResult = calculateNutritionScore(mealItemIds);

    // Detect super combos
    const allBagItemIds = visitorData.brownBag.map((i: any) => i.itemId);
    const superCombos = detectSuperCombos(allBagItemIds);
    const superComboNames = superCombos.map((c) => c.name);

    // Calculate total XP
    let totalXp = XP_ACTIONS.SUBMIT_MEAL;
    // Rarity bonuses from ideal meal items
    for (const item of visitorData.idealMeal) {
      const foodDef = FOOD_ITEMS_BY_ID.get(item.itemId);
      if (foodDef) {
        const rarityConfig = RARITY_CONFIG[foodDef.rarity] || RARITY_CONFIG.common;
        totalXp += Math.round(XP_ACTIONS.COLLECT_IDEAL_ITEM * (rarityConfig.xpMultiplier - 1));
      }
    }
    // Nutrition bonus
    if (nutritionResult.score >= 80) {
      totalXp += XP_ACTIONS.BALANCED_MEAL_BONUS;
    }
    // Super combo bonuses
    totalXp += superCombos.reduce((sum, c) => sum + c.bonusXp, 0);

    // Streak logic (B5)
    const today = getCurrentDateMT();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleDateString("en-CA", { timeZone: "America/Denver" });

    let newStreak: number;
    if (visitorData.lastCompletionDate === yesterdayStr) {
      newStreak = visitorData.currentStreak + 1; // Continuing streak
    } else {
      newStreak = 1; // Starting fresh
    }

    // Streak XP bonus (capped)
    const streakXp = Math.min(newStreak * XP_ACTIONS.STREAK_PER_DAY, XP_ACTIONS.STREAK_CAP);
    totalXp += streakXp;

    const newTotalXp = visitorData.totalXp + totalXp;
    const newLevel = getLevelForXp(newTotalXp);
    const newLongestStreak = Math.max(visitorData.longestStreak, newStreak);
    const newBestNutrition = Math.max(visitorData.bestNutritionScore, nutritionResult.score);

    // Update visitor data
    const idealMealItemIds = new Set(mealItemIds);
    const remainingBag = visitorData.brownBag.filter((i: any) => !idealMealItemIds.has(i.itemId));

    await visitor.updateDataObject({
      totalXp: newTotalXp,
      level: newLevel,
      currentStreak: newStreak,
      longestStreak: newLongestStreak,
      lastCompletionDate: today,
      bestNutritionScore: newBestNutrition,
      totalMealsCompleted: (visitorData.totalMealsCompleted || 0) + 1,
      totalSuperCombos: (visitorData.totalSuperCombos || 0) + superCombos.length,
      completedToday: true,
      completionTimestamp: new Date().toISOString(),
      nutritionScore: nutritionResult.score,
      superCombosFound: superComboNames,
      brownBag: [], // Clear bag — remaining items will be auto-dropped
    });

    // Auto-drop remaining non-meal items into world
    if (remainingBag.length > 0) {
      const center = {
        x: (visitor as any).moveTo?.x ?? 0,
        y: (visitor as any).moveTo?.y ?? 0,
      };

      for (const item of remainingBag) {
        try {
          await dropFoodItem({
            credentials,
            position: center,
            itemId: item.itemId,
            rarity: item.rarity,
            offsetRange: 150,
          });
        } catch (err) {
          console.warn("Failed to auto-drop remaining item:", item.itemId, err);
        }
      }
    }

    // Update world stats
    if (world.incrementDataObjectValue) {
      await world.incrementDataObjectValue("totalCompletionsToday", 1);
    }

    // Celebration toast
    world
      .fireToast?.({
        title: "Meal Complete!",
        text: `Score: ${nutritionResult.score}/100 | +${totalXp} XP${superCombos.length > 0 ? ` | ${superCombos.length} combo(s)!` : ""}`,
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
