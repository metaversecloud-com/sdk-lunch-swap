import { Request, Response } from "express";
import {
  errorHandler,
  getCredentials,
  getVisitor,
  grantFoodToVisitor,
  getVisitorBag,
  grantXp,
  resolveFoodAsset,
  updateWorldStats,
  buildBagItemFromDef,
  calculatePickupXp,
} from "@utils/index.js";
import { BAG_CAPACITY, BAG_CAPACITY_POST_COMPLETION, getLevelForXp } from "@shared/data/xpConfig.js";

export const handlePickupItem = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug } = credentials;
    const { droppedAssetId } = req.body;

    if (!droppedAssetId) {
      return res.status(400).json({ success: false, message: "Missing droppedAssetId" });
    }

    // Resolve the food asset (fetch, parse uniqueName, look up definition)
    const resolved = await resolveFoodAsset(droppedAssetId, urlSlug, credentials);
    if (!resolved.success) {
      return res.status(resolved.status).json({ success: false, message: resolved.message });
    }
    const { foodAsset, foodDef, wasMystery } = resolved;

    // Fetch visitor with data and bag
    const { visitor, visitorData, brownBag } = await getVisitor(credentials, true);

    // Check bag capacity (8 pre-completion, 3 post-completion)
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

    // Build bag item and grant to inventory
    const { bagItem: newBagItem, matchesIdealMeal } = buildBagItemFromDef(foodDef, visitorData.idealMeal);
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

    // Calculate and grant XP
    const xpEarned = calculatePickupXp(foodDef.rarity, matchesIdealMeal, xpMultiplier);
    const newTotalXp = await grantXp(visitor, credentials, xpEarned);
    const newLevel = getLevelForXp(newTotalXp);

    // Update world stats
    await updateWorldStats(urlSlug, credentials, { pickups: 1 });

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
      hotStreakActive: updatedData.hotStreakActive,
      idealPickupStreak: updatedData.idealPickupStreak,
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
