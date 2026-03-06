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

export const handleDropAllNonMatches = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, profileId } = credentials;

    const { visitor, visitorData, brownBag } = await getVisitor(credentials, true);

    // Find items that don't match the ideal meal
    const nonMatchItems = brownBag.filter((item) => !item.matchesIdealMeal);

    if (nonMatchItems.length === 0) {
      return res.json({ success: true, brownBag, droppedCount: 0, xpEarned: 0 });
    }

    const visitorPos = {
      x: (visitor as any).moveTo?.x ?? 0,
      y: (visitor as any).moveTo?.y ?? 0,
    };

    // Drop each non-matching item
    for (const item of nonMatchItems) {
      await removeFoodFromVisitor(visitor, credentials, item.itemId);
      await dropFoodItem({
        credentials,
        position: visitorPos,
        itemId: item.itemId,
        rarity: item.rarity,
        offsetRange: 200,
      });
    }

    const droppedCount = nonMatchItems.length;

    // Smoke effect at visitor's avatar
    (visitor as any).triggerParticle?.({ name: "sparkles_float", duration: 2 })?.catch(() => {});

    // Update visitor data
    await visitor.updateDataObject(
      {
        idealPickupStreak: 0,
        dropsToday: visitorData.dropsToday + droppedCount,
        totalDrops: visitorData.totalDrops + droppedCount,
      },
      {
        analytics: [{ analyticName: "drops", profileId, urlSlug, uniqueKey: profileId }],
      },
    );

    // XP for dropping
    const buffMultiplier = visitorData.dailyBuff === "double-xp" ? 2 : 1;
    const xpEarned = XP_ACTIONS.DROP * droppedCount * buffMultiplier;
    const newTotalXp = await grantXp(visitor, credentials, xpEarned);
    const newLevel = getLevelForXp(newTotalXp);

    // Update world stats
    await updateWorldStats(urlSlug, credentials, { drops: droppedCount });

    // Re-fetch updated bag
    const updatedBag = await getVisitorBag(visitor, visitorData.idealMeal, credentials);

    return res.json({
      success: true,
      brownBag: updatedBag,
      droppedCount,
      xpEarned,
      xp: newTotalXp,
      level: newLevel,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleDropAllNonMatches",
      message: "Error dropping non-matching items",
      req,
      res,
    });
  }
};
