import { Request, Response } from "express";
import { errorHandler, getCredentials, getVisitor, grantRewardToken } from "@utils/index.js";
import { spinWheel } from "@shared/data/wheelBuffs.js";

export const handleSpinWheel = async (req: Request, res: Response) => {
  try {
    const credentials = getCredentials(req.query);

    // Fetch visitor data (includes hasRewardToken from inventory)
    const { visitor, visitorData, hasRewardToken } = await getVisitor(credentials, true);

    // Check if already spun today
    if (visitorData.dailyBuff) {
      return res.status(400).json({ success: false, message: "Already spun today" });
    }

    // Check for Reward Token in inventory
    if (!hasRewardToken) {
      return res.status(400).json({ success: false, message: "No Reward Tokens available" });
    }

    // Spin the wheel
    const buff = spinWheel();

    // Consume 1 Reward Token from inventory
    await grantRewardToken(visitor, credentials, -1);

    // Update visitor data with buff
    await visitor.updateDataObject(
      {
        dailyBuff: buff.id,
      },
      {},
    );

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
