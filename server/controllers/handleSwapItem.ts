import { Request, Response } from "express";
import { errorHandler, getCredentials, World, User, DroppedAsset, dropFoodItem, getVisitor, grantFoodToVisitor, removeFoodFromVisitor, getVisitorBag } from "../utils/index.js";
import { FOOD_ITEMS_BY_ID } from "@shared/data/foodItems.js";
import { XP_ACTIONS } from "@shared/data/xpConfig.js";
import { RARITY_CONFIG, Rarity, BagItem } from "@shared/types/FoodItem.js";

export const handleSwapItem = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, profileId } = credentials;
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

    // Parse mystery flag from 5th segment (backward-compatible: default to "0")
    const mysteryFlag = parts.length >= 5 ? parts[4] : "0";
    const wasMystery = mysteryFlag === "1";

    const pickupFoodDef = FOOD_ITEMS_BY_ID.get(pickupItemId);
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
    };

    await grantFoodToVisitor(visitor, credentials, newBagItem);

    // Update ideal meal collected status
    const updatedIdealMeal = visitorData.idealMeal.map((item: any) => ({
      ...item,
      collected: item.collected || item.itemId === pickupItemId,
    }));

    // Update visitor data
    await visitor.updateDataObject({
      idealMeal: updatedIdealMeal,
    });

    // B12: Atomic counter increments
    if (visitor.incrementDataObjectValue) {
      await visitor.incrementDataObjectValue("pickupsToday", 1);
      await visitor.incrementDataObjectValue("dropsToday", 1);
    }

    // Update user data (atomic increments)
    const user = User.create({ credentials, profileId });
    if (user.incrementDataObjectValue) {
      await user.incrementDataObjectValue("totalPickups", 1);
      await user.incrementDataObjectValue("totalDrops", 1);
    }

    // Calculate XP earned (DROP + PICKUP with rarity multiplier + optional ideal meal bonus)
    const rarityConfig = RARITY_CONFIG[pickupFoodDef.rarity] || RARITY_CONFIG.common;
    let xpEarned = XP_ACTIONS.DROP + Math.round(XP_ACTIONS.PICKUP * rarityConfig.xpMultiplier);
    if (matchesIdealMeal) {
      xpEarned += XP_ACTIONS.COLLECT_IDEAL_ITEM;
    }

    // Fire toast
    const world = World.create(urlSlug, { credentials });
    world
      .fireToast?.({
        title: "Swapped!",
        text: `Dropped ${droppedItem.name}, picked up ${pickupFoodDef.name}!`,
      })
      .catch(() => {});

    // Read updated bag from inventory
    const updatedBag = await getVisitorBag(visitor, updatedIdealMeal);

    return res.json({
      success: true,
      brownBag: updatedBag,
      idealMeal: updatedIdealMeal,
      droppedItem,
      pickedUpItem: newBagItem,
      matchesIdealMeal,
      xpEarned,
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
