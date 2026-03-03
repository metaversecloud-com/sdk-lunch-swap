import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, World } from "@utils/index.js";

export const handleAdminRemoveAllItems = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    // Admin check
    const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    if (!(visitor as any).isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    // Fetch all lunch-swap food items
    const world = World.create(urlSlug, { credentials });
    const foodAssets = await world.fetchDroppedAssetsWithUniqueName({
      uniqueName: "lunch-swap-food",
      isPartial: true,
    });

    // Delete all
    const removedCount = foodAssets.length;
    if (foodAssets.length > 0) {
      const assetIds = foodAssets.map((a) => a.id).filter(Boolean) as string[];
      await World.deleteDroppedAssets(urlSlug, assetIds, process.env.INTERACTIVE_SECRET!, credentials);
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
