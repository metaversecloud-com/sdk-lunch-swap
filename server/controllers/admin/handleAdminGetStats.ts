import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, World } from "@utils/index.js";
import { WORLD_DATA_DEFAULTS } from "@shared/types/DataObjects.js";

export const handleAdminGetStats = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    if (!(visitor as any).isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    // Fetch world data
    const world = World.create(urlSlug, { credentials });
    await world.fetchDataObject();
    const worldData = { ...WORLD_DATA_DEFAULTS, ...world.dataObject };

    // Count food items currently in world
    const foodAssets = await world.fetchDroppedAssetsWithUniqueName({
      uniqueName: "lunch-swap-food",
      isPartial: true,
    });

    return res.json({
      success: true,
      stats: {
        itemsInWorld: foodAssets.length,
        totalStartsToday: worldData.totalStartsToday,
        totalCompletionsToday: worldData.totalCompletionsToday,
        totalPickups: worldData.totalPickups,
        totalDrops: worldData.totalDrops,
        totalMealSubmissions: worldData.totalMealSubmissions,
        currentDate: worldData.currentDate,
        gameVersion: worldData.gameVersion,
      },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleAdminGetStats",
      message: "Error getting stats",
      req,
      res,
    });
  }
};
