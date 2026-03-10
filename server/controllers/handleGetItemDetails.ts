import { Request, Response } from "express";
import { errorHandler, getCredentials, resolveFoodAsset, getVisitor, getFoodItemsById } from "@utils/index.js";
import { BAG_CAPACITY, BAG_CAPACITY_POST_COMPLETION } from "@shared/data/xpConfig.js";

export const handleGetItemDetails = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const droppedAssetId = req.query.droppedAssetId as string;

    if (!droppedAssetId) {
      return res.status(400).json({ success: false, message: "Missing droppedAssetId" });
    }

    // Resolve food asset and fetch visitor in parallel
    const [resolved, { visitorData, brownBag, xp, level, newDay }] = await Promise.all([
      resolveFoodAsset(droppedAssetId, credentials.urlSlug, credentials),
      getVisitor(credentials, true),
    ]);

    if (!resolved.success) {
      return res.status(resolved.status).json({ success: false, message: resolved.message });
    }

    const { foodDef, isMystery } = resolved;

    // Check ideal meal match
    const idealMeal = visitorData.idealMeal || [];
    const matchesIdealMeal = idealMeal.some((item) => item.itemId === foodDef.itemId);

    // Enrich ideal meal items with images (for meals stored before image field existed)
    if (idealMeal?.length && !idealMeal[0].image) {
      const foodItemsById = await getFoodItemsById(credentials);
      for (const item of idealMeal) {
        const def = foodItemsById.get(item.itemId);
        if (def?.image) item.image = def.image;
      }
    }

    // Check bag capacity
    const bigBagBonus = visitorData.dailyBuff === "big-bag" ? 2 : 0;
    const maxCapacity = (visitorData.completedToday ? BAG_CAPACITY_POST_COMPLETION : BAG_CAPACITY) + bigBagBonus;
    const bagFull = brownBag.length >= maxCapacity;

    return res.json({
      success: true,
      foodDef,
      isMystery,
      matchesIdealMeal,
      bagFull,
      brownBag,
      idealMeal,
      xp,
      level,
      newDay: newDay || !visitorData.dayStartTimestamp,
      completedToday: visitorData.completedToday,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleGetItemDetails",
      message: "Error getting item details",
      req,
      res,
    });
  }
};
