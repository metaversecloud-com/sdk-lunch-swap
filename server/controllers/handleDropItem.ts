import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, dropFoodItem, World } from "../utils/index.js";
import { VISITOR_DATA_DEFAULTS, WORLD_DATA_DEFAULTS } from "@shared/types/DataObjects.js";
import { XP_ACTIONS } from "@shared/data/xpConfig.js";

export const handleDropItem = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;
    const { itemId } = req.body;

    if (!itemId) {
      return res.status(400).json({ success: false, message: "Missing itemId" });
    }

    // Fetch visitor data
    const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    await visitor.fetchDataObject();
    const visitorData = { ...VISITOR_DATA_DEFAULTS, ...visitor.dataObject };

    // Find item in bag
    const bagIndex = visitorData.brownBag.findIndex((i: any) => i.itemId === itemId);
    if (bagIndex === -1) {
      return res.status(400).json({ success: false, message: "Item not found in bag" });
    }

    const droppedItem = visitorData.brownBag[bagIndex];

    // Remove from bag
    const updatedBag = [...visitorData.brownBag];
    updatedBag.splice(bagIndex, 1);

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
    await visitor.updateDataObject({
      brownBag: updatedBag,
      idealPickupStreak: 0,
      dropsToday: visitorData.dropsToday + 1,
      totalDrops: visitorData.totalDrops + 1,
    });

    // XP for dropping
    const xpEarned = XP_ACTIONS.DROP;

    // Update world data object with drop stats
    const world = await World.create(urlSlug, { credentials });
    await world.fetchDataObject();
    const worldData = { ...WORLD_DATA_DEFAULTS, ...world.dataObject };
    await world.updateDataObject({
      totalDrops: worldData.totalDrops + 1,
    });

    return res.json({
      success: true,
      brownBag: updatedBag,
      droppedItem,
      droppedAssetId: droppedAsset?.id || null,
      xpEarned,
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
