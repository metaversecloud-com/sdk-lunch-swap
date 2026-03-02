import { Request, Response } from "express";
import {
  errorHandler,
  getCredentials,
  DroppedAsset,
  dropFoodItem,
  getVisitor,
  grantFoodToVisitor,
  removeFoodFromVisitor,
  getVisitorBag,
  grantXp,
} from "../utils/index.js";
import { getFoodItemsById } from "../utils/foodItemLookup.js";
import { XP_ACTIONS, getLevelForXp } from "@shared/data/xpConfig.js";
import { RARITY_CONFIG, Rarity, BagItem } from "@shared/types/FoodItem.js";

export const handleSwapItem = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug } = credentials;
    const { dropItemId, pickupDroppedAssetId } = req.body;

    if (!dropItemId || !pickupDroppedAssetId) {
      return res.status(400).json({ success: false, message: "Missing dropItemId or pickupDroppedAssetId" });
    }

    // Fetch the pickup target first (fail fast if gone)
    const foodAsset = await DroppedAsset.get(pickupDroppedAssetId, urlSlug, { credentials });
    if (!foodAsset) {
      return res.status(409).json({ success: false, message: "This item was already picked up" });
    }

    try {
      await foodAsset.fetchDataObject();
    } catch {
      return res.status(409).json({ success: false, message: "This item was already picked up" });
    }

    // Parse uniqueName for item metadata (pattern: lunch-swap-food|{itemId}|{rarity}|{timestamp}|{mystery})
    const parts = ((foodAsset as any).uniqueName || "").split("|");
    let pickupItemId = "";
    let pickupRarity: Rarity = "common";
    const dataObj = foodAsset.dataObject as Record<string, any> | null | undefined;
    if (parts.length >= 3) {
      pickupItemId = parts[1];
      pickupRarity = parts[2] as Rarity;
    } else if (dataObj?.itemId) {
      pickupItemId = dataObj.itemId;
      pickupRarity = dataObj.rarity || "common";
    }

    const foodItemsById = await getFoodItemsById(credentials);
    const pickupFoodDef = foodItemsById.get(pickupItemId);
    if (!pickupFoodDef) {
      return res.status(400).json({ success: false, message: "Unknown food item" });
    }

    // Fetch visitor with data and bag
    const { visitor, visitorData, brownBag } = await getVisitor(credentials, true);

    // Find drop item in bag
    const droppedItem = brownBag.find((i) => i.itemId === dropItemId);
    if (!droppedItem) {
      return res.status(400).json({ success: false, message: "Item not found in bag" });
    }

    // Delete the pickup target from world (race condition guard)
    try {
      await foodAsset.deleteDroppedAsset();
    } catch {
      return res.status(409).json({ success: false, message: "This item was already picked up" });
    }

    // Remove the dropped item from inventory and drop into world
    await removeFoodFromVisitor(visitor, credentials, droppedItem.itemId);
    await dropFoodItem({
      credentials,
      position: {
        x: (visitor as any).moveTo?.x ?? 0,
        y: (visitor as any).moveTo?.y ?? 0,
      },
      itemId: droppedItem.itemId,
      rarity: droppedItem.rarity,
    });

    // Grant picked up item to inventory
    const idealItemIds = new Set(visitorData.idealMeal?.map((i: any) => i.itemId) || []);
    const matchesIdealMeal = idealItemIds.has(pickupItemId);

    const newBagItem: BagItem = {
      itemId: pickupFoodDef.itemId,
      name: pickupFoodDef.name,
      foodGroup: pickupFoodDef.foodGroup,
      rarity: pickupFoodDef.rarity,
      matchesIdealMeal,
      nutrition: pickupFoodDef.nutrition,
      funFact: pickupFoodDef.funFact,
    };

    await grantFoodToVisitor(visitor, credentials, newBagItem);

    await visitor.updateDataObject(
      {
        pickupsToday: (visitorData.pickupsToday || 0) + 1,
        dropsToday: (visitorData.dropsToday || 0) + 1,
        totalPickups: (visitorData.totalPickups || 0) + 1,
        totalDrops: (visitorData.totalDrops || 0) + 1,
      },
      {},
    );

    // Calculate XP earned (DROP + PICKUP with rarity multiplier + optional ideal meal bonus)
    const rarityConfig = RARITY_CONFIG[pickupFoodDef.rarity] || RARITY_CONFIG.common;
    let xpEarned = XP_ACTIONS.DROP + Math.round(XP_ACTIONS.PICKUP * rarityConfig.xpMultiplier);
    if (matchesIdealMeal) {
      xpEarned += XP_ACTIONS.COLLECT_IDEAL_ITEM;
    }

    // Grant XP to visitor inventory
    const newTotalXp = await grantXp(visitor, credentials, xpEarned);
    const newLevel = getLevelForXp(newTotalXp);

    // Fire toast
    visitor
      .fireToast({
        title: "Swapped!",
        text: `Dropped ${droppedItem.name}, picked up ${pickupFoodDef.name}!`,
      })
      .catch(() => {});

    // Read updated bag from inventory
    const updatedBag = await getVisitorBag(visitor, visitorData.idealMeal, credentials);

    return res.json({
      success: true,
      brownBag: updatedBag,
      droppedItem,
      pickedUpItem: newBagItem,
      matchesIdealMeal,
      xpEarned,
      xp: newTotalXp,
      level: newLevel,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleSwapItem",
      message: "Error swapping item",
      req,
      res,
    });
  }
};
