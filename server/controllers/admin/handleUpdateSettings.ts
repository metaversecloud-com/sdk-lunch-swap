import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor, World } from "@utils/index.js";
import { WORLD_DATA_DEFAULTS } from "@shared/types/DataObjects.js";
import { VisitorInterface } from "@rtsdk/topia";

export const handleUpdateSettings = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    const visitor: VisitorInterface = await Visitor.get(visitorId, urlSlug, { credentials });
    if (!visitor.isAdmin) {
      return res.status(403).json({ success: false, message: "Admin access required" });
    }

    const { dropRadiusMin, dropRadiusMax, proximityRadius } = req.body;

    // Validate inputs
    const updates: Record<string, number> = {};

    if (dropRadiusMin !== undefined) {
      const val = Number(dropRadiusMin);
      if (isNaN(val) || val < 0 || val > 10000) {
        return res.status(400).json({ success: false, message: "dropRadiusMin must be between 0 and 10000" });
      }
      updates.dropRadiusMin = val;
    }

    if (dropRadiusMax !== undefined) {
      const val = Number(dropRadiusMax);
      if (isNaN(val) || val < 0 || val > 10000) {
        return res.status(400).json({ success: false, message: "dropRadiusMax must be between 0 and 10000" });
      }
      updates.dropRadiusMax = val;
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

    const finalMin = updates.dropRadiusMin ?? worldData.dropRadiusMin;
    const finalMax = updates.dropRadiusMax ?? worldData.dropRadiusMax;

    if (finalMin > finalMax) {
      return res
        .status(400)
        .json({ success: false, message: "dropRadiusMin must be less than or equal to dropRadiusMax" });
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
        dropRadiusMin: updates.dropRadiusMin ?? worldData.dropRadiusMin,
        dropRadiusMax: updates.dropRadiusMax ?? worldData.dropRadiusMax,
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
