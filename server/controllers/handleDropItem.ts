import { Request, Response } from "express";
import {
  errorHandler,
  getCredentials,
  dropFoodItem,
  World,
  getVisitor,
  removeFoodFromVisitor,
  getVisitorBag,
  grantXp,
} from "../utils/index.js";
import { WORLD_DATA_DEFAULTS } from "@shared/types/DataObjects.js";
import { XP_ACTIONS, getLevelForXp } from "@shared/data/xpConfig.js";

export const handleDropItem = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug } = credentials;
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
        x: (visitor as any).moveTo?.x ?? 0,
        y: (visitor as any).moveTo?.y ?? 0,
      },
      itemId: droppedItem.itemId,
      rarity: droppedItem.rarity,
    });

    // Update visitor data (reset idealPickupStreak on drop)
    await visitor.updateDataObject(
      {
        idealPickupStreak: 0,
        dropsToday: visitorData.dropsToday + 1,
        totalDrops: visitorData.totalDrops + 1,
      },
      {},
    );

    // XP for dropping
    const xpEarned = XP_ACTIONS.DROP;

    // Grant XP to visitor inventory
    const newTotalXp = await grantXp(visitor, credentials, xpEarned);
    const newLevel = getLevelForXp(newTotalXp);

    // Update world data object with drop stats
    const world = await World.create(urlSlug, { credentials });
    await world.fetchDataObject();
    const worldData = { ...WORLD_DATA_DEFAULTS, ...world.dataObject };
    await world.updateDataObject({
      totalDrops: worldData.totalDrops + 1,
    });

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
