import { Request, Response } from "express";
import {
  errorHandler,
  getCredentials,
  dropFoodItem,
  getVisitor,
  removeFoodFromVisitor,
  getVisitorBag,
  grantXp,
  updateWorldStats,
} from "@utils/index.js";
import { XP_ACTIONS, getLevelForXp } from "@shared/data/xpConfig.js";

export const handleDropItem = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, profileId } = credentials;
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({ success: false, message: "Missing itemId" });
    }

    // Fetch visitor with data and bag
    const { visitor, visitorData, brownBag } = await getVisitor(credentials, true);

    // Find item in bag
    const droppedItem = brownBag.find((i) => i.itemId === itemId);
    if (!droppedItem) {
      return res.status(400).json({ success: false, message: "Item not found in bag" });
    }

    // Remove from inventory
    await removeFoodFromVisitor(visitor, credentials, itemId);

    // Drop item into world near visitor position
    const droppedAsset = await dropFoodItem({
      credentials,
      position: {
        x: visitor.moveTo?.x ?? 0,
        y: visitor.moveTo?.y ?? 0,
      },
      itemId: droppedItem.itemId,
      rarity: droppedItem.rarity,
      shouldTriggerParticle: true,
      host: req.hostname,
    });

    // Update visitor data (reset idealPickupStreak on drop)
    await visitor.updateDataObject(
      {
        idealPickupStreak: 0,
        dropsToday: visitorData.dropsToday + 1,
        totalDrops: visitorData.totalDrops + 1,
      },
      {
        analytics: [{ analyticName: "drops", profileId, urlSlug, uniqueKey: profileId }],
      },
    );

    // XP for dropping (double-xp buff doubles all XP)
    const buffMultiplier = visitorData.dailyBuff === "double-xp" ? 2 : 1;
    const xpEarned = XP_ACTIONS.DROP * buffMultiplier;

    // Grant XP to visitor inventory
    const newTotalXp = await grantXp(visitor, credentials, xpEarned);
    const newLevel = getLevelForXp(newTotalXp);

    // Update world stats
    await updateWorldStats(urlSlug, credentials, { drops: 1 });

    // Read updated bag from inventory
    const updatedBag = await getVisitorBag(visitor, visitorData.idealMeal, credentials);

    return res.json({
      success: true,
      brownBag: updatedBag,
      droppedItem,
      droppedAssetId: droppedAsset?.id || null,
      xpEarned,
      xp: newTotalXp,
      level: newLevel,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleDropItem",
      message: "Error dropping item",
      req,
      res,
    });
  }
};
