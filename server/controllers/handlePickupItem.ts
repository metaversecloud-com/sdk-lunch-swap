import { Request, Response } from "express";
import {
  errorHandler,
  getCredentials,
  World,
  DroppedAsset,
  getVisitor,
  grantFoodToVisitor,
  getVisitorBag,
  grantXp,
} from "../utils/index.js";
import { WORLD_DATA_DEFAULTS } from "@shared/types/DataObjects.js";
import { getFoodItemsById } from "../utils/foodItemLookup.js";
import { BAG_CAPACITY, BAG_CAPACITY_POST_COMPLETION, XP_ACTIONS, getLevelForXp } from "@shared/data/xpConfig.js";
import { RARITY_CONFIG, Rarity, BagItem } from "@shared/types/FoodItem.js";

export const handlePickupItem = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug } = credentials;
    const { droppedAssetId } = req.body;

    if (!droppedAssetId) {
      return res.status(400).json({ success: false, message: "Missing droppedAssetId" });
    }

    // Fetch the food asset
    const foodAsset = await DroppedAsset.get(droppedAssetId, urlSlug, { credentials });
    if (!foodAsset) {
      return res.status(409).json({ success: false, message: "This item was already picked up" });
    }

    // Fetch data object for additional metadata
    try {
      await foodAsset.fetchDataObject();
    } catch {
      return res.status(409).json({ success: false, message: "This item was already picked up" });
    }

    // Parse uniqueName for item metadata (pattern: lunch-swap-food|{itemId}|{rarity}|{timestamp}|{mystery})
    const parts = ((foodAsset as any).uniqueName || "").split("|");
    let itemId = "";
    let rarity: Rarity = "common";
    const dataObj = foodAsset.dataObject as Record<string, any> | null | undefined;
    if (parts.length >= 3) {
      itemId = parts[1];
      rarity = parts[2] as Rarity;
    } else if (dataObj?.itemId) {
      itemId = dataObj.itemId;
      rarity = dataObj.rarity || "common";
    }

    // Parse mystery flag from 5th segment (backward-compatible: default to "0")
    const mysteryFlag = parts.length >= 5 ? parts[4] : "0";
    const wasMystery = mysteryFlag === "1";

    const foodItemsById = await getFoodItemsById(credentials);
    const foodDef = foodItemsById.get(itemId);
    if (!foodDef) {
      return res.status(400).json({ success: false, message: "Unknown food item" });
    }

    // Fetch visitor with data and bag
    const { visitor, visitorData, brownBag } = await getVisitor(credentials, true);

    // Check bag capacity (B13: dynamic message, D1: 8 pre-completion, 3 post-completion)
    const maxCapacity = visitorData.completedToday ? BAG_CAPACITY_POST_COMPLETION : BAG_CAPACITY;
    if (brownBag.length >= maxCapacity) {
      return res.status(400).json({
        success: false,
        message: `Bag is full (${brownBag.length}/${maxCapacity})`,
      });
    }

    // Delete the dropped asset from world (race condition guard)
    try {
      await foodAsset.deleteDroppedAsset();
    } catch {
      return res.status(409).json({ success: false, message: "This item was already picked up" });
    }

    // Check if item matches ideal meal
    const idealItemIds = new Set(visitorData.idealMeal?.map((i: any) => i.itemId) || []);
    const matchesIdealMeal = idealItemIds.has(itemId);

    // Build bag item and grant to inventory
    const newBagItem: BagItem = {
      itemId: foodDef.itemId,
      name: foodDef.name,
      foodGroup: foodDef.foodGroup,
      rarity: foodDef.rarity,
      matchesIdealMeal,
      nutrition: foodDef.nutrition,
      funFact: foodDef.funFact,
    };

    await grantFoodToVisitor(visitor, credentials, newBagItem);

    // Hot streak logic
    let xpMultiplier = 1;
    const currentIdealStreak = visitorData.idealPickupStreak || 0;
    const wasHotStreak = visitorData.hotStreakActive || false;
    const hotStreakActivated = matchesIdealMeal && currentIdealStreak + 1 >= 3;

    const updatedData = {
      pickupsToday: (visitorData.pickupsToday || 0) + 1,
      totalPickups: (visitorData.totalPickups || 0) + 1,
      idealPickupStreak: matchesIdealMeal ? currentIdealStreak + 1 : 0,
      hotStreakActive: wasHotStreak ? false : hotStreakActivated,
    };

    if (wasHotStreak) {
      xpMultiplier = 3;
    } else if (hotStreakActivated) {
      visitor
        .fireToast({
          title: "HOT STREAK!",
          text: "Your next pickup gets 3x XP!",
        })
        .catch(() => {});
    }

    await visitor.updateDataObject(updatedData, {});

    // Calculate XP earned (with hot streak multiplier)
    const rarityConfig = RARITY_CONFIG[foodDef.rarity] || RARITY_CONFIG.common;
    let xpEarned = Math.round(XP_ACTIONS.PICKUP * rarityConfig.xpMultiplier);
    if (matchesIdealMeal) {
      xpEarned += XP_ACTIONS.COLLECT_IDEAL_ITEM;
    }
    xpEarned = Math.round(xpEarned * xpMultiplier);

    // Grant XP to visitor inventory
    const newTotalXp = await grantXp(visitor, credentials, xpEarned);
    const newLevel = getLevelForXp(newTotalXp);

    // Update world data object with pickup stats
    const world = await World.create(urlSlug, { credentials });
    await world.fetchDataObject();
    const worldData = { ...WORLD_DATA_DEFAULTS, ...world.dataObject };
    await world.updateDataObject({
      totalPickups: worldData.totalPickups + 1,
    });

    // Fire toast with fun fact
    visitor
      .fireToast({
        title: matchesIdealMeal ? "Great find!" : `Picked up ${foodDef.name}!`,
        text: foodDef.funFact,
      })
      .catch(() => {});

    // Read updated bag from inventory
    const updatedBag = await getVisitorBag(visitor, visitorData.idealMeal, credentials);

    return res.json({
      success: true,
      brownBag: updatedBag,
      pickedUpItem: newBagItem,
      matchesIdealMeal,
      xpEarned,
      xp: newTotalXp,
      level: newLevel,
      funFact: foodDef.funFact,
      wasMystery,
      hotStreakActive: wasHotStreak ? false : matchesIdealMeal && currentIdealStreak + 1 >= 3,
      idealPickupStreak: wasHotStreak ? 0 : matchesIdealMeal ? currentIdealStreak + 1 : 0,
      xpMultiplier,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handlePickupItem",
      message: "Error picking up item",
      req,
      res,
    });
  }
};
