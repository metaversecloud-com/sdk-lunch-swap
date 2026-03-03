import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, World } from "@utils/index.js";
import { WORLD_DATA_DEFAULTS } from "@shared/types/DataObjects.js";

export const handleUpdateSettings = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    if (!(visitor as any).isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { spawnRadiusMin, spawnRadiusMax, proximityRadius } = req.body;

    // Validate inputs
    const updates: Record<string, number> = {};

    if (spawnRadiusMin !== undefined) {
      const val = Number(spawnRadiusMin);
      if (isNaN(val) || val < 0 || val > 10000) {
        return res.status(400).json({ success: false, message: "spawnRadiusMin must be between 0 and 10000" });
      }
      updates.spawnRadiusMin = val;
    }

    if (spawnRadiusMax !== undefined) {
      const val = Number(spawnRadiusMax);
      if (isNaN(val) || val < 0 || val > 10000) {
        return res.status(400).json({ success: false, message: "spawnRadiusMax must be between 0 and 10000" });
      }
      updates.spawnRadiusMax = val;
    }

    if (proximityRadius !== undefined) {
      const val = Number(proximityRadius);
      if (isNaN(val) || val < 0 || val > 10000) {
        return res.status(400).json({ success: false, message: "proximityRadius must be between 0 and 10000" });
      }
      updates.proximityRadius = val;
    }

    // Validate min <= max if both are being set or one is changing
    const world = World.create(urlSlug, { credentials });
    await world.fetchDataObject();
    const worldData = { ...WORLD_DATA_DEFAULTS, ...world.dataObject };

    const finalMin = updates.spawnRadiusMin ?? worldData.spawnRadiusMin;
    const finalMax = updates.spawnRadiusMax ?? worldData.spawnRadiusMax;

    if (finalMin > finalMax) {
      return res
        .status(400)
        .json({ success: false, message: "spawnRadiusMin must be less than or equal to spawnRadiusMax" });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: "No valid settings provided" });
    }

    await world.updateDataObject(updates, {
      analytics: [{ analyticName: "settingsUpdates", urlSlug }],
    });

    return res.json({
      success: true,
      settings: {
        spawnRadiusMin: updates.spawnRadiusMin ?? worldData.spawnRadiusMin,
        spawnRadiusMax: updates.spawnRadiusMax ?? worldData.spawnRadiusMax,
        proximityRadius: updates.proximityRadius ?? worldData.proximityRadius,
      },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleUpdateSettings",
      message: "Error updating settings",
      req,
      res,
    });
  }
};
