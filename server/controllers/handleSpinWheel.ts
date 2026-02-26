import { Request, Response } from "express";
import { errorHandler, getCredentials, Visitor } from "../utils/index.js";
import { VISITOR_DATA_DEFAULTS } from "@shared/types/DataObjects.js";
import { spinWheel } from "@shared/data/wheelBuffs.js";

export const handleSpinWheel = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);
    const { urlSlug, visitorId } = credentials;

    // Fetch visitor data
    const visitor = await Visitor.get(visitorId, urlSlug, { credentials });
    await visitor.fetchDataObject();
    const visitorData = { ...VISITOR_DATA_DEFAULTS, ...visitor.dataObject };

    // Check if already spun today
    if (visitorData.dailyBuff) {
      return res.status(400).json({ success: false, message: "Already spun today" });
    }

    // Check for Reward Token in inventory
    // NOTE: In production, this would check the visitor's ecosystem inventory
    // for the Reward Token item. For now, we check a flag since the ecosystem
    // inventory API requires configuration.
    const hasRewardToken = (visitorData as any).hasRewardToken || false;
    if (!hasRewardToken) {
      return res.status(400).json({ success: false, message: "No Reward Tokens available" });
    }

    // Spin the wheel
    const buff = spinWheel();

    // Update visitor data with buff and consume token
    await visitor.updateDataObject({
      dailyBuff: buff.id,
      hasRewardToken: false, // Consume the token
    });

    return res.json({
      success: true,
      buff: {
        id: buff.id,
        name: buff.name,
        description: buff.description,
      },
    });
  } catch (error) {
    return errorHandler({
      error,
      functionName: "handleSpinWheel",
      message: "Error spinning wheel",
      req,
      res,
    });
  }
};
