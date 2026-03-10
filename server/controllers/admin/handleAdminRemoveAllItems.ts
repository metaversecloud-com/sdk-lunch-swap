import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, World } from "@utils/index.js";
import { VisitorInterface } from "@rtsdk/topia";

export const handleAdminRemoveAllItems = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    // Admin check
    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });
    if (!visitor.isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    // Fetch all lunch-swap food items
    const world = World.create(urlSlug, { credentials });
    const foodAssets = await world.fetchDroppedAssetsWithUniqueName({
      uniqueName: "LunchSwap_foodItem",
      isPartial: true,
    });

    // Delete in batches of 30
    const removedCount = foodAssets.length;
    if (foodAssets.length > 0) {
      const assetIds = foodAssets.map((a) => a.id).filter(Boolean) as string[];
      const BATCH_SIZE = 30;
      for (let i = 0; i < assetIds.length; i += BATCH_SIZE) {
        const batch = assetIds.slice(i, i + BATCH_SIZE);
        await World.deleteDroppedAssets(urlSlug, batch, process.env.INTERACTIVE_SECRET!, credentials);
      }
    }

    return res.json({
      success: true,
      removedCount,
      totalFound: foodAssets.length,
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleAdminRemoveAllItems",
      message: "Error removing all items",
      req,
      res,
    });
  }
};
