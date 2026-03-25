import { Request, Response } from "express";
import { errorHandler, getCredentials, resolveFoodAsset, getVisitor, getFoodItemsById, World } from "@utils/index.js";
import { BAG_CAPACITY, BAG_CAPACITY_POST_COMPLETION } from "@shared/data/xpConfig.js";
import { DroppedAssetInterface } from "@rtsdk/topia";

export const handleGetItemDetails = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug } = credentials;

    const droppedAssetId = req.query.droppedAssetId as string;

    if (!droppedAssetId) {
      return res.status(400).json({ success: false, message: "Missing droppedAssetId" });
    }

    // Resolve food asset and fetch visitor in parallel
    const [resolved, { visitorData, brownBag, xp, level, newDay }] = await Promise.all([
      resolveFoodAsset(droppedAssetId, urlSlug, credentials),
      getVisitor(credentials, true),
    ]);

    if (!resolved.success) {
      return res.status(resolved.status).json({ success: false, message: resolved.message });
    }

    const { foodDef, isMystery } = resolved;

    // Check target meal match
    const targetMeal = visitorData.targetMeal || [];
    const matchesTargetMeal = targetMeal.some((item) => item.itemId === foodDef.itemId);

    // Enrich target meal items with images (for meals stored before image field existed)
    if (targetMeal?.length && !targetMeal[0].image) {
      const foodItemsById = await getFoodItemsById(credentials);
      for (const item of targetMeal) {
        const def = foodItemsById.get(item.itemId);
        if (def?.image) item.image = def.image;
      }
    }

    // Check bag capacity
    const bigBagBonus = visitorData.dailyBuff === "big-bag" ? 2 : 0;
    const maxCapacity = (visitorData.completedToday ? BAG_CAPACITY_POST_COMPLETION : BAG_CAPACITY) + bigBagBonus;
    const bagFull = brownBag.length >= maxCapacity;

    const world = World.create(urlSlug, { credentials });

    const keyAssets: DroppedAssetInterface[] = await world.fetchDroppedAssetsWithUniqueName({
      uniqueName: "LunchSwap_keyAsset",
      isPartial: false,
    });

    return res.json({
      success: true,
      foodDef,
      isMystery,
      matchesTargetMeal,
      bagFull,
      brownBag,
      targetMeal,
      xp,
      level,
      newDay,
      completedToday: visitorData.completedToday,
      keyAssetId: keyAssets[0]?.id,
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
